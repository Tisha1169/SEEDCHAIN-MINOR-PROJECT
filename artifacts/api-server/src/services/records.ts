import { sql, and, eq, desc } from "drizzle-orm";
import {
  alertsTable,
  auditLogsTable,
  traceabilityEventsTable,
  type DbOrTx,
  type TraceabilityEvent,
  type User,
} from "@workspace/db";
import { notifyChange } from "./realtime";

/**
 * Write helpers for the three append-only/system logs:
 *  - traceability events (WHO / WHAT / WHERE / WHEN / WHY)
 *  - audit log (privileged actions with before/after)
 *  - alerts (deduplicated while open)
 */

export interface Actor {
  user: Pick<User, "id" | "role"> | null;
  requestId?: string;
  source?: string;
}

export interface NewEvent {
  lotId: string;
  eventType: string;
  eventTime?: Date;
  orderId?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  quantityBefore?: number | null;
  quantityChange?: number | null;
  quantityAfter?: number | null;
  status?: string | null;
  reason?: string | null;
  clientEventId?: string | null;
  isPublic?: boolean;
  metadata?: Record<string, unknown>;
  correctsEventId?: string | null;
}

/** Appends a traceability event, chaining it to the previous event of the same lot. */
export async function appendEvent(tx: DbOrTx, actor: Actor, e: NewEvent): Promise<TraceabilityEvent> {
  const [prev] = await tx
    .select({ id: traceabilityEventsTable.id })
    .from(traceabilityEventsTable)
    .where(eq(traceabilityEventsTable.lotId, e.lotId))
    .orderBy(desc(traceabilityEventsTable.recordedAt), desc(traceabilityEventsTable.eventTime))
    .limit(1);
  const [row] = await tx
    .insert(traceabilityEventsTable)
    .values({
      lotId: e.lotId,
      orderId: e.orderId ?? null,
      eventType: e.eventType,
      eventTime: e.eventTime ?? new Date(),
      actorUserId: actor.user?.id ?? null,
      actorRole: actor.user?.role ?? null,
      location: e.location ?? null,
      latitude: e.latitude ?? null,
      longitude: e.longitude ?? null,
      quantityBefore: e.quantityBefore ?? null,
      quantityChange: e.quantityChange ?? null,
      quantityAfter: e.quantityAfter ?? null,
      status: e.status ?? null,
      reason: e.reason ?? null,
      source: actor.source ?? "web",
      clientEventId: e.clientEventId ?? null,
      isPublic: e.isPublic ?? true,
      metadata: { ...(e.metadata ?? {}), ...(actor.requestId ? { requestId: actor.requestId } : {}) },
      previousEventId: prev?.id ?? null,
      correctsEventId: e.correctsEventId ?? null,
    })
    .returning();
  return row;
}

export async function audit(
  tx: DbOrTx,
  actor: Actor,
  action: string,
  entityType: string,
  entityId: string | null,
  before: unknown,
  after: unknown,
  eventId?: string | null,
): Promise<void> {
  await tx.insert(auditLogsTable).values({
    userId: actor.user?.id ?? null,
    role: actor.user?.role ?? null,
    action,
    entityType,
    entityId,
    before: before === undefined ? null : (JSON.parse(JSON.stringify(before)) as object),
    after: after === undefined ? null : (JSON.parse(JSON.stringify(after)) as object),
    requestId: actor.requestId ?? null,
    eventId: eventId ?? null,
  });
}

export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface NewAlert {
  type: string;
  severity: AlertSeverity;
  message: string;
  entityType?: string;
  entityId?: string | null;
  farmerId?: string | null;
  metadata?: Record<string, unknown>;
  /** While an alert with this key is unresolved, no duplicate is created. */
  dedupeKey?: string;
}

export async function raiseAlert(tx: DbOrTx, a: NewAlert): Promise<void> {
  await tx
    .insert(alertsTable)
    .values({
      type: a.type,
      severity: a.severity,
      message: a.message,
      entityType: a.entityType ?? null,
      entityId: a.entityId ?? null,
      farmerId: a.farmerId ?? null,
      metadata: a.metadata ?? {},
      dedupeKey: a.dedupeKey ?? null,
    })
    .onConflictDoNothing({ target: alertsTable.dedupeKey, where: sql`resolved_at IS NULL AND dedupe_key IS NOT NULL` });
  await notifyChange(tx, { topic: "alerts", farmerId: a.farmerId ?? undefined, adminOnly: !a.farmerId });
}

export async function resolveAlertsByKey(tx: DbOrTx, dedupeKey: string): Promise<void> {
  await tx
    .update(alertsTable)
    .set({ resolvedAt: new Date() })
    .where(and(eq(alertsTable.dedupeKey, dedupeKey), sql`resolved_at IS NULL`));
}
