import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, lotRecallsTable, lotsTable, orderItemsTable, ordersTable, qrCodesTable, usersTable, type DbOrTx, type User } from "@workspace/db";
import { conflict, notFound } from "../lib/errors";
import { availableOf } from "../domain/state-machine";
import { appendEvent, audit, raiseAlert, resolveAlertsByKey, type Actor } from "./records";
import { notify } from "./notifications";
import { notifyChange } from "./realtime";
import { counters } from "./lots";

/**
 * Lot recall. A recalled lot cannot be listed or ordered, its QR page shows a
 * recall warning, and open orders are surfaced to the admin and notified, but
 * not silently cancelled. Customer identities are never exposed publicly.
 */

const OPEN_STATUSES = ["PENDING", "ACCEPTED", "PREPARING", "READY", "DISPATCHED", "DELIVERED"] as const;

export async function recallImpact(tx: DbOrTx, lotId: string) {
  const [lot] = await tx.select().from(lotsTable).where(eq(lotsTable.id, lotId));
  if (!lot) throw notFound("Lot not found");
  const [farmer] = await tx.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(eq(usersTable.id, lot.farmerId));
  const [qr] = await tx.select().from(qrCodesTable).where(and(eq(qrCodesTable.lotId, lotId), inArray(qrCodesTable.status, ["ACTIVE", "DISABLED"])));
  const orders = await tx
    .select({ id: ordersTable.id, code: ordersTable.orderCode, status: ordersTable.status, customerId: ordersTable.customerId, qty: orderItemsTable.quantity })
    .from(orderItemsTable)
    .innerJoin(ordersTable, eq(ordersTable.id, orderItemsTable.orderId))
    .where(eq(orderItemsTable.lotId, lotId));
  const live = orders.filter((o) => o.status !== "CANCELLED" && o.status !== "REJECTED");
  const c = counters(lot);
  return {
    lotCode: lot.lotCode,
    farmerId: lot.farmerId,
    farmerName: farmer?.name ?? null,
    qrActive: qr?.status === "ACTIVE",
    inventory: { harvested: c.harvested, available: availableOf(c), reserved: c.reserved, sold: c.sold, loss: c.loss, unit: lot.unit },
    openOrders: live.filter((o) => (OPEN_STATUSES as readonly string[]).includes(o.status)).map((o) => ({ orderId: o.id, orderCode: o.code, status: o.status, quantity: Number(o.qty) })),
    ordersTotal: live.length,
    customersAffected: new Set(live.map((o) => o.customerId)).size,
    customerIds: [...new Set(live.map((o) => o.customerId))],
  };
}

export async function previewRecall(lotId: string) {
  const { customerIds: _ids, ...rest } = await recallImpact(db, lotId);
  void _ids;
  return rest;
}

export async function initiateRecall(actor: Actor & { user: User }, lotId: string, reason: string, publicMessage: string) {
  await db.transaction(async (tx) => {
    const [lot] = await tx.select().from(lotsTable).where(eq(lotsTable.id, lotId)).for("update");
    if (!lot) throw notFound("Lot not found");
    if (lot.recalled) throw conflict("This lot is already recalled", "ALREADY_RECALLED");
    const impact = await recallImpact(tx, lotId);
    const { customerIds, ...snapshot } = impact;
    const [row] = await tx.insert(lotRecallsTable).values({ lotId, reason, publicMessage, initiatedBy: actor.user.id, impact: snapshot }).returning();
    await tx.update(lotsTable).set({ recalled: true, listed: false, version: sql`${lotsTable.version} + 1`, updatedAt: new Date() }).where(eq(lotsTable.id, lotId));
    const ev = await appendEvent(tx, actor, { lotId, eventType: "LOT_RECALLED", reason, status: lot.status, metadata: { recallId: row.id, publicMessage, openOrders: snapshot.openOrders.length, customersAffected: snapshot.customersAffected } });
    await audit(tx, actor, "LOT_RECALLED", "lot", lotId, { recalled: false, listed: lot.listed }, { recalled: true, listed: false, reason, publicMessage }, ev.id);
    await raiseAlert(tx, { type: "LOT_RECALLED", severity: "CRITICAL", message: `${lot.lotCode} recalled: ${reason}`, entityType: "lot", entityId: lot.id, farmerId: lot.farmerId, metadata: { recallId: row.id }, dedupeKey: `LOT_RECALLED:${lotId}` });
    await notify(tx, [lot.farmerId, ...customerIds], { type: "LOT_RECALLED", params: { lotCode: lot.lotCode, message: publicMessage }, entityType: "lot", entityId: lotId });
    await notifyChange(tx, { topic: "lots", entityId: lotId, lotId, farmerId: lot.farmerId });
    await notifyChange(tx, { topic: "orders", farmerId: lot.farmerId });
    await notifyChange(tx, { topic: "listings" });
  });
  return (await getRecall(lotId))!;
}

export async function clearRecall(actor: Actor & { user: User }, lotId: string, note: string) {
  await db.transaction(async (tx) => {
    const [lot] = await tx.select().from(lotsTable).where(eq(lotsTable.id, lotId)).for("update");
    if (!lot) throw notFound("Lot not found");
    const [rec] = await tx.select().from(lotRecallsTable).where(and(eq(lotRecallsTable.lotId, lotId), eq(lotRecallsTable.status, "ACTIVE"))).for("update");
    if (!lot.recalled || !rec) throw conflict("This lot is not recalled", "NOT_RECALLED");
    await tx.update(lotRecallsTable).set({ status: "CLEARED", clearedBy: actor.user.id, clearedAt: new Date(), clearNote: note }).where(eq(lotRecallsTable.id, rec.id));
    await tx.update(lotsTable).set({ recalled: false, version: sql`${lotsTable.version} + 1`, updatedAt: new Date() }).where(eq(lotsTable.id, lotId));
    const ev = await appendEvent(tx, actor, { lotId, eventType: "LOT_RECALL_CLEARED", reason: note, status: lot.status, metadata: { recallId: rec.id } });
    await audit(tx, actor, "LOT_RECALL_CLEARED", "lot", lotId, { recalled: true }, { recalled: false, note }, ev.id);
    await resolveAlertsByKey(tx, `LOT_RECALLED:${lotId}`);
    await notify(tx, [lot.farmerId], { type: "LOT_RECALL_CLEARED", params: { lotCode: lot.lotCode }, entityType: "lot", entityId: lotId });
    await notifyChange(tx, { topic: "lots", entityId: lotId, lotId, farmerId: lot.farmerId });
  });
  return getRecall(lotId);
}

export async function getRecall(lotId: string) {
  const [r] = await db.select().from(lotRecallsTable).where(eq(lotRecallsTable.lotId, lotId)).orderBy(desc(lotRecallsTable.initiatedAt)).limit(1);
  if (!r) return null;
  return {
    id: r.id,
    lotId: r.lotId,
    status: r.status,
    reason: r.reason,
    publicMessage: r.publicMessage,
    initiatedAt: r.initiatedAt.toISOString(),
    clearedAt: r.clearedAt?.toISOString() ?? null,
    clearNote: r.clearNote,
    impact: r.impact,
  };
}
