import { and, desc, eq, sql } from "drizzle-orm";
import { db, lotsTable, qrCodesTable, usersTable, weatherObservationsTable } from "@workspace/db";
import { config } from "../config";
import { computeRisk } from "./lots";
import { getPublicTrace } from "./trace";

/**
 * Aggregates for the public landing page. Every figure is computed from the
 * live database; nothing is hard-coded. Only counts and one public lot are
 * exposed (the same data anyone can already see through its QR).
 */
const n = (v: unknown) => Number(v ?? 0);
const TTL_MS = 30_000;
let cache: { at: number; value: Awaited<ReturnType<typeof compute>> } | null = null;

async function compute() {
  const one = async (q: ReturnType<typeof sql>) => n(((await db.execute(q)).rows[0] as Record<string, unknown>)?.v);
  const [verifiedFarmers, listedLots, qrScans, traceEvents, completedOrders, ordersLast30Days] = await Promise.all([
    one(sql`SELECT count(*) v FROM users u JOIN farmer_profiles p ON p.user_id=u.id WHERE u.role='farmer' AND u.status='active' AND p.verified_at IS NOT NULL`),
    one(sql`SELECT count(*) v FROM lots l JOIN users u ON u.id=l.farmer_id WHERE l.listed AND l.available_qty > 0 AND u.status='active'`),
    one(sql`SELECT count(*) v FROM qr_scan_events WHERE result='OK'`),
    one(sql`SELECT count(*) v FROM traceability_events WHERE is_public`),
    one(sql`SELECT count(*) v FROM orders WHERE status='CUSTOMER_CONFIRMED'`),
    one(sql`SELECT count(*) v FROM orders WHERE created_at >= now() - interval '30 days'`),
  ]);

  const available = (
    await db.execute(sql`SELECT coalesce(sum(l.available_qty * CASE l.unit WHEN 'quintal' THEN 100 WHEN 'tonne' THEN 1000 ELSE 1 END),0) AS kg
      FROM lots l JOIN users u ON u.id=l.farmer_id WHERE l.listed AND u.status='active'`)
  ).rows[0] as { kg: string };

  const cov = (
    await db.execute(sql`SELECT count(*) FILTER (WHERE l.quality_grade IS NOT NULL AND EXISTS (SELECT 1 FROM qr_codes q WHERE q.lot_id=l.id AND q.status='ACTIVE')) AS complete, count(*) AS total
      FROM lots l WHERE l.harvested_qty > 0`)
  ).rows[0] as { complete: string; total: string };

  const stocked = await db.select().from(lotsTable).where(sql`${lotsTable.availableQty} > 0`).limit(200);
  let elevated = 0;
  for (const l of stocked) {
    const r = await computeRisk(db, l);
    if (r.level === "HIGH" || r.level === "CRITICAL") elevated++;
  }

  const [mk] = (
    await db.execute(sql`SELECT modal_price, market, state, observation_date::text AS observation_date, retrieved_at
      FROM market_price_observations WHERE lower(commodity)=lower(${config.ingestion.marketCommodity}) AND modal_price IS NOT NULL
      ORDER BY observation_date DESC, retrieved_at DESC LIMIT 1`)
  ).rows as Array<{ modal_price: string; market: string; state: string; observation_date: string; retrieved_at: Date }>;

  // The featured lot is the most recently updated lot that is publicly listed with an active QR.
  const [f] = await db
    .select({ lot: lotsTable, token: qrCodesTable.publicToken })
    .from(lotsTable)
    .innerJoin(qrCodesTable, and(eq(qrCodesTable.lotId, lotsTable.id), eq(qrCodesTable.status, "ACTIVE")))
    .innerJoin(usersTable, eq(usersTable.id, lotsTable.farmerId))
    .where(and(eq(lotsTable.listed, true), eq(usersTable.status, "active"), sql`${lotsTable.availableQty} > 0`))
    .orderBy(desc(lotsTable.updatedAt))
    .limit(1);

  let featured = null;
  if (f) {
    const t = await getPublicTrace(f.token);
    const [w] = await db.select().from(weatherObservationsTable).where(eq(weatherObservationsTable.farmId, f.lot.farmId)).orderBy(desc(weatherObservationsTable.observationTime)).limit(1);
    const fs = (
      await db.execute(sql`SELECT
          (SELECT count(*) FROM lots x WHERE x.farmer_id=${f.lot.farmerId} AND x.listed AND x.available_qty > 0) AS active_lots,
          (SELECT count(*) FROM lots x WHERE x.farmer_id=${f.lot.farmerId} AND x.harvested_qty > 0) AS lots_total,
          (SELECT count(*) FROM lots x WHERE x.farmer_id=${f.lot.farmerId} AND x.harvested_qty > 0 AND x.quality_grade IS NOT NULL
             AND EXISTS (SELECT 1 FROM qr_codes q WHERE q.lot_id=x.id AND q.status='ACTIVE')) AS lots_complete,
          (SELECT round(avg(fb.rating)::numeric, 1) FROM order_feedback fb JOIN orders o ON o.id=fb.order_id WHERE o.farmer_id=${f.lot.farmerId}) AS rating_avg,
          (SELECT count(*) FROM order_feedback fb JOIN orders o ON o.id=fb.order_id WHERE o.farmer_id=${f.lot.farmerId}) AS rating_count`)
    ).rows[0] as Record<string, string | null>;
    const farmerLots = n(fs.lots_total);
    featured = {
      farmerStats: {
        activeLots: n(fs.active_lots),
        traceabilityPercent: farmerLots ? Math.round((n(fs.lots_complete) / farmerLots) * 100) : null,
        rating: n(fs.rating_count) ? { average: n(fs.rating_avg), count: n(fs.rating_count) } : null,
      },
      publicToken: f.token,
      lotId: f.lot.id,
      lotCode: t.lotCode,
      productName: t.productName,
      variety: t.variety,
      farmerPublicName: t.farmer.publicName,
      verified: t.farmer.verified,
      district: t.farmer.district,
      state: t.farmer.state,
      farmName: t.farmName,
      origin: t.origin,
      harvestDate: t.harvestDate,
      status: t.status,
      qualityGrade: t.qualityGrade,
      availableQuantity: t.availableQuantity,
      unit: t.unit,
      pricePerUnit: f.lot.pricePerUnit == null ? null : Number(f.lot.pricePerUnit),
      timeline: t.timeline.map((e) => ({ eventType: e.eventType, label: e.label, eventTime: e.eventTime })),
      lastUpdatedAt: t.lastUpdatedAt,
      weather: w ? { temperatureC: w.temperatureC, humidityPct: w.humidityPct, condition: w.condition, observationTime: w.observationTime.toISOString() } : null,
    };
  }

  const total = n(cov.total);
  return {
    verifiedFarmers,
    listedLots,
    availableKg: Math.round(n(available.kg)),
    qrScans,
    traceEvents,
    completedOrders,
    ordersLast30Days,
    traceabilityCoverage: { percent: total ? Math.round((n(cov.complete) / total) * 100) : null, lotsCounted: total },
    monitoredLots: stocked.length,
    elevatedRiskLots: elevated,
    market: mk
      ? { modalPricePerQuintal: n(mk.modal_price), pricePerKg: Math.round((n(mk.modal_price) / 100) * 100) / 100, market: mk.market, state: mk.state, observationDate: mk.observation_date, retrievedAt: new Date(mk.retrieved_at).toISOString(), source: "data.gov.in (AGMARKNET)" }
      : null,
    featured,
    generatedAt: new Date().toISOString(),
  };
}

export async function publicOverview() {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const value = await compute();
  cache = { at: Date.now(), value };
  return value;
}

/** Test hook. */
export function clearPublicOverviewCache() {
  cache = null;
}
