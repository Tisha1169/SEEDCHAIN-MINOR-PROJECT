import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  alertsTable,
  db,
  farmsTable,
  lotsTable,
  ordersTable,
  productsTable,
  qrCodesTable,
  traceabilityEventsTable,
  usersTable,
  type User,
} from "@workspace/db";
import { config } from "../config";
import { computeRisk, serializeEvent } from "./lots";
import { allSourceStatuses } from "./external/ingestion";
import { listOrders } from "./orders";
import { listMyScans } from "./trace";

const n = (v: unknown) => Number(v ?? 0);

async function scalar(query: ReturnType<typeof sql>): Promise<number> {
  const r = await db.execute(query);
  return n((r.rows[0] as Record<string, unknown>)?.v);
}

/** Every number below is computed from live database rows at request time. */
export async function adminOverview() {
  const [
    totalFarmers,
    verifiedFarmers,
    pendingFarmers,
    totalCustomers,
    activeLots,
    ordersToday,
    completedOrders,
    qrScansToday,
    traceEvents,
    openAlerts,
  ] = await Promise.all([
    scalar(sql`SELECT count(*) v FROM users WHERE role='farmer'`),
    scalar(sql`SELECT count(*) v FROM users u JOIN farmer_profiles p ON p.user_id=u.id WHERE u.role='farmer' AND u.status='active' AND p.verified_at IS NOT NULL`),
    scalar(sql`SELECT count(*) v FROM users WHERE role='farmer' AND status='pending'`),
    scalar(sql`SELECT count(*) v FROM users WHERE role='customer'`),
    scalar(sql`SELECT count(*) v FROM lots WHERE status <> 'SOLD_OUT'`),
    scalar(sql`SELECT count(*) v FROM orders WHERE created_at >= date_trunc('day', now())`),
    scalar(sql`SELECT count(*) v FROM orders WHERE status='CUSTOMER_CONFIRMED'`),
    scalar(sql`SELECT count(*) v FROM qr_scan_events WHERE scanned_at >= date_trunc('day', now())`),
    scalar(sql`SELECT count(*) v FROM traceability_events`),
    scalar(sql`SELECT count(*) v FROM alerts WHERE resolved_at IS NULL`),
  ]);
  const totals = (
    await db.execute(sql`SELECT coalesce(sum(available_qty),0) available, coalesce(sum(reserved_qty),0) reserved,
      coalesce(sum(sold_qty),0) sold, coalesce(sum(loss_qty),0) loss, coalesce(sum(harvested_qty),0) harvested FROM lots`)
  ).rows[0] as Record<string, string>;

  const lotsByStatus = (await db.execute(sql`SELECT status label, count(*) value FROM lots GROUP BY status ORDER BY status`)).rows;
  const inventoryByFarmer = (
    await db.execute(sql`SELECT coalesce(p.public_name, u.name) farmer, sum(l.available_qty) available, sum(l.reserved_qty) reserved, sum(l.sold_qty) sold
      FROM lots l JOIN users u ON u.id=l.farmer_id LEFT JOIN farmer_profiles p ON p.user_id=u.id
      GROUP BY 1 ORDER BY sum(l.harvested_qty) DESC LIMIT 10`)
  ).rows as Array<Record<string, string>>;
  const series = async (table: "orders" | "qr_scan_events", col: "created_at" | "scanned_at") =>
    (
      await db.execute(sql`SELECT to_char(d, 'YYYY-MM-DD') label, coalesce(c.v, 0) value
        FROM generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') d
        LEFT JOIN (SELECT date_trunc('day', ${sql.raw(col)}) AS bucket, count(*) AS v FROM ${sql.raw(table)} GROUP BY 1) c ON c.bucket = d
        ORDER BY d`)
    ).rows as Array<Record<string, string>>;
  const marketTrend = (
    await db.execute(sql`SELECT observation_date::text label, round(avg(modal_price)::numeric, 2) value
      FROM market_price_observations
      WHERE lower(commodity) = lower(${config.ingestion.marketCommodity}) AND modal_price IS NOT NULL
        AND observation_date >= current_date - 30
      GROUP BY observation_date ORDER BY observation_date`)
  ).rows as Array<Record<string, string>>;

  const riskLots = await db.select().from(lotsTable).where(sql`${lotsTable.availableQty} > 0`).limit(500);
  const risk: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const l of riskLots) risk[(await computeRisk(db, l)).level]++;

  const harvested = n(totals.harvested);
  return {
    totalFarmers,
    verifiedFarmers,
    pendingFarmers,
    totalCustomers,
    activeLots,
    availableQuantity: n(totals.available),
    reservedQuantity: n(totals.reserved),
    soldQuantity: n(totals.sold),
    lossQuantity: n(totals.loss),
    lossRatePct: harvested > 0 ? Math.round((n(totals.loss) / harvested) * 10000) / 100 : 0,
    ordersToday,
    completedOrders,
    qrScansToday,
    traceEvents,
    openAlerts,
    highRiskLots: risk.HIGH + risk.CRITICAL,
    lotsByStatus: (lotsByStatus as Array<Record<string, string>>).map((r) => ({ label: r.label, value: n(r.value) })),
    inventoryByFarmer: inventoryByFarmer.map((r) => ({ farmer: r.farmer, available: n(r.available), reserved: n(r.reserved), sold: n(r.sold) })),
    ordersOverTime: (await series("orders", "created_at")).map((r) => ({ label: r.label, value: n(r.value) })),
    scansOverTime: (await series("qr_scan_events", "scanned_at")).map((r) => ({ label: r.label, value: n(r.value) })),
    riskDistribution: Object.entries(risk).map(([label, value]) => ({ label, value })),
    marketTrend: marketTrend.map((r) => ({ label: r.label, value: n(r.value) })),
    externalFreshness: (await allSourceStatuses()).filter((x) => x.integration === "automated"),
    generatedAt: new Date().toISOString(),
  };
}

