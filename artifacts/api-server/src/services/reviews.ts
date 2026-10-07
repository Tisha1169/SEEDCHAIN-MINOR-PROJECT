import { and, desc, eq, isNull } from "drizzle-orm";
import { db, orderFeedbackTable, ordersTable, usersTable, type User } from "@workspace/db";
import { conflict, notFound } from "../lib/errors";
import { audit, type Actor } from "./records";
import { notify } from "./notifications";
import { notifyChange } from "./realtime";
import { getOrder } from "./orders";

/**
 * Reviews: one per confirmed order, written by that order's customer only.
 * Three scores (overall required; freshness and quality optional). An admin can
 * hide a review (moderation); hidden reviews never count and are never shown.
 */

export interface ReviewInput {
  rating: number;
  freshnessRating?: number;
  qualityRating?: number;
  comment?: string;
}

export async function submitReview(actor: Actor & { user: User }, orderId: string, input: ReviewInput) {
  const [o] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!o || o.customerId !== actor.user.id) throw notFound("Order not found");
  if (o.status !== "CUSTOMER_CONFIRMED") throw conflict("A review can be written after you confirm receipt", "INVALID_STATE_TRANSITION");
  const [existing] = await db.select({ id: orderFeedbackTable.id }).from(orderFeedbackTable).where(eq(orderFeedbackTable.orderId, orderId));
  if (existing) throw conflict("You already reviewed this order", "DUPLICATE_REVIEW");
  await db.transaction(async (tx) => {
    try {
      await tx.insert(orderFeedbackTable).values({ orderId, customerId: actor.user.id, farmerId: o.farmerId, rating: input.rating, freshnessRating: input.freshnessRating ?? null, qualityRating: input.qualityRating ?? null, comment: input.comment ?? null });
    } catch (err) {
      const code = (err as { cause?: { code?: string }; code?: string }).cause?.code ?? (err as { code?: string }).code;
      if (code === "23505") throw conflict("You already reviewed this order", "DUPLICATE_REVIEW");
      throw err;
    }
    await audit(tx, actor, "REVIEW_SUBMITTED", "order", orderId, null, { rating: input.rating });
    await notify(tx, [o.farmerId], { type: "REVIEW_RECEIVED", params: { orderCode: o.orderCode, rating: input.rating }, entityType: "order", entityId: orderId });
    await notifyChange(tx, { topic: "orders", entityId: orderId, farmerId: o.farmerId, customerId: o.customerId });
  });
  return getOrder(actor.user, orderId);
}

export async function listReviewsForModeration(includeHidden = true) {
  const rows = await db
    .select({ f: orderFeedbackTable, orderCode: ordersTable.orderCode, customerName: usersTable.name })
    .from(orderFeedbackTable)
    .innerJoin(ordersTable, eq(ordersTable.id, orderFeedbackTable.orderId))
    .innerJoin(usersTable, eq(usersTable.id, orderFeedbackTable.customerId))
    .where(includeHidden ? undefined : isNull(orderFeedbackTable.hiddenAt))
    .orderBy(desc(orderFeedbackTable.createdAt))
    .limit(200);
  const farmerNames = new Map((await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(eq(usersTable.role, "farmer"))).map((u) => [u.id, u.name]));
  return rows.map(({ f, orderCode, customerName }) => ({
    orderId: f.orderId,
    orderCode,
    customerName,
    farmerName: f.farmerId ? (farmerNames.get(f.farmerId) ?? null) : null,
    rating: f.rating,
    freshnessRating: f.freshnessRating,
    qualityRating: f.qualityRating,
    comment: f.comment,
    createdAt: f.createdAt.toISOString(),
    hidden: !!f.hiddenAt,
    hiddenReason: f.hiddenReason,
  }));
}

export async function moderateReview(actor: Actor & { user: User }, orderId: string, hide: boolean, reason?: string) {
  await db.transaction(async (tx) => {
    const [f] = await tx.select().from(orderFeedbackTable).where(eq(orderFeedbackTable.orderId, orderId)).for("update");
    if (!f) throw notFound("Review not found");
    if (hide && f.hiddenAt) throw conflict("Review is already hidden", "INVALID_STATE_TRANSITION");
    if (!hide && !f.hiddenAt) throw conflict("Review is not hidden", "INVALID_STATE_TRANSITION");
    if (hide && !reason?.trim()) throw conflict("A reason is required to hide a review", "REASON_REQUIRED");
    await tx
      .update(orderFeedbackTable)
      .set(hide ? { hiddenAt: new Date(), hiddenBy: actor.user.id, hiddenReason: reason! } : { hiddenAt: null, hiddenBy: null, hiddenReason: null })
      .where(eq(orderFeedbackTable.orderId, orderId));
    await audit(tx, actor, hide ? "REVIEW_HIDDEN" : "REVIEW_RESTORED", "order", orderId, { hidden: !hide }, { hidden: hide, reason: reason ?? null });
    if (hide) await notify(tx, [f.customerId], { type: "REVIEW_HIDDEN", params: {}, entityType: "order", entityId: orderId });
    await notifyChange(tx, { topic: "orders", entityId: orderId, customerId: f.customerId, farmerId: f.farmerId ?? undefined });
  });
}

/** Public, anonymous review excerpts for a farmer's profile (no customer names). */
export async function publicReviews(farmerId: string, limit = 5) {
  const rows = await db
    .select({ rating: orderFeedbackTable.rating, freshness: orderFeedbackTable.freshnessRating, quality: orderFeedbackTable.qualityRating, comment: orderFeedbackTable.comment, createdAt: orderFeedbackTable.createdAt })
    .from(orderFeedbackTable)
    .where(and(eq(orderFeedbackTable.farmerId, farmerId), isNull(orderFeedbackTable.hiddenAt)))
    .orderBy(desc(orderFeedbackTable.createdAt))
    .limit(limit);
  return rows.map((r) => ({ rating: r.rating, freshnessRating: r.freshness, qualityRating: r.quality, comment: r.comment, createdAt: r.createdAt.toISOString(), verifiedPurchase: true as const }));
}

