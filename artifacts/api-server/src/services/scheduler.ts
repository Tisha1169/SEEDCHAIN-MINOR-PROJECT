import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, externalIngestionRunsTable, lotsTable, ordersTable, pool } from "@workspace/db";
import { config } from "../config";
import { logger } from "../lib/logger";
import { runSource, type SourceKey } from "./external/ingestion";
import { computeRisk, syncRiskAlert } from "./lots";
import { raiseAlert, resolveAlertsByKey } from "./records";
import { expireUnpaidOrders } from "./payments";

/**
 * In-process periodic jobs. A Postgres advisory lock per job makes sure only
 * one API instance runs a given job at a time when horizontally scaled.
 */

async function withJobLock(id: number, fn: () => Promise<void>): Promise<void> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT pg_try_advisory_lock($1) AS ok", [id]);
    if (!rows[0].ok) return;
    try {
      await fn();
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [id]);
    }
  } finally {
    client.release();
  }
}

/** Reserved/sold counters must equal the sum of open/confirmed order lines. */
export async function checkInventoryIntegrity(): Promise<number> {
  const rows = await db.execute(sql`
    SELECT l.id, l.lot_code, l.farmer_id, l.reserved_qty, l.sold_qty,
      COALESCE(SUM(oi.quantity) FILTER (WHERE o.status IN ('PENDING','ACCEPTED','PREPARING','READY','DISPATCHED','DELIVERED')), 0) AS open_qty,
      COALESCE(SUM(oi.quantity) FILTER (WHERE o.status = 'CUSTOMER_CONFIRMED'), 0) AS sold_lines
    FROM lots l
    LEFT JOIN order_items oi ON oi.lot_id = l.id
    LEFT JOIN orders o ON o.id = oi.order_id
    GROUP BY l.id`);
  let mismatches = 0;
  for (const r of rows.rows as Array<Record<string, string>>) {
    const key = `INVENTORY_MISMATCH:${r.id}`;
    const reservedOk = Math.abs(Number(r.reserved_qty) - Number(r.open_qty)) < 0.001;
    const soldOk = Math.abs(Number(r.sold_qty) - Number(r.sold_lines)) < 0.001;
    if (reservedOk && soldOk) {
      await resolveAlertsByKey(db, key);
      continue;
    }
    mismatches++;
    await raiseAlert(db, {
      type: "INVENTORY_MISMATCH",
      severity: "HIGH",
      message: `${r.lot_code}: reserved ${r.reserved_qty} vs open order lines ${r.open_qty}; sold ${r.sold_qty} vs confirmed lines ${r.sold_lines}`,
      entityType: "lot",
      entityId: r.id,
      farmerId: r.farmer_id,
      dedupeKey: key,
    });
  }
  return mismatches;
}

/** Orders that have not progressed. */
export async function checkOrderDelays(now = new Date()): Promise<void> {
  const stale = await db
    .select()
    .from(ordersTable)
    .where(
      sql`(${ordersTable.status} IN ('PENDING','ACCEPTED','PREPARING','READY','DISPATCHED') AND ${ordersTable.updatedAt} < ${new Date(now.getTime() - 3 * 86_400_000)})
       OR (${ordersTable.status} = 'DELIVERED' AND ${ordersTable.updatedAt} < ${new Date(now.getTime() - 7 * 86_400_000)})`,
    );
  for (const o of stale) {
    await raiseAlert(db, {
      type: "LONG_DELAY",
      severity: o.status === "PENDING" ? "MEDIUM" : "LOW",
      message: `Order ${o.orderCode} has been ${o.status} since ${o.updatedAt.toISOString().slice(0, 10)}`,
      entityType: "order",
      entityId: o.id,
      farmerId: o.farmerId,
      dedupeKey: `LONG_DELAY:${o.id}:${o.status}`,
    });
  }
}

export async function sweepRisk(): Promise<void> {
  const lots = await db.select().from(lotsTable).where(and(sql`${lotsTable.availableQty} > 0`, inArray(lotsTable.status, ["HARVESTED", "AVAILABLE", "RESERVED", "PARTIALLY_SOLD"])));
  for (const lot of lots) await syncRiskAlert(db, lot, await computeRisk(db, lot));
}

const timers: NodeJS.Timeout[] = [];

function every(minutes: number, lockId: number, name: string, fn: () => Promise<unknown>, initialDelayMs: number) {
  const run = () =>
    withJobLock(lockId, async () => {
      try {
        await fn();
      } catch (err) {
        logger.error({ err, job: name }, "Scheduled job failed");
      }
    }).catch((err) => logger.error({ err, job: name }, "Job lock failed"));
  timers.push(setTimeout(run, initialDelayMs));
  timers.push(setInterval(run, minutes * 60_000));
}

/** How often each automated source should be fetched (ms). Annual sources are only *checked* this often. */
export function sourceIntervals(): Record<SourceKey, number> {
  const ing = config.ingestion;
  return {
    datagov_mandi_daily: ing.marketIntervalMinutes * 60_000,
    open_meteo_current: ing.weatherIntervalMinutes * 60_000,
    pau_potato_punjab: 7 * 86_400_000,
    faostat_potato_india: 30 * 86_400_000,
  };
}

/** Runs every source whose last attempt is older than its interval. Unconfigured sources are not attempted. */
export async function runDueSources(now = Date.now()): Promise<SourceKey[]> {
  const ran: SourceKey[] = [];
  for (const [id, interval] of Object.entries(sourceIntervals()) as [SourceKey, number][]) {
    if (id === "datagov_mandi_daily" && !config.ingestion.dataGovApiKey) continue;
    const [last] = await db.select({ at: externalIngestionRunsTable.startedAt }).from(externalIngestionRunsTable).where(eq(externalIngestionRunsTable.sourceId, id)).orderBy(desc(externalIngestionRunsTable.startedAt)).limit(1);
    if (last && now - last.at.getTime() < interval) continue;
    try {
      await runSource(id);
      ran.push(id);
    } catch (err) {
      logger.error({ err, source: id }, "Scheduled source run crashed");
    }
  }
  return ran;
}

export function startScheduler(): void {
  // Abandoned checkouts must release their stock even when external-data ingestion is switched off.
  if (config.payments.enabled) every(1, 91005, "payment-expiry", async () => void (await expireUnpaidOrders()), 20_000);
  if (!config.ingestion.enabled) {
    logger.info("Scheduler disabled (INGESTION_ENABLED=false)");
    return;
  }
  every(15, 91001, "external-data", runDueSources, 15_000);
  every(30, 91003, "integrity", async () => {
    await checkInventoryIntegrity();
    await checkOrderDelays();
    await sweepRisk();
  }, 30_000);
  logger.info("Scheduler started");
}

export function stopScheduler(): void {
  for (const t of timers) clearTimeout(t);
  timers.length = 0;
}
