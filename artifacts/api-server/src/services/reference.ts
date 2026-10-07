import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, marketPriceObservationsTable, referenceNotesTable, referenceStatisticsTable } from "@workspace/db";
import { config } from "../config";
import { sourceStatus } from "./external/status";

/** Compact source block shown with every external figure: who, which period, when synced, how fresh. */
export async function sourceInfo(id: string) {
  const s = await sourceStatus(id);
  return {
    source: s.source,
    label: s.label,
    organization: s.organization,
    url: s.url,
    frequency: s.frequency,
    licence: s.licence,
    dataClass: s.dataClass,
    freshness: s.freshness,
    observationDate: s.observationDate,
    lastSyncAt: s.lastSyncAt,
  };
}

/** Matching helper: "S.B.S Nagar", "Ropar" and similar spellings differ between sources. */
const ALIASES: Record<string, string> = { ropar: "rupnagar", sbsnagar: "shahidbhagatsinghnagar", nawanshahr: "shahidbhagatsinghnagar", ferozepur: "firozpur", firozepur: "firozpur", hoshairpur: "hoshiarpur", sasnagar: "sahibzadaajitsinghnagar", mohali: "sahibzadaajitsinghnagar", muktsar: "srimuktsarsahib", srimuktsarsahib: "srimuktsarsahib" };
export function districtKey(name: string | null | undefined): string {
  const k = (name ?? "").toLowerCase().replace(/[^a-z]/g, "");
  return ALIASES[k] ?? k;
}

export async function punjabPotato() {
  const info = await sourceInfo("pau_potato_punjab");
  const rows = await db.select().from(referenceStatisticsTable).where(eq(referenceStatisticsTable.sourceId, "pau_potato_punjab")).orderBy(desc(referenceStatisticsTable.yearStart));
  if (!rows.length) return { source: info, available: false, period: null, attribution: null, citation: null, state: null, districts: [], majorDistrictsNote: null, varietiesNote: null };
  const latest = rows[0].periodLabel;
  const cur = rows.filter((r) => r.periodLabel === latest);
  const byGeo = new Map<string, { level: string; area?: number; prod?: number; yld?: number }>();
  for (const r of cur) {
    const k = `${r.geographyLevel}:${r.geographyName}`;
    const g = byGeo.get(k) ?? { level: r.geographyLevel };
    if (r.metric === "area_ha") g.area = r.value;
    if (r.metric === "production_tonnes") g.prod = r.value;
    if (r.metric === "yield_q_per_ha") g.yld = r.value;
    byGeo.set(k, g);
  }
  const state = byGeo.get("state:Punjab");
  const districts = [...byGeo.entries()]
    .filter(([k]) => k.startsWith("district:"))
    .map(([k, g]) => ({ name: k.slice("district:".length), areaHa: g.area ?? 0, productionT: g.prod ?? 0, yieldQPerHa: g.yld ?? 0 }))
    .sort((a, b) => b.productionT - a.productionT);
  const totalProd = state?.prod ?? districts.reduce((s, d) => s + d.productionT, 0);
  const notes = await db.select().from(referenceNotesTable).where(eq(referenceNotesTable.sourceId, "pau_potato_punjab"));
  const note = (t: string) => {
    const n = notes.find((x) => x.topic === t);
    return n ? { text: n.text, retrievedAt: n.retrievedAt.toISOString() } : null;
  };
  return {
    source: info,
    available: true,
    period: latest,
    attribution: "Table source: Department of Horticulture, Punjab, republished by Punjab Agricultural University",
    citation: cur[0].citation,
    state: state ? { areaHa: state.area ?? 0, productionT: state.prod ?? 0, yieldQPerHa: state.yld ?? 0 } : null,
    districts: districts.map((d, i) => ({ ...d, rank: i + 1, sharePct: totalProd ? Math.round((d.productionT / totalProd) * 1000) / 10 : 0 })),
    majorDistrictsNote: note("major_districts"),
    varietiesNote: note("varieties"),
  };
}