export async function farmerOverview(user: User) {
  const fid = user.id;
  const [farms, products, activeQrCodes, openAlerts] = await Promise.all([
    db.$count(farmsTable, eq(farmsTable.farmerId, fid)),
    db.$count(productsTable, eq(productsTable.farmerId, fid)),
    db
      .select({ v: sql<number>`count(*)::int` })
      .from(qrCodesTable)
      .innerJoin(lotsTable, eq(lotsTable.id, qrCodesTable.lotId))
      .where(and(eq(lotsTable.farmerId, fid), eq(qrCodesTable.status, "ACTIVE")))
      .then((r) => r[0].v),
    db.$count(alertsTable, and(eq(alertsTable.farmerId, fid), isNull(alertsTable.resolvedAt))),
  ]);
  const [inv] = await db
    .select({
      activeLots: sql<number>`count(*) FILTER (WHERE ${lotsTable.status} <> 'SOLD_OUT')::int`,
      available: sql<string>`coalesce(sum(${lotsTable.availableQty}),0)`,
      reserved: sql<string>`coalesce(sum(${lotsTable.reservedQty}),0)`,
      sold: sql<string>`coalesce(sum(${lotsTable.soldQty}),0)`,
      loss: sql<string>`coalesce(sum(${lotsTable.lossQty}),0)`,
    })
    .from(lotsTable)
    .where(eq(lotsTable.farmerId, fid));
  const [ord] = await db
    .select({
      pending: sql<number>`count(*) FILTER (WHERE ${ordersTable.status} = 'PENDING')::int`,
      active: sql<number>`count(*) FILTER (WHERE ${ordersTable.status} IN ('ACCEPTED','PREPARING','READY','DISPATCHED','DELIVERED'))::int`,
      completed: sql<number>`count(*) FILTER (WHERE ${ordersTable.status} = 'CUSTOMER_CONFIRMED')::int`,
    })
    .from(ordersTable)
    .where(and(eq(ordersTable.farmerId, fid), inArray(ordersTable.paymentStatus, ["UNPAID", "PAID", "REFUND_PENDING", "REFUNDED"])));
  const recent = await db
    .select({ e: traceabilityEventsTable, lotCode: lotsTable.lotCode, actorName: usersTable.name })
    .from(traceabilityEventsTable)
    .innerJoin(lotsTable, eq(lotsTable.id, traceabilityEventsTable.lotId))
    .leftJoin(usersTable, eq(usersTable.id, traceabilityEventsTable.actorUserId))
    .where(eq(lotsTable.farmerId, fid))
    .orderBy(desc(traceabilityEventsTable.recordedAt))
    .limit(12);
  return {
    farms,
    products,
    activeLots: inv.activeLots,
    available: n(inv.available),
    reserved: n(inv.reserved),
    sold: n(inv.sold),
    loss: n(inv.loss),
    pendingOrders: ord.pending,
    activeOrders: ord.active,
    completedOrders: ord.completed,
    activeQrCodes,
    openAlerts,
    recentEvents: recent.map((r) => serializeEvent({ ...r.e, lotCode: r.lotCode, actorName: r.actorName })),
    generatedAt: new Date().toISOString(),
  };
}

export async function customerOverview(user: User) {
  const orders = await listOrders(user);
  const active = orders.filter((o) => !["REJECTED", "CANCELLED", "CUSTOMER_CONFIRMED"].includes(o.status));
  const done = orders.filter((o) => o.status === "CUSTOMER_CONFIRMED");
  return {
    activeOrders: active.length,
    completedOrders: done.length,
    totalSpent: Math.round(done.reduce((s, o) => s + o.totalAmount, 0) * 100) / 100,
    recentOrders: orders.slice(0, 5),
    recentScans: (await listMyScans(user)).slice(0, 8),
    generatedAt: new Date().toISOString(),
  };
}

