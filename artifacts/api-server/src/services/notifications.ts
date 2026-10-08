import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, notificationsTable, usersTable, type DbOrTx } from "@workspace/db";
import { notifyChange } from "./realtime";

/**
 * In-app notifications. Only a machine-readable `type` and `params` are stored;
 * the client renders them in the user's language. Email/SMS/WhatsApp providers
 * can be added later by subscribing to `notify()` without touching callers.
 */
export type NotificationType =
  | "ORDER_NEW"
  | "ORDER_ACCEPTED"
  | "ORDER_REJECTED"
  | "ORDER_CANCELLED"
  | "ORDER_DISPATCHED"
  | "ORDER_DELIVERED"
  | "ORDER_CONFIRMED"
  | "FARMER_APPLICATION"
  | "FARMER_VERIFIED"
  | "FARMER_CORRECTION_REQUIRED"
  | "FARMER_REJECTED"
  | "QR_ANOMALY"
  | "QR_DISABLED"
  | "QR_ENABLED"
  | "QR_REVOKED"
  | "LOT_RECALLED"
  | "LOT_RECALL_CLEARED"
  | "REVIEW_RECEIVED"
  | "REVIEW_HIDDEN"
  | "PAYMENT_RECEIVED"
  | "REFUND_DUE"
  | "SEAL_EXCEPTION";

export interface NotifyInput {
  type: NotificationType;
  params?: Record<string, unknown>;
  entityType?: string;
  entityId?: string | null;
}

export async function notify(tx: DbOrTx, userIds: string[], n: NotifyInput): Promise<void> {
  const ids = [...new Set(userIds)];
  if (!ids.length) return;
  await tx.insert(notificationsTable).values(ids.map((userId) => ({ userId, type: n.type, params: n.params ?? {}, entityType: n.entityType ?? null, entityId: n.entityId ?? null })));
  for (const userId of ids) await notifyChange(tx, { topic: "notifications", userId });
}

export async function adminIds(tx: DbOrTx = db): Promise<string[]> {
  const rows = await tx.select({ id: usersTable.id }).from(usersTable).where(and(eq(usersTable.role, "admin"), eq(usersTable.status, "active")));
  return rows.map((r) => r.id);
}

export async function notifyAdmins(tx: DbOrTx, n: NotifyInput): Promise<void> {
  await notify(tx, await adminIds(tx), n);
}

const serialize = (r: typeof notificationsTable.$inferSelect) => ({
  id: r.id,
  type: r.type,
  params: r.params,
  entityType: r.entityType,
  entityId: r.entityId,
  createdAt: r.createdAt.toISOString(),
  readAt: r.readAt?.toISOString() ?? null,
});

export async function listNotifications(userId: string, limit = 30) {
  const items = await db.select().from(notificationsTable).where(eq(notificationsTable.userId, userId)).orderBy(desc(notificationsTable.createdAt)).limit(limit);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(notificationsTable).where(and(eq(notificationsTable.userId, userId), isNull(notificationsTable.readAt)));
  return { unread: n, items: items.map(serialize) };
}

export async function markRead(userId: string, ids?: string[]) {
  await db
    .update(notificationsTable)
    .set({ readAt: new Date() })
    .where(and(eq(notificationsTable.userId, userId), isNull(notificationsTable.readAt), ids?.length ? inArray(notificationsTable.id, ids) : undefined));
}