export async function faostatIndia() {
  const info = await sourceInfo("faostat_potato_india");
  const rows = await db.select().from(referenceStatisticsTable).where(eq(referenceStatisticsTable.sourceId, "faostat_potato_india")).orderBy(asc(referenceStatisticsTable.yearStart));
  const by = new Map<number, { year: number; productionT: number | null; areaHa: number | null; yieldKgPerHa: number | null }>();
  for (const r of rows) {
    const e = by.get(r.yearStart) ?? { year: r.yearStart, productionT: null, areaHa: null, yieldKgPerHa: null };
    if (r.metric === "production_tonnes") e.productionT = r.value;
    if (r.metric === "area_harvested_ha") e.areaHa = r.value;
    if (r.metric === "yield_kg_per_ha") e.yieldKgPerHa = r.value;
    by.set(r.yearStart, e);
  }
  return {
    source: info,
    available: rows.length > 0,
    geography: "India (national). FAOSTAT has no state or district granularity.",
    label: "Historical data",
    series: [...by.values()],
    citation: rows.length ? "FAOSTAT, Crops and livestock products (QCL); CC BY 4.0, FAO. Per-row citations are stored with each value." : null,
  };
}

const per = (rows: number[]) => rows.sort((a, b) => a - b);
const median = (xs: number[]) => (xs.length ? (xs.length % 2 ? per(xs)[(xs.length - 1) / 2] : (per(xs)[xs.length / 2 - 1] + per(xs)[xs.length / 2]) / 2) : null);

/**
 * Latest AVAILABLE mandi observation (daily data; never real-time). If a district has no record we say so;
 * we never fall back to a guessed price. Conversions to ₹/kg are done here, not in the browser.
 */
export async function marketReference(district?: string) {
  const info = await sourceInfo("datagov_mandi_daily");
  const commodity = config.ingestion.marketCommodity;
  const state = config.ingestion.marketState;
  const [latest] = await db
    .select({ d: sql<string | null>`max(${marketPriceObservationsTable.observationDate})::text` })
    .from(marketPriceObservationsTable)
    .where(and(sql`lower(${marketPriceObservationsTable.commodity}) = lower(${commodity})`, sql`lower(${marketPriceObservationsTable.state}) = lower(${state})`, sql`${marketPriceObservationsTable.modalPrice} IS NOT NULL`));
  const latestDate = latest?.d ?? null;
  const toObs = (r: typeof marketPriceObservationsTable.$inferSelect) => ({
    market: r.market,
    district: r.district,
    observationDate: r.observationDate,
    minPrice: r.minPrice,
    maxPrice: r.maxPrice,
    modalPrice: r.modalPrice,
    modalPricePerKg: r.modalPrice == null ? null : Math.round((r.modalPrice / 100) * 100) / 100,
    arrivalQuantityTonnes: r.arrivalQuantityTonnes,
  });
  const base = { source: info, state, commodity, unit: "INR/quintal", note: "Daily government observation, not a live price. Prices per kg are the per-quintal price divided by 100." };
  if (!latestDate) return { ...base, latestObservationDate: null, district: district ? { name: district, observation: null } : null, markets: [], stateSummary: null };
  const rows = await db
    .select()
    .from(marketPriceObservationsTable)
    .where(and(sql`lower(${marketPriceObservationsTable.commodity}) = lower(${commodity})`, sql`lower(${marketPriceObservationsTable.state}) = lower(${state})`, sql`${marketPriceObservationsTable.modalPrice} IS NOT NULL`, sql`${marketPriceObservationsTable.observationDate} >= (${latestDate}::date - 7)`))
    .orderBy(desc(marketPriceObservationsTable.observationDate));
  const latestRows = rows.filter((r) => r.observationDate === latestDate);
  const modal = latestRows.map((r) => r.modalPrice!).filter((n) => n != null);
  let districtObs = null;
  if (district) {
    const key = districtKey(district);
    const match = rows.filter((r) => districtKey(r.district) === key)[0]; // most recent record within the last 7 days of data
    districtObs = { name: district, observation: match ? toObs(match) : null };
  }
  return {
    ...base,
    latestObservationDate: latestDate,
    district: districtObs,
    markets: latestRows.map(toObs),
    stateSummary: modal.length ? { markets: modal.length, modalMin: Math.min(...modal), modalMedian: median(modal)!, modalMax: Math.max(...modal), pricePerKgMedian: Math.round((median(modal)! / 100) * 100) / 100 } : null,
  };
}
