import { sql } from "drizzle-orm";
import { db, type DbOrTx } from "@workspace/db";
import { computeCompleteness, type Completeness } from "../domain/completeness";

/** Batched loaders so list pages and dashboards never issue per-lot queries. */

export async function loadCompleteness(lotIds: string[], tx: DbOrTx = db): Promise<Map<string, Completeness>> {
  const out = new Map<string, Completeness>();
  if (!lotIds.length) return out;
  const idList = sql.join(lotIds.map((id) => sql`${id}::uuid`), sql`, `);
  const rows = (
    await tx.execute(sql`
      SELECT l.id,
        (f.id IS NOT NULL AND coalesce(f.state,'') <> '' AND coalesce(l.origin,'') <> '') AS farm_recorded,
        (u.status = 'active' AND p.verified_at IS NOT NULL) AS farmer_verified,
        (l.harvested_qty > 0 AND l.harvest_date IS NOT NULL) AS harvest_recorded,
        (l.quality_grade IS NOT NULL) AS quality_recorded,
        EXISTS (SELECT 1 FROM qr_codes q WHERE q.lot_id = l.id AND q.status = 'ACTIVE') AS qr_active,
        (l.harvested_qty > 0) AS inventory_tracked,
        EXISTS (SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.lot_id = l.id AND o.status NOT IN ('CANCELLED','REJECTED')) AS has_order,
        EXISTS (SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.lot_id = l.id AND o.status = 'CUSTOMER_CONFIRMED') AS customer_confirmed
      FROM lots l
      JOIN users u ON u.id = l.farmer_id
      LEFT JOIN farmer_profiles p ON p.user_id = l.farmer_id
      LEFT JOIN farms f ON f.id = l.farm_id
      WHERE l.id IN (${idList})`)
  ).rows as Array<Record<string, unknown>>;
  for (const r of rows) {
    out.set(
      r.id as string,
      computeCompleteness({
        farmRecorded: !!r.farm_recorded,
        farmerVerified: !!r.farmer_verified,
        harvestRecorded: !!r.harvest_recorded,
        qualityRecorded: !!r.quality_recorded,
        qrActive: !!r.qr_active,
        inventoryTracked: !!r.inventory_tracked,
        hasOrder: !!r.has_order,
        customerConfirmed: !!r.customer_confirmed,
      }),
    );
  }
  return out;
}

export interface RatingSummary {
  average: number | null;
  count: number;
  freshness: number | null;
  quality: number | null;
}

/** Hidden (moderated) reviews never count. */
export async function loadFarmerRatings(farmerIds: string[], tx: DbOrTx = db): Promise<Map<string, RatingSummary>> {
  const out = new Map<string, RatingSummary>();
  if (!farmerIds.length) return out;
  const idList = sql.join(farmerIds.map((id) => sql`${id}::uuid`), sql`, `);
  const rows = (
    await tx.execute(sql`SELECT farmer_id, count(*)::int AS n, round(avg(rating)::numeric, 1) AS avg, round(avg(freshness_rating)::numeric, 1) AS fr, round(avg(quality_rating)::numeric, 1) AS ql
      FROM order_feedback WHERE hidden_at IS NULL AND farmer_id IN (${idList}) GROUP BY farmer_id`)
  ).rows as Array<{ farmer_id: string; n: number; avg: string | null; fr: string | null; ql: string | null }>;
  for (const r of rows) out.set(r.farmer_id, { count: r.n, average: r.avg == null ? null : Number(r.avg), freshness: r.fr == null ? null : Number(r.fr), quality: r.ql == null ? null : Number(r.ql) });
  return out;
}

export const noRating: RatingSummary = { average: null, count: 0, freshness: null, quality: null };
