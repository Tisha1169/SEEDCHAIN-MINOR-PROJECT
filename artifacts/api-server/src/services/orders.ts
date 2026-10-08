import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  farmerProfilesTable,
  lotsTable,
  orderFeedbackTable,
  orderItemsTable,
  ordersTable,
  paymentsTable,
  productsTable,
  qrCodesTable,
  traceabilityEventsTable,
  usersTable,
  type Lot,
  type Order,
  type User,
} from "@workspace/db";
import { badRequest, conflict, notFound } from "../lib/errors";
import {
  allowedOrderActions,
  availableOf,
  checkOrderTransition,
  round3,
  type FulfillmentMethod,
  type OrderAction,
  type OrderStatus,
  type Role,
} from "../domain/state-machine";
import { appendEvent, audit, raiseAlert, type Actor } from "./records";
import { applyLotState, counters, maybeSoldOut, serializeEvent } from "./lots";
import { notifyChange } from "./realtime";
import { notify, notifyAdmins, type NotificationType } from "./notifications";

function orderCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(10);
  let s = "";
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return `ORD-${s}`;
}

/** Orders in these payment states are the customer's (and admin's) business only; the farmer sees an order once it is paid. */
export const FARMER_VISIBLE_PAYMENT = ["UNPAID", "PAID", "REFUND_PENDING", "REFUNDED"] as const;
const farmerCanSeePayment = (ps: string) => (FARMER_VISIBLE_PAYMENT as readonly string[]).includes(ps);

function canSee(user: User, o: Order): boolean {
  return user.role === "admin" || o.customerId === user.id || (o.farmerId === user.id && farmerCanSeePayment(o.paymentStatus));
}

function viewerRole(user: User, o: Order): Role | null {
  if (user.role === "admin") return "admin";
  if (user.role === "farmer" && o.farmerId === user.id && farmerCanSeePayment(o.paymentStatus)) return "farmer";
  if (user.role === "customer" && o.customerId === user.id) return "customer";
  return null;
}

const iso = (d: Date | null) => d?.toISOString() ?? null;

