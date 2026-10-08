import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, externalIngestionRunsTable, externalRawPayloadsTable } from "@workspace/db";
import { logger } from "../../lib/logger";
import { raiseAlert, resolveAlertsByKey } from "../records";
import { notifyChange } from "../realtime";
import { registryEntry } from "./registry";

/**
 * SOURCE → FETCH → RAW → VALIDATE → NORMALISE → MASTER → DATABASE
 *
 * Every adapter runs through `runAdapter`, which records the run (source,
 * endpoint, parameters, processing version), keeps the untouched raw payload,
 * counts fetched / accepted / rejected records, and on failure keeps all
 * previously validated data, raises an alert and stores the error. Raw data is
 * never overwritten: each fetch is a new row.
 */

export const sha256 = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");
const MAX_RAW_BYTES = 3_000_000;

export interface RunContext {
  runId: string;
  sourceId: string;
  /** Stores the raw payload exactly as received (capped; the hash always covers the full payload). */
  saveRaw(body: string, contentType: string, hashOfFull?: string): Promise<void>;
}

export interface AdapterOutcome {
  fetched: number;
  accepted: number;
  rejected: number;
  /** Short human-readable reasons for rejected records, and non-fatal warnings. */
  notes?: string[];
}

export async function runAdapter(
  sourceId: string,
  endpoint: string,
  params: Record<string, unknown>,
  processingVersion: string,
  fn: (ctx: RunContext) => Promise<AdapterOutcome | "SKIPPED">,
  skipReason?: string,
) {
  const entry = registryEntry(sourceId);
  const [run] = await db
    .insert(externalIngestionRunsTable)
    .values({ source: sourceId, sourceId, sourceEndpoint: endpoint, requestParams: params, processingVersion, status: "RUNNING" })
    .returning();
  const finish = async (status: "SUCCESS" | "PARTIAL" | "FAILED" | "SKIPPED", o: Partial<AdapterOutcome>, error?: string) => {
    const [r] = await db
      .update(externalIngestionRunsTable)
      .set({ status, fetchedCount: o.fetched ?? 0, recordCount: o.accepted ?? 0, rejectedCount: o.rejected ?? 0, error: error ?? null, finishedAt: new Date() })
      .where(eq(externalIngestionRunsTable.id, run.id))
      .returning();
    return r;
  };
  const ctx: RunContext = {
    runId: run.id,
    sourceId,
    async saveRaw(body, contentType, hashOfFull) {
      const bytes = Buffer.byteLength(body);
      await db.insert(externalRawPayloadsTable).values({
        runId: run.id,
        sourceId,
        contentType,
        byteSize: bytes,
        sha256: hashOfFull ?? sha256(body),
        body: bytes > MAX_RAW_BYTES ? body.slice(0, MAX_RAW_BYTES) : body,
      });
    },
  };
  try {
    const out = await fn(ctx);
    if (out === "SKIPPED") return finish("SKIPPED", {}, skipReason);
    const notes = out.notes?.slice(0, 8).join("; ");
    const status = out.accepted === 0 && out.fetched > 0 ? "FAILED" : out.rejected > 0 ? "PARTIAL" : "SUCCESS";
    const r = await finish(status, out, status === "FAILED" ? (notes ?? "All records were rejected by validation") : notes);
    if (status === "FAILED") await failureAlert(sourceId, entry.name, notes ?? "All records were rejected by validation");
    else {
      await resolveAlertsByKey(db, `EXTERNAL_DATA_FAILURE:${sourceId}`);
      await notifyChange(db, { topic: "external" });
    }
    return r;
  } catch (err) {
    const msg = (err as Error).message;
    logger.warn({ source: sourceId, err: msg }, "External data run failed; previously validated data is kept");
    await failureAlert(sourceId, entry.name, msg);
    return finish("FAILED", {}, msg);
  }
}

async function failureAlert(sourceId: string, name: string, error: string) {
  await raiseAlert(db, {
    type: "EXTERNAL_DATA_FAILURE",
    severity: "MEDIUM",
    message: `${name}: ${error}`,
    entityType: "integration",
    metadata: { sourceId },
    dedupeKey: `EXTERNAL_DATA_FAILURE:${sourceId}`,
  });
}

/** fetch with a timeout and a clear error; certificates are always verified. */
export async function fetchText(url: string, timeoutMs: number, headers: Record<string, string> = {}): Promise<{ body: string; contentType: string; status: number }> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { "user-agent": "SeedChain-data-pipeline/1.0 (+pilot; contact: project owner)", accept: "*/*", ...headers }, redirect: "follow" });
    const body = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return { body, contentType: res.headers.get("content-type") ?? "", status: res.status };
  } catch (err) {
    const e = err as Error & { cause?: { code?: string } };
    if (e.name === "AbortError") throw new Error(`Timed out after ${timeoutMs} ms`, { cause: err });
    throw new Error(e.cause?.code ? `${e.message} (${e.cause.code})` : e.message, { cause: err });
  } finally {
    clearTimeout(t);
  }
}

/** Removes secrets (api keys) from URLs before they are stored as lineage. */
export function redactUrl(url: string): string {
  const u = new URL(url);
  for (const k of [...u.searchParams.keys()]) if (/key|token|secret/i.test(k)) u.searchParams.set(k, "REDACTED");
  return u.toString();
}
