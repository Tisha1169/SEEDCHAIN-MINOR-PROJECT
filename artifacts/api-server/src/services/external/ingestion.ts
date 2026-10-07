import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import {
  db,
  externalIngestionRunsTable,
  farmsTable,
  marketPriceObservationsTable,
  weatherObservationsTable,
  type DbOrTx,
} from "@workspace/db";
import { config } from "../../config";
import { logger } from "../../lib/logger";
import { raiseAlert, resolveAlertsByKey } from "../records";
import { notifyChange } from "../realtime";

/**
 * External data ingestion with lineage.
 *
 *   external API → fetch (timeout) → validate → normalise → upsert → run record
 *
 * Every observation row references the run that produced it (source,
 * endpoint, request parameters, processing version, retrieval time). When a
 * source fails, nothing is fabricated: the run is stored as FAILED, an
 * EXTERNAL_DATA_FAILURE alert is raised, and the UI shows the last
 * successful retrieval time.
 */

export const SOURCES = {
  market_prices: {
    label: "Government mandi prices (data.gov.in / AGMARKNET daily prices)",
    source: "data.gov.in:agmarknet-daily-prices",
    processingVersion: "market-normaliser-v1",
  },
  weather: {
    label: "Farm weather (Open-Meteo forecast API, current conditions)",
    source: "open-meteo:forecast-current",
    processingVersion: "weather-normaliser-v1",
  },
} as const;
export type SourceKey = keyof typeof SOURCES;

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    if ((err as Error).name === "AbortError") throw new Error(`Timed out after ${timeoutMs} ms`, { cause: err });
    throw err;
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

async function startRun(source: SourceKey, endpoint: string, params: Record<string, unknown>) {
  const [run] = await db
    .insert(externalIngestionRunsTable)
    .values({
      source: SOURCES[source].source,
      sourceEndpoint: endpoint,
      requestParams: params,
      processingVersion: SOURCES[source].processingVersion,
      status: "RUNNING",
    })
    .returning();
  return run;
}

async function finishRun(id: string, status: "SUCCESS" | "PARTIAL" | "FAILED" | "SKIPPED", recordCount: number, error?: string) {
  const [run] = await db
    .update(externalIngestionRunsTable)
    .set({ status, recordCount, error: error ?? null, finishedAt: new Date() })
    .where(eq(externalIngestionRunsTable.id, id))
    .returning();
  return run;
}

async function failureAlert(source: SourceKey, error: string) {
  await raiseAlert(db, {
    type: "EXTERNAL_DATA_FAILURE",
    severity: "MEDIUM",
    message: `${SOURCES[source].label}: ${error}`,
    entityType: "integration",
    dedupeKey: `EXTERNAL_DATA_FAILURE:${source}`,
  });
}

// ------------------------------------------------------------------ market prices

/** data.gov.in publishes dates as dd/mm/yyyy. */
export function parseIndianDate(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return /^\d{4}-\d{2}-\d{2}$/.test(s.trim()) ? s.trim() : null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export interface NormalisedPrice {
  observationDate: string;
  state: string;
  district: string | null;
  market: string;
  commodity: string;
  variety: string;
  grade: string;
  arrivalQuantityTonnes: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  modalPrice: number | null;
}

/** Validates/normalises one data.gov.in record; returns null for unusable rows. */
export function normaliseMarketRecord(r: Record<string, unknown>): NormalisedPrice | null {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = r[k] ?? r[k.toLowerCase()];
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return undefined;
  };
  const observationDate = parseIndianDate(get("arrival_date", "Arrival_Date"));
  const state = get("state", "State");
  const market = get("market", "Market");
  const commodity = get("commodity", "Commodity");
  if (!observationDate || typeof state !== "string" || typeof market !== "string" || typeof commodity !== "string") return null;
  const minPrice = toNum(get("min_price", "Min_x0020_Price", "Min_Price"));
  const maxPrice = toNum(get("max_price", "Max_x0020_Price", "Max_Price"));
  const modalPrice = toNum(get("modal_price", "Modal_x0020_Price", "Modal_Price"));
  if (minPrice == null && maxPrice == null && modalPrice == null) return null;
  if (minPrice != null && maxPrice != null && minPrice > maxPrice) return null;
  const arrival = toNum(get("arrivals_in_qtl", "arrivals", "Arrivals"));
  return {
    observationDate,
    state: state.trim(),
    district: typeof get("district", "District") === "string" ? String(get("district", "District")).trim() : null,
    market: market.trim(),
    commodity: commodity.trim(),
    variety: typeof get("variety", "Variety") === "string" ? String(get("variety", "Variety")).trim() : "",
    grade: typeof get("grade", "Grade") === "string" ? String(get("grade", "Grade")).trim() : "",
    // Arrivals are only stored when the source actually publishes them (quintals → tonnes).
    arrivalQuantityTonnes: arrival == null ? null : arrival / 10,
    minPrice,
    maxPrice,
    modalPrice,
  };
}