async function serializeOrders(user: User, orders: Order[], withEvents: boolean) {
  if (!orders.length) return [];
  const ids = orders.map((o) => o.id);
  const items = await db
    .select({
      item: orderItemsTable,
      lotCode: lotsTable.lotCode,
      unit: lotsTable.unit,
      productName: productsTable.name,
      variety: productsTable.variety,
      publicToken: qrCodesTable.publicToken,
    })
    .from(orderItemsTable)
    .innerJoin(lotsTable, eq(orderItemsTable.lotId, lotsTable.id))
    .innerJoin(productsTable, eq(lotsTable.productId, productsTable.id))
    .leftJoin(qrCodesTable, and(eq(qrCodesTable.lotId, lotsTable.id), eq(qrCodesTable.status, "ACTIVE")))
    .where(inArray(orderItemsTable.orderId, ids));
  const people = await db
    .select({ id: usersTable.id, name: usersTable.name, phone: usersTable.phone, publicName: farmerProfilesTable.publicName })
    .from(usersTable)
    .leftJoin(farmerProfilesTable, eq(farmerProfilesTable.userId, usersTable.id))
    .where(inArray(usersTable.id, [...new Set(orders.flatMap((o) => [o.customerId, o.farmerId]))]));
  const person = new Map(people.map((p) => [p.id, p]));
  const pays = await db.select().from(paymentsTable).where(inArray(paymentsTable.orderId, ids)).orderBy(desc(paymentsTable.createdAt));
  const payOf = new Map<string, (typeof pays)[number]>();
  for (const p of pays) if (!payOf.has(p.orderId)) payOf.set(p.orderId, p);
  const feedback = await db.select().from(orderFeedbackTable).where(inArray(orderFeedbackTable.orderId, ids));
  const fb = new Map(feedback.map((f) => [f.orderId, f]));
  const events = withEvents
    ? await db
        .select({ e: traceabilityEventsTable, lotCode: lotsTable.lotCode, actorName: usersTable.name })
        .from(traceabilityEventsTable)
        .innerJoin(lotsTable, eq(lotsTable.id, traceabilityEventsTable.lotId))
        .leftJoin(usersTable, eq(usersTable.id, traceabilityEventsTable.actorUserId))
        .where(inArray(traceabilityEventsTable.orderId, ids))
        .orderBy(asc(traceabilityEventsTable.recordedAt))
    : [];

  return orders.map((o) => {
    const role = viewerRole(user, o);
    const customer = person.get(o.customerId);
    const farmer = person.get(o.farmerId);
    const f = fb.get(o.id);
    return {
      id: o.id,
      orderCode: o.orderCode,
      status: o.status,
      fulfillmentMethod: o.fulfillmentMethod,
      totalAmount: Number(o.totalAmount),
      paymentStatus: o.paymentStatus,
      paymentDueAt: iso(o.paymentDueAt),
      payment: (() => {
        const p = payOf.get(o.id);
        if (!p) return null;
        const priv = role === "customer" || role === "admin";
        return {
          status: p.status,
          method: p.method,
          mode: p.mode,
          amountPaise: p.amountPaise,
          currency: p.currency,
          paidAt: iso(p.paidAt),
          failureReason: priv ? p.failureReason : null,
          // The gateway's payment id is shown to the payer and to admins; the farmer only needs to know it is paid.
          razorpayPaymentId: priv ? p.razorpayPaymentId : null,
          razorpayOrderId: priv ? p.razorpayOrderId : null,
          signatureVerified: role === "admin" ? p.signatureVerified : null,
          webhookVerified: role === "admin" ? p.webhookVerified : null,
        };
      })(),
      deliveryAddress: o.deliveryAddress,
      customerNotes: o.customerNotes,
      rejectionReason: o.rejectionReason,
      cancelReason: o.cancelReason,
      deliveryLocation: o.deliveryLocation,
      deliveryNotes: o.deliveryNotes,
      thirdPartyName: o.thirdPartyName,
      thirdPartyReference: o.thirdPartyReference,
      acceptedAt: iso(o.acceptedAt),
      preparedAt: iso(o.preparedAt),
      readyAt: iso(o.readyAt),
      dispatchedAt: iso(o.dispatchedAt),
      deliveredAt: iso(o.deliveredAt),
      confirmedAt: iso(o.confirmedAt),
      cancelledAt: iso(o.cancelledAt),
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      // Customer contact details are only visible to the fulfilling farmer and admins.
      customer: { id: o.customerId, name: customer?.name ?? "Customer", phone: role === "farmer" || role === "admin" ? (customer?.phone ?? null) : null },
      farmer: { id: o.farmerId, publicName: farmer?.publicName ?? farmer?.name ?? "Farmer" },
      items: items
        .filter((i) => i.item.orderId === o.id)
        .map((i) => ({
          id: i.item.id,
          lotId: i.item.lotId,
          lotCode: i.lotCode,
          productName: i.productName,
          variety: i.variety,
          unit: i.unit,
          quantity: Number(i.item.quantity),
          unitPrice: Number(i.item.unitPrice),
          lineTotal: Number(i.item.lineTotal),
          publicToken: i.publicToken,
        })),
      allowedActions: role ? allowedOrderActions(role, o.status as OrderStatus, o.fulfillmentMethod as FulfillmentMethod) : [],
      events: withEvents
        ? events.filter((e) => e.e.orderId === o.id).map((e) => serializeEvent({ ...e.e, lotCode: e.lotCode, actorName: e.actorName }))
        : undefined,
      feedback: f && !f.hiddenAt ? { rating: f.rating, freshnessRating: f.freshnessRating, qualityRating: f.qualityRating, comment: f.comment, createdAt: f.createdAt.toISOString() } : null,
    };
  });
}

export async function listOrders(user: User, status?: OrderStatus) {
  const conds = [];
  if (user.role === "farmer") conds.push(eq(ordersTable.farmerId, user.id), inArray(ordersTable.paymentStatus, [...FARMER_VISIBLE_PAYMENT]));
  if (user.role === "customer") conds.push(eq(ordersTable.customerId, user.id));
  if (status) conds.push(eq(ordersTable.status, status));
  const rows = await db
    .select()
    .from(ordersTable)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(ordersTable.createdAt))
    .limit(500);
  return serializeOrders(user, rows, false);
}

export async function getOrder(user: User, id: string) {
  const [o] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!o || !canSee(user, o)) throw notFound("Order not found");
  return (await serializeOrders(user, [o], true))[0];
}

