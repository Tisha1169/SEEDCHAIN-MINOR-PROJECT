import { readFile } from "node:fs/promises";
import { db, marketPriceObservationsTable } from "@workspace/db";
import { config } from "../../../config";
import { fetchText, redactUrl, runAdapter, sha256, type RunContext } from "../pipeline";

/**
 * Government mandi prices (data.gov.in OGD resource "Current daily price of various commodities
 * from various markets (Mandi)"). Daily observations, NOT real-time. A missing market/date is
 * never estimated. This adapter has NOT been verified against the live API from the build network
 * (see data/source_registry/datagov_mandi_daily.json); it is tested on the documented shape.
 */

export const MANDI_VERSION = "mandi-normaliser-v2";
export const SOURCE_ID = "datagov_mandi_daily";

/** data.gov.in publishes dates as dd/mm/yyyy. */
export function parseIndianDate(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return /^\d{4}-\d{2}-\d{2}$/.test(s.trim()) ? s.trim() : null;
  const [, d, mo, y] = m;
  const iso = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  return Number.isNaN(Date.parse(`${iso}T00:00:00Z`)) ? null : iso;
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

/** Validates/normalises one record; returns the rejection reason as a string for unusable rows. */
export function normaliseMarketRecord(r: Record<string, unknown>): NormalisedPrice | null {
  const out = checkMarketRecord(r);
  return typeof out === "string" ? null : out;
}

export function checkMarketRecord(r: Record<string, unknown>): NormalisedPrice | string {
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
  if (!observationDate) return "invalid or missing arrival date";
  if (typeof state !== "string" || typeof market !== "string" || typeof commodity !== "string") return "missing state, market or commodity";
  const minPrice = toNum(get("min_price", "Min_x0020_Price", "Min_Price"));
  const maxPrice = toNum(get("max_price", "Max_x0020_Price", "Max_Price"));
  const modalPrice = toNum(get("modal_price", "Modal_x0020_Price", "Modal_Price"));
  if (minPrice == null && maxPrice == null && modalPrice == null) return `${market} ${observationDate}: no usable price`;
  if (minPrice != null && maxPrice != null && minPrice > maxPrice) return `${market} ${observationDate}: min price above max price`;
  if (modalPrice != null && ((minPrice != null && modalPrice < minPrice) || (maxPrice != null && modalPrice > maxPrice))) return `${market} ${observationDate}: modal price outside min-max range`;
  if (observationDate > new Date().toISOString().slice(0, 10)) return `${market}: observation date in the future`;
  const arrival = toNum(get("arrivals_in_qtl", "arrivals", "Arrivals"));
  const str = (...k: string[]) => {
    const v = get(...k);
    return typeof v === "string" ? v.trim() : "";
  };
  return {
    observationDate,
    state: state.trim(),
    district: str("district", "District") || null,
    market: market.trim(),
    commodity: commodity.trim(),
    variety: str("variety", "Variety"),
    grade: str("grade", "Grade"),
    // Arrivals are only stored when the source actually publishes them (quintals → tonnes).
    arrivalQuantityTonnes: arrival == null ? null : arrival / 10,
    minPrice,
    maxPrice,
    modalPrice,
  };
}

async function persist(ctx: RunContext, records: unknown[], endpoint: string) {
  const retrievedAt = new Date();
  let accepted = 0;
  const rejected: string[] = [];
  for (const raw of records) {
    const n = raw && typeof raw === "object" ? checkMarketRecord(raw as Record<string, unknown>) : "not an object";
    if (typeof n === "string") {
      rejected.push(n);
      continue;
    }
    await db
      .insert(marketPriceObservationsTable)
      .values({ ...n, runId: ctx.runId, source: SOURCE_ID, sourceEndpoint: endpoint, retrievedAt, processingVersion: MANDI_VERSION })
      .onConflictDoUpdate({
        target: [marketPriceObservationsTable.source, marketPriceObservationsTable.observationDate, marketPriceObservationsTable.state, marketPriceObservationsTable.market, marketPriceObservationsTable.commodity, marketPriceObservationsTable.variety, marketPriceObservationsTable.grade],
        set: { runId: ctx.runId, retrievedAt, minPrice: n.minPrice, maxPrice: n.maxPrice, modalPrice: n.modalPrice, arrivalQuantityTonnes: n.arrivalQuantityTonnes },
      });
    accepted++;
  }
  return { fetched: records.length, accepted, rejected: rejected.length, notes: rejected };
}

interface Page { records?: unknown; total?: number | string; message?: string }

function pageUrl(offset: number, keyword: boolean): string {
  const ing = config.ingestion;
  const u = new URL(`${ing.dataGovBaseUrl}/resource/${ing.dataGovResourceId}`);
  u.searchParams.set("api-key", ing.dataGovApiKey);
  u.searchParams.set("format", "json");
  u.searchParams.set("limit", "500");
  u.searchParams.set("offset", String(offset));
  u.searchParams.set(keyword ? "filters[state.keyword]" : "filters[state]", ing.marketState);
  u.searchParams.set(keyword ? "filters[commodity]" : "filters[commodity]", ing.marketCommodity);
  return u.toString();
}

export async function ingestMarketPrices() {
  const ing = config.ingestion;
  const endpoint = redactUrl(pageUrl(0, true));
  return runAdapter(
    SOURCE_ID,
    endpoint,
    { commodity: ing.marketCommodity, state: ing.marketState, resource: ing.dataGovResourceId },
    MANDI_VERSION,
    async (ctx) => {
      if (!ing.dataGovApiKey) return "SKIPPED";
      const all: unknown[] = [];
      for (const keyword of [true, false]) {
        all.length = 0;
        let total = Infinity;
        for (let offset = 0, pages = 0; offset < total && pages < 12; offset += 500, pages++) {
          const { body } = await fetchText(pageUrl(offset, keyword), ing.httpTimeoutMs);
          let json: Page;
          try {
            json = JSON.parse(body) as Page;
          } catch {
            throw new Error("Response was not JSON");
          }
          if (!Array.isArray(json.records)) throw new Error(`Unexpected response shape${json.message ? `: ${json.message}` : ""}`);
          all.push(...json.records);
          total = Number(json.total ?? json.records.length);
          if (!json.records.length) break;
        }
        if (all.length) break; // the keyword filter form returned data; otherwise retry with the plain filter form
      }
      const raw = JSON.stringify(all);
      await ctx.saveRaw(raw, "application/json", sha256(raw));
      if (!all.length) return { fetched: 0, accepted: 0, rejected: 0, notes: ["The source returned no records for this filter"] };
      return persist(ctx, all, endpoint);
    },
    "DATA_GOV_IN_API_KEY is not configured",
  );
}

/** CSV with a header row (quoted or not) → records keyed by lower-case header. */
export function parseCsv(textIn: string): Record<string, string>[] {
  const lines = textIn.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const split = (l: string) => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (q) { if (c === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out;
  };
  const head = split(lines[0]).map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((l) => Object.fromEntries(split(l).map((v, i) => [head[i], v.trim()])));
}

/** Fallback when the API cannot be reached: import a file downloaded from the data.gov.in portal (JSON or CSV), same validation. */
export async function importMandiFile(path: string) {
  const buf = await readFile(path, "utf8");
  return runAdapter(SOURCE_ID, `file:${path.split("/").pop()}`, { file: path.split("/").pop(), sha256: sha256(buf) }, MANDI_VERSION, async (ctx) => {
    await ctx.saveRaw(buf, path.endsWith(".csv") ? "text/csv" : "application/json", sha256(buf));
    const records = path.endsWith(".csv") ? parseCsv(buf) : ((): unknown[] => { const j = JSON.parse(buf) as { records?: unknown[] } | unknown[]; return Array.isArray(j) ? j : (j.records ?? []); })();
    const wanted = records.filter((r) => r && typeof r === "object" && String((r as Record<string, unknown>).commodity ?? (r as Record<string, unknown>).Commodity ?? "").toLowerCase() === config.ingestion.marketCommodity.toLowerCase());
    return persist(ctx, wanted, `file:${path.split("/").pop()}`);
  });
}