export async function ingestMarketPrices() {
  const ing = config.ingestion;
  const params = { commodity: ing.marketCommodity, limit: 500, resource: ing.dataGovResourceId };
  const url = new URL(`${ing.dataGovBaseUrl}/resource/${ing.dataGovResourceId}`);
  url.searchParams.set("api-key", ing.dataGovApiKey || "MISSING");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "500");
  url.searchParams.set("filters[commodity]", ing.marketCommodity);
  const endpoint = redactUrl(url.toString());
  const run = await startRun("market_prices", endpoint, params);

  if (!ing.dataGovApiKey) {
    return finishRun(run.id, "SKIPPED", 0, "DATA_GOV_IN_API_KEY is not configured");
  }
  try {
    const body = (await fetchJson(url.toString(), ing.httpTimeoutMs)) as { records?: unknown; status?: string; message?: string };
    if (!Array.isArray(body.records)) throw new Error(`Unexpected response shape${body.message ? `: ${body.message}` : ""}`);
    const retrievedAt = new Date();
    let stored = 0;
    let rejected = 0;
    for (const raw of body.records) {
      const n = normaliseMarketRecord(raw as Record<string, unknown>);
      if (!n) {
        rejected++;
        continue;
      }
      await db
        .insert(marketPriceObservationsTable)
        .values({
          ...n,
          runId: run.id,
          source: SOURCES.market_prices.source,
          sourceEndpoint: endpoint,
          retrievedAt,
          processingVersion: SOURCES.market_prices.processingVersion,
        })
        .onConflictDoUpdate({
          target: [
            marketPriceObservationsTable.source,
            marketPriceObservationsTable.observationDate,
            marketPriceObservationsTable.state,
            marketPriceObservationsTable.market,
            marketPriceObservationsTable.commodity,
            marketPriceObservationsTable.variety,
            marketPriceObservationsTable.grade,
          ],
          set: {
            runId: run.id,
            retrievedAt,
            minPrice: n.minPrice,
            maxPrice: n.maxPrice,
            modalPrice: n.modalPrice,
            arrivalQuantityTonnes: n.arrivalQuantityTonnes,
          },
        });
      stored++;
    }
    const finished = await finishRun(run.id, rejected && stored ? "PARTIAL" : "SUCCESS", stored, rejected ? `${rejected} record(s) failed validation` : undefined);
    await resolveAlertsByKey(db, "EXTERNAL_DATA_FAILURE:market_prices");
    await notifyChange(db, { topic: "external" });
    return finished;
  } catch (err) {
    const msg = (err as Error).message;
    logger.warn({ err: msg }, "Market price ingestion failed");
    await failureAlert("market_prices", msg);
    return finishRun(run.id, "FAILED", 0, msg);
  }
}

// ------------------------------------------------------------------ weather

/** WMO weather interpretation codes (subset) used by Open-Meteo. */
export function describeWeatherCode(code: number | null | undefined): string | null {
  if (code == null) return null;
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorm";
}