export interface CreateOrderInput {
  items: { lotId: string; quantity: number }[];
  fulfillmentMethod: FulfillmentMethod;
  deliveryAddress?: string;
  customerNotes?: string;
}

/**
 * Places an order and reserves inventory atomically.
 * - Lots are locked FOR UPDATE in a deterministic order (no deadlocks).
 * - The (customer, Idempotency-Key) unique index makes retries safe.
 */
export interface CreateOrderOptions {
  /** Online-payment checkout: hold stock until paid; the farmer is told only once payment is confirmed. */
  awaitPayment?: { holdMinutes: number };
}

export async function createOrder(actor: Actor & { user: User }, idempotencyKey: string, input: CreateOrderInput, opts: CreateOrderOptions = {}) {
  const customer = actor.user;
  const [dup] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.customerId, customer.id), eq(ordersTable.idempotencyKey, idempotencyKey)));
  if (dup) return { duplicate: true, order: await getOrder(customer, dup.id) };

  if (input.fulfillmentMethod !== "CUSTOMER_PICKUP" && !input.deliveryAddress?.trim()) {
    throw badRequest("deliveryAddress is required for delivery orders");
  }
  const qtyByLot = new Map<string, number>();
  for (const i of input.items) qtyByLot.set(i.lotId, round3((qtyByLot.get(i.lotId) ?? 0) + i.quantity));
  const lotIds = [...qtyByLot.keys()].sort();

  try {
    const orderId = await db.transaction(async (tx) => {
      const lots: Lot[] = [];
      for (const id of lotIds) {
        const [l] = await tx.select().from(lotsTable).where(eq(lotsTable.id, id)).for("update");
        if (!l) throw notFound("Lot not found");
        lots.push(l);
      }
      const farmerIds = new Set(lots.map((l) => l.farmerId));
      if (farmerIds.size !== 1) throw badRequest("An order can only contain lots from one farmer");
      const farmerId = lots[0].farmerId;
      const [farmer] = await tx.select().from(usersTable).where(eq(usersTable.id, farmerId));
      if (!farmer || farmer.status !== "active") throw conflict("This farmer is not currently accepting orders", "FARMER_UNAVAILABLE");

      let total = 0;
      const lines: { lot: Lot; qty: number; price: number }[] = [];
      for (const lot of lots) {
        const qty = qtyByLot.get(lot.id)!;
        if (lot.recalled) throw conflict(`${lot.lotCode} has been recalled and cannot be ordered`, "LOT_RECALLED");
        if (!lot.listed || lot.pricePerUnit == null) throw conflict(`${lot.lotCode} is not listed for sale`, "NOT_LISTED");
        const available = availableOf(counters(lot));
        if (qty > available) {
          throw conflict(`Only ${available} ${lot.unit} of ${lot.lotCode} is available`, "INSUFFICIENT_INVENTORY", {
            lotId: lot.id,
            available,
            requested: qty,
          });
        }
        const price = Number(lot.pricePerUnit);
        total += qty * price;
        lines.push({ lot, qty, price });
      }

      const [order] = await tx
        .insert(ordersTable)
        .values({
          orderCode: orderCode(),
          customerId: customer.id,
          farmerId,
          status: "PENDING",
          fulfillmentMethod: input.fulfillmentMethod,
          deliveryAddress: input.deliveryAddress ?? null,
          customerNotes: input.customerNotes ?? null,
          totalAmount: Math.round(total * 100) / 100,
          idempotencyKey,
          paymentStatus: opts.awaitPayment ? "PAYMENT_PENDING" : "UNPAID",
          paymentDueAt: opts.awaitPayment ? new Date(Date.now() + opts.awaitPayment.holdMinutes * 60_000) : null,
        })
        .returning();

      for (const { lot, qty, price } of lines) {
        await tx.insert(orderItemsTable).values({
          orderId: order.id,
          lotId: lot.id,
          quantity: qty,
          unitPrice: price,
          lineTotal: Math.round(qty * price * 100) / 100,
        });
        const before = counters(lot);
        const after = await applyLotState(tx, lot, { ...before, reserved: before.reserved + qty });
        await appendEvent(tx, actor, {
          lotId: lot.id,
          orderId: order.id,
          eventType: "ORDER_CREATED",
          quantityBefore: availableOf(before),
          quantityChange: qty,
          quantityAfter: availableOf(counters(after)),
          status: "PENDING",
          reason: opts.awaitPayment ? "Stock held while the customer completes payment" : "Customer order placed; stock reserved",
          metadata: { orderCode: order.orderCode, fulfillmentMethod: input.fulfillmentMethod, unitPrice: price },
        });
        await notifyChange(tx, { topic: "lots", entityId: lot.id, lotId: lot.id, farmerId });
      }
      if (!opts.awaitPayment) await notify(tx, [farmerId], { type: "ORDER_NEW", params: { orderCode: order.orderCode, customerName: customer.name }, entityType: "order", entityId: order.id });
      await audit(tx, actor, "ORDER_CREATED", "order", order.id, null, { orderCode: order.orderCode, total: order.totalAmount, items: lines.map((l) => ({ lot: l.lot.lotCode, qty: l.qty })) });
      await notifyChange(tx, { topic: "orders", entityId: order.id, farmerId: opts.awaitPayment ? undefined : farmerId, customerId: customer.id });
      await notifyChange(tx, { topic: "listings" });
      return order.id;
    });
    return { duplicate: false, order: await getOrder(customer, orderId) };
  } catch (err) {
    // A concurrent retry with the same key won the race: return its order.
    const pg = (err as { cause?: { code?: string; constraint?: string } }).cause ?? (err as { code?: string; constraint?: string });
    if (pg?.code === "23505" && pg.constraint === "orders_idempotency_uq") {
      const [o] = await db.select().from(ordersTable).where(and(eq(ordersTable.customerId, customer.id), eq(ordersTable.idempotencyKey, idempotencyKey)));
      if (o) return { duplicate: true, order: await getOrder(customer, o.id) };
    }
    const code = (err as { code?: string }).code;
    if (code === "INSUFFICIENT_INVENTORY") {
      const details = (err as { details?: { lotId?: string } }).details;
      await raiseAlert(db, {
        type: "OVER_ORDER",
        severity: "LOW",
        message: (err as Error).message,
        entityType: "lot",
        entityId: details?.lotId ?? null,
        metadata: { ...(details ?? {}), customerId: customer.id },
        dedupeKey: `OVER_ORDER:${details?.lotId}:${new Date().toISOString().slice(0, 13)}`,
      });
    }
    throw err;
  }
}

