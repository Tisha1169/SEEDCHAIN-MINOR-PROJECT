import type { Response } from "express";
import { pool, type DbOrTx, type PoolClient } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

/**
 * Real-time change notifications.
 *
 *   transaction commits → pg_notify('seedchain_changes', json)
 *   every API instance LISTENs → fans out to its Server-Sent-Event clients
 *   browser EventSource → invalidates the matching React Query caches
 *
 * NOTIFY is transactional, so a rolled-back change never produces a
 * notification. Payloads carry only ids/types (no business data); clients
 * refetch through the normal authorised API.
 */

export const CHANNEL = "seedchain_changes";

export interface ChangeNotice {
  /** lots | orders | alerts | scans | users | external | events */
  topic: string;
  entityId?: string;
  lotId?: string;
  farmerId?: string;
  customerId?: string;
  /** If true, only admins receive it. */
  adminOnly?: boolean;
}

export async function notifyChange(tx: DbOrTx, notice: ChangeNotice): Promise<void> {
  await tx.execute(sql`SELECT pg_notify(${CHANNEL}, ${JSON.stringify(notice)})`);
}

interface Client {
  res: Response;
  userId: string | null;
  role: "admin" | "farmer" | "customer" | null;
  /** Public trace pages subscribe to a single lot. */
  lotId?: string;
}

const clients = new Set<Client>();
let listener: PoolClient | null = null;
let heartbeat: NodeJS.Timeout | null = null;

function visibleTo(c: Client, n: ChangeNotice): boolean {
  if (c.lotId) return n.lotId === c.lotId && !n.adminOnly;
  if (c.role === "admin") return true;
  if (n.adminOnly) return false;
  if (c.role === "farmer") return n.farmerId === c.userId || n.topic === "external";
  if (c.role === "customer") return n.customerId === c.userId || n.topic === "listings";
  return false;
}

function dispatch(n: ChangeNotice): void {
  for (const c of clients) {
    if (!visibleTo(c, n)) continue;
    // Only the topic and ids are forwarded; never business data.
    c.res.write(`event: change\ndata: ${JSON.stringify({ topic: n.topic, entityId: n.entityId, lotId: n.lotId })}\n\n`);
  }
}

export async function startRealtime(): Promise<void> {
  if (listener) return;
  try {
    listener = await pool.connect();
    listener.on("notification", (msg) => {
      if (msg.channel !== CHANNEL || !msg.payload) return;
      try {
        dispatch(JSON.parse(msg.payload));
      } catch (err) {
        logger.warn({ err }, "Bad realtime payload");
      }
    });
    listener.on("error", (err) => {
      logger.error({ err }, "Realtime listener error; reconnecting");
      listener?.release(true);
      listener = null;
      setTimeout(() => void startRealtime(), 5000);
    });
    await listener.query(`LISTEN ${CHANNEL}`);
    heartbeat ??= setInterval(() => {
      for (const c of clients) c.res.write(`: ping\n\n`);
    }, 25_000);
    logger.info("Realtime LISTEN started");
  } catch (err) {
    logger.error({ err }, "Could not start realtime listener; clients fall back to polling");
    listener = null;
    setTimeout(() => void startRealtime(), 10_000);
  }
}

export async function stopRealtime(): Promise<void> {
  if (heartbeat) clearInterval(heartbeat);
  heartbeat = null;
  for (const c of clients) c.res.end();
  clients.clear();
  if (listener) {
    try {
      await listener.query(`UNLISTEN ${CHANNEL}`);
    } catch {
      /* ignore */
    }
    listener.release();
    listener = null;
  }
}

export function isRealtimeHealthy(): boolean {
  return listener !== null;
}

export function attachSseClient(res: Response, client: Omit<Client, "res">): void {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  res.write(`retry: 5000\nevent: ready\ndata: {}\n\n`);
  const c: Client = { res, ...client };
  clients.add(c);
  res.on("close", () => clients.delete(c));
}