async function ingestWeatherForFarm(tx: DbOrTx, runId: string, farm: { id: string; latitude: number; longitude: number }) {
  const url = new URL(`${config.ingestion.openMeteoBaseUrl}/v1/forecast`);
  url.searchParams.set("latitude", String(farm.latitude));
  url.searchParams.set("longitude", String(farm.longitude));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,precipitation,weather_code");
  url.searchParams.set("timezone", "UTC");
  const body = (await fetchJson(url.toString(), config.ingestion.httpTimeoutMs)) as {
    current?: { time?: string; temperature_2m?: number; relative_humidity_2m?: number; precipitation?: number; weather_code?: number };
  };
  const c = body.current;
  if (!c?.time) throw new Error("Response missing current conditions");
  const observationTime = new Date(`${c.time}Z`);
  if (Number.isNaN(observationTime.getTime())) throw new Error("Invalid observation time");
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  await tx
    .insert(weatherObservationsTable)
    .values({
      runId,
      farmId: farm.id,
      source: SOURCES.weather.source,
      sourceEndpoint: url.toString(),
      latitude: farm.latitude,
      longitude: farm.longitude,
      observationTime,
      retrievedAt: new Date(),
      temperatureC: num(c.temperature_2m),
      precipitationMm: num(c.precipitation),
      humidityPct: num(c.relative_humidity_2m),
      weatherCode: num(c.weather_code),
      condition: describeWeatherCode(num(c.weather_code)),
      processingVersion: SOURCES.weather.processingVersion,
    })
    .onConflictDoNothing();
}

export async function ingestWeather(onlyFarmId?: string) {
  const farms = await db
    .select({ id: farmsTable.id, latitude: farmsTable.latitude, longitude: farmsTable.longitude })
    .from(farmsTable)
    .where(and(isNotNull(farmsTable.latitude), isNotNull(farmsTable.longitude), onlyFarmId ? eq(farmsTable.id, onlyFarmId) : undefined));
  const endpoint = `${config.ingestion.openMeteoBaseUrl}/v1/forecast`;
  const run = await startRun("weather", endpoint, { farms: farms.length, variables: "temperature_2m,relative_humidity_2m,precipitation,weather_code" });
  if (!farms.length) return finishRun(run.id, "SKIPPED", 0, "No farms with GPS coordinates");
  let ok = 0;
  const errors: string[] = [];
  for (const f of farms) {
    try {
      await ingestWeatherForFarm(db, run.id, { id: f.id, latitude: Number(f.latitude), longitude: Number(f.longitude) });
      ok++;
    } catch (err) {
      errors.push((err as Error).message);
    }
  }
  if (!ok) {
    await failureAlert("weather", errors[0] ?? "unknown error");
    return finishRun(run.id, "FAILED", 0, errors.slice(0, 3).join("; "));
  }
  await resolveAlertsByKey(db, "EXTERNAL_DATA_FAILURE:weather");
  await notifyChange(db, { topic: "external" });
  return finishRun(run.id, errors.length ? "PARTIAL" : "SUCCESS", ok, errors.length ? `${errors.length} farm(s) failed: ${errors[0]}` : undefined);
}

// ------------------------------------------------------------------ status / read

export function serializeRun(r: typeof externalIngestionRunsTable.$inferSelect) {
  return {
    id: r.id,
    source: r.source,
    sourceEndpoint: r.sourceEndpoint,
    requestParams: r.requestParams,
    processingVersion: r.processingVersion,
    status: r.status,
    recordCount: r.recordCount,
    error: r.error,
    startedAt: r.startedAt.toISOString(),
    finishedAt: r.finishedAt?.toISOString() ?? null,
  };
}

export async function integrationStatus(key: SourceKey) {
  const s = SOURCES[key];
  const recent = await db
    .select()
    .from(externalIngestionRunsTable)
    .where(eq(externalIngestionRunsTable.source, s.source))
    .orderBy(desc(externalIngestionRunsTable.startedAt))
    .limit(10);
  const [lastSuccess] = await db
    .select()
    .from(externalIngestionRunsTable)
    .where(and(eq(externalIngestionRunsTable.source, s.source), sql`${externalIngestionRunsTable.status} IN ('SUCCESS','PARTIAL')`))
    .orderBy(desc(externalIngestionRunsTable.startedAt))
    .limit(1);
  const configured = key === "market_prices" ? !!config.ingestion.dataGovApiKey : true;
  return {
    source: key,
    label: s.label,
    configured,
    configurationHint: configured ? null : "Set DATA_GOV_IN_API_KEY (free key from https://data.gov.in) on the API server",
    lastRun: recent[0] ? serializeRun(recent[0]) : null,
    lastSuccess: lastSuccess ? serializeRun(lastSuccess) : null,
    recentRuns: recent.map(serializeRun),
  };
}

export async function runSource(key: SourceKey) {
  return key === "market_prices" ? ingestMarketPrices() : ingestWeather();
}
