import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, externalIngestionRunsTable, marketPriceObservationsTable, referenceStatisticsTable, weatherObservationsTable } from "@workspace/db";
import { config } from "../../config";
import { REGISTRY, registryEntry, type RegistryEntry } from "./registry";

/**
 * Freshness vocabulary (shown on every external-data card):
 *  CURRENT        last successful sync is within the source's expected window
 *  CACHED         the latest attempt FAILED, but a previously validated observation is still inside the window
 *                 ("source unavailable; showing the last validated observation")
 *  STALE          the last successful sync is older than the window (or failed and is outside it)
 *  NO_DATA        automated source that has never synced successfully
 *  NOT_INTEGRATED reference-only source: nothing is ingested or shown as data
 */
export type Freshness = "CURRENT" | "CACHED" | "STALE" | "NO_DATA" | "NOT_INTEGRATED";

export const serializeRun = (r: typeof externalIngestionRunsTable.$inferSelect) => ({
  id: r.id,
  source: r.source,
  sourceEndpoint: r.sourceEndpoint,
  requestParams: r.requestParams,
  processingVersion: r.processingVersion,
  status: r.status,
  fetchedCount: r.fetchedCount,
  recordCount: r.recordCount,
  rejectedCount: r.rejectedCount,
  error: r.error,
  startedAt: r.startedAt.toISOString(),
  finishedAt: r.finishedAt?.toISOString() ?? null,
});

export function computeFreshness(entry: Pick<RegistryEntry, "integration" | "staleAfterHours">, lastSuccessAt: Date | null, lastRunFailed: boolean, now = new Date()): Freshness {
  if (entry.integration === "reference_only") return "NOT_INTEGRATED";
  if (!lastSuccessAt) return "NO_DATA";
  const within = entry.staleAfterHours == null || now.getTime() - lastSuccessAt.getTime() <= entry.staleAfterHours * 3_600_000;
  if (!within) return "STALE";
  return lastRunFailed ? "CACHED" : "CURRENT";
}

async function latestObservation(id: string): Promise<string | null> {
  if (id === "datagov_mandi_daily") {
    const [r] = await db.select({ d: sql<string | null>`max(${marketPriceObservationsTable.observationDate})::text` }).from(marketPriceObservationsTable);
    return r?.d ?? null;
  }
  if (id === "open_meteo_current") {
    const [r] = await db.select({ d: sql<string | null>`max(${weatherObservationsTable.observationTime})::text` }).from(weatherObservationsTable);
    return r?.d ? new Date(r.d).toISOString() : null;
  }
  if (id === "pau_potato_punjab" || id === "faostat_potato_india") {
    const [r] = await db.select({ p: sql<string | null>`(array_agg(${referenceStatisticsTable.periodLabel} ORDER BY ${referenceStatisticsTable.yearStart} DESC))[1]` }).from(referenceStatisticsTable).where(eq(referenceStatisticsTable.sourceId, id));
    return r?.p ?? null;
  }
  return null;
}

export async function sourceStatus(id: string) {
  const e = registryEntry(id);
  const recent = await db.select().from(externalIngestionRunsTable).where(eq(externalIngestionRunsTable.sourceId, id)).orderBy(desc(externalIngestionRunsTable.startedAt)).limit(10);
  const [lastSuccess] = await db
    .select()
    .from(externalIngestionRunsTable)
    .where(and(eq(externalIngestionRunsTable.sourceId, id), inArray(externalIngestionRunsTable.status, ["SUCCESS", "PARTIAL"])))
    .orderBy(desc(externalIngestionRunsTable.startedAt))
    .limit(1);
  const lastRun = recent[0];
  const needsKey = id === "datagov_mandi_daily" && !config.ingestion.dataGovApiKey;
  const lastSyncAt = lastSuccess ? (lastSuccess.finishedAt ?? lastSuccess.startedAt) : null;
  const freshness = computeFreshness(e, lastSyncAt, !!lastRun && lastRun.status === "FAILED" && (!lastSuccess || lastRun.startedAt > lastSuccess.startedAt));
  return {
    source: id,
    label: e.name,
    organization: e.organization,
    url: e.url,
    dataset: e.dataset,
    geography: e.geography,
    frequency: e.frequency,
    units: e.units,
    licence: e.licence,
    usageNotes: e.usageNotes,
    dataClass: e.dataClass,
    integration: e.integration,
    integrationNote: e.integrationNote,
    configured: e.integration === "reference_only" ? false : !needsKey,
    configurationHint: needsKey ? "Set DATA_GOV_IN_API_KEY (free key from https://data.gov.in) on the API server" : null,
    freshness,
    observationDate: await latestObservation(id),
    lastSyncAt: lastSyncAt?.toISOString() ?? null,
    lastRun: lastRun ? serializeRun(lastRun) : null,
    lastSuccess: lastSuccess ? serializeRun(lastSuccess) : null,
    recentRuns: recent.map(serializeRun),
  };
}

export async function allSourceStatuses() {
  return Promise.all(REGISTRY.map((e) => sourceStatus(e.id)));
}