export interface TransitionInput {
  reason?: string;
  eventTime?: Date;
  deliveryLocation?: string;
  latitude?: number;
  longitude?: number;
  deliveryNotes?: string;
  thirdPartyName?: string;
  thirdPartyReference?: string;
  clientEventId?: string;
}

const EVENT_FOR_COMPLETE: Record<FulfillmentMethod, string> = {
  CUSTOMER_PICKUP: "CUSTOMER_PICKUP",
  FARMER_DELIVERY: "DELIVERY_COMPLETED",
  THIRD_PARTY_DELIVERY: "DELIVERY_COMPLETED",
};

export async function transitionOrder(actor: Actor & { user: User }, orderId: string, action: OrderAction, input: TransitionInput) {
  const user = actor.user;
  if (input.clientEventId) {
    const [prior] = await db.select().from(traceabilityEventsTable).where(eq(traceabilityEventsTable.clientEventId, input.clientEventId));
    if (prior) {
      if (prior.orderId !== orderId) throw conflict("clientEventId already used for another order", "IDEMPOTENCY_KEY_REUSED");
      return { duplicate: true, order: await getOrder(user, orderId) };
    }
  }
  const eventTime = input.eventTime ?? new Date();
  if (eventTime.getTime() > Date.now() + 5 * 60_000) throw badRequest("eventTime cannot be in the future");

  await db.transaction(async (tx) => {
    const [order] = await tx.select().from(ordersTable).where(eq(ordersTable.id, orderId)).for("update");
    if (!order || !canSee(user, order)) throw notFound("Order not found");
    const role = viewerRole(user, order)!;
    const method = order.fulfillmentMethod as FulfillmentMethod;
    if (action !== "cancel" && !["UNPAID", "PAID"].includes(order.paymentStatus)) {
      throw conflict(order.paymentStatus === "REFUND_PENDING" || order.paymentStatus === "REFUNDED" ? "This order is being refunded" : "This order is still waiting for payment", "AWAITING_PAYMENT");
    }
    const rule = checkOrderTransition(action, role, order.status as OrderStatus, method, input.reason);
    const forward = ["accept", "prepare", "ready", "dispatch", "complete"].includes(action);
    if (forward) {
      const [recalled] = await tx
        .select({ code: lotsTable.lotCode })
        .from(orderItemsTable)
        .innerJoin(lotsTable, eq(lotsTable.id, orderItemsTable.lotId))
        .where(and(eq(orderItemsTable.orderId, order.id), eq(lotsTable.recalled, true)))
        .limit(1);
      if (recalled) throw conflict(`${recalled.code} is recalled; this order cannot move forward (it can still be cancelled or rejected)`, "LOT_RECALLED");
    }

    const now = new Date();
    const patch: Partial<typeof ordersTable.$inferInsert> = { status: rule.to, updatedAt: now };
    // Cancelling or rejecting a paid order means money must go back; an unpaid hold just ends.
    if ((action === "cancel" || action === "reject") && order.paymentStatus === "PAID") patch.paymentStatus = "REFUND_PENDING";
    if ((action === "cancel" || action === "reject") && ["PAYMENT_PENDING", "PAYMENT_PROCESSING", "PAYMENT_FAILED"].includes(order.paymentStatus)) {
      patch.paymentStatus = "PAYMENT_CANCELLED";
      patch.paymentDueAt = null;
    }
    switch (action) {
      case "accept":
        patch.acceptedAt = eventTime;
        break;
      case "reject":
        patch.rejectionReason = input.reason ?? null;
        patch.cancelledAt = eventTime;
        break;
      case "prepare":
        patch.preparedAt = eventTime;
        break;
      case "ready":
        patch.readyAt = eventTime;
        break;
      case "dispatch":
        if (method === "THIRD_PARTY_DELIVERY" && !input.thirdPartyName?.trim()) {
          throw badRequest("thirdPartyName (courier/transporter) is required for third-party delivery");
        }
        patch.dispatchedAt = eventTime;
        patch.thirdPartyName = input.thirdPartyName ?? null;
        patch.thirdPartyReference = input.thirdPartyReference ?? null;
        patch.deliveryNotes = input.deliveryNotes ?? order.deliveryNotes;
        break;
      case "complete":
        patch.deliveredAt = eventTime;
        patch.deliveryLocation = input.deliveryLocation ?? order.deliveryLocation;
        patch.deliveryLatitude = input.latitude ?? null;
        patch.deliveryLongitude = input.longitude ?? null;
        patch.deliveryNotes = input.deliveryNotes ?? order.deliveryNotes;
        break;
      case "cancel":
        patch.cancelReason = input.reason ?? "Cancelled by customer";
        patch.cancelledAt = eventTime;
        break;
      case "confirm-receipt":
        patch.confirmedAt = eventTime;
        if (!order.deliveredAt) patch.deliveredAt = eventTime;
        break;
    }

    const items = await tx.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
    const sorted = [...items].sort((a, b) => a.lotId.localeCompare(b.lotId));
    let first = true;
    for (const item of sorted) {
      const [lot] = await tx.select().from(lotsTable).where(eq(lotsTable.id, item.lotId)).for("update");
      const qty = Number(item.quantity);
      const before = counters(lot);
      let next = before;
      if (rule.inventory === "release") next = { ...before, reserved: before.reserved - qty };
      if (rule.inventory === "sell") next = { ...before, reserved: before.reserved - qty, sold: before.sold + qty };
      if (next.reserved < -1e-9) {
        await raiseAlert(tx, {
          type: "INVENTORY_MISMATCH",
          severity: "CRITICAL",
          message: `${lot.lotCode}: reserved stock (${before.reserved}) is lower than order ${order.orderCode} line (${qty})`,
          entityType: "lot",
          entityId: lot.id,
          farmerId: lot.farmerId,
          dedupeKey: `INVENTORY_MISMATCH:${lot.id}`,
        });
        throw conflict("Inventory mismatch detected; an admin has been alerted", "INVENTORY_MISMATCH");
      }
      const after = rule.inventory === "none" ? lot : await applyLotState(tx, lot, next);
      const eventType = action === "complete" ? EVENT_FOR_COMPLETE[method] : rule.event;
      await appendEvent(tx, actor, {
        lotId: lot.id,
        orderId: order.id,
        eventType,
        eventTime,
        clientEventId: first ? (input.clientEventId ?? null) : null,
        location: action === "complete" ? (input.deliveryLocation ?? null) : null,
        latitude: action === "complete" ? (input.latitude ?? null) : null,
        longitude: action === "complete" ? (input.longitude ?? null) : null,
        quantityBefore: availableOf(before),
        quantityChange: rule.inventory === "release" ? -qty : rule.inventory === "sell" ? qty : null,
        quantityAfter: availableOf(counters(after)),
        status: rule.to,
        reason: input.reason ?? null,
        metadata: {
          orderCode: order.orderCode,
          action,
          fulfillmentMethod: method,
          ...(action === "dispatch" ? { thirdPartyName: input.thirdPartyName ?? null, thirdPartyReference: input.thirdPartyReference ?? null } : {}),
          ...(rule.inventory !== "none" ? { inventoryEffect: rule.inventory, quantity: qty } : {}),
        },
      });
      first = false;
      if (rule.inventory !== "none") await maybeSoldOut(tx, actor, lot, after, order.id);
      await notifyChange(tx, { topic: "lots", entityId: lot.id, lotId: lot.id, farmerId: lot.farmerId });
    }

    await tx
      .update(ordersTable)
      .set({ ...patch, version: sql`${ordersTable.version} + 1` })
      .where(eq(ordersTable.id, order.id));
    if (patch.paymentStatus === "REFUND_PENDING") {
      await tx.update(paymentsTable).set({ status: "REFUND_PENDING", updatedAt: now }).where(and(eq(paymentsTable.orderId, order.id), eq(paymentsTable.status, "PAID")));
      await raiseAlert(tx, { type: "REFUND_DUE", severity: "HIGH", message: `Order ${order.orderCode} was ${action === "reject" ? "rejected" : "cancelled"} after payment; a refund is due`, entityType: "order", entityId: order.id, dedupeKey: `REFUND_DUE:${order.id}` });
      await notifyAdmins(tx, { type: "REFUND_DUE", params: { orderCode: order.orderCode }, entityType: "order", entityId: order.id });
    }
    if (patch.paymentStatus === "PAYMENT_CANCELLED") {
      await tx.update(paymentsTable).set({ status: "CANCELLED", updatedAt: now }).where(and(eq(paymentsTable.orderId, order.id), inArray(paymentsTable.status, ["CREATED", "PROCESSING", "FAILED"])));
    }
    const NOTIFY: Partial<Record<OrderAction, { type: NotificationType; to: "customer" | "farmer" | "other" }>> = {
      accept: { type: "ORDER_ACCEPTED", to: "customer" },
      reject: { type: "ORDER_REJECTED", to: "customer" },
      dispatch: { type: "ORDER_DISPATCHED", to: "customer" },
      complete: { type: "ORDER_DELIVERED", to: "customer" },
      cancel: { type: "ORDER_CANCELLED", to: "other" },
      "confirm-receipt": { type: "ORDER_CONFIRMED", to: "farmer" },
    };
    const nf = NOTIFY[action];
    if (nf) {
      const targets = nf.to === "customer" ? [order.customerId] : nf.to === "farmer" ? [order.farmerId] : role === "customer" ? [order.farmerId] : role === "admin" ? [order.farmerId, order.customerId] : [order.customerId];
      await notify(tx, targets.filter((id) => id !== user.id), { type: nf.type, params: { orderCode: order.orderCode }, entityType: "order", entityId: order.id });
    }
    await audit(tx, actor, `ORDER_${action.toUpperCase().replace("-", "_")}`, "order", order.id, { status: order.status }, { status: rule.to, reason: input.reason ?? null });
    await notifyChange(tx, { topic: "orders", entityId: order.id, farmerId: order.farmerId, customerId: order.customerId });
    if (rule.inventory !== "none") await notifyChange(tx, { topic: "listings" });
  });
  return { duplicate: false, order: await getOrder(user, orderId) };
}
