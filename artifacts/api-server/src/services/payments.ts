import { and, asc, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { db, lotsTable, orderItemsTable, ordersTable, paymentEventsTable, paymentsTable, usersTable, type DbOrTx, type Order, type Payment, type User } from "@workspace/db";
import { config } from "../config";
import { logger } from "../lib/logger";
import { badRequest, conflict, HttpError, notFound } from "../lib/errors";
import { availableOf, round3 } from "../domain/state-machine";
import { appendEvent, audit, raiseAlert, type Actor } from "./records";
import { applyLotState, counters } from "./lots";
import { notify, notifyAdmins } from "./notifications";
import { notifyChange } from "./realtime";
import { createOrder, getOrder, type CreateOrderInput } from "./orders";
import { razorpay, verifyPaymentSignature, verifyWebhookSignature } from "./razorpay";

/**
 * Online payments with Razorpay.
 *
 * Trust model: the browser is never believed. An order becomes PAID only when
 *   (a) the server verifies the checkout signature against the Razorpay order id it stored itself, or
 *   (b) a signed webhook (raw-body HMAC) says the payment was captured for that order and amount.
 * Both paths share `markPaid`, which is idempotent, so callbacks and webhooks may arrive in any order and any number of times.
 */

const PAYABLE = ["PAYMENT_PENDING", "PAYMENT_PROCESSING", "PAYMENT_FAILED"] as const;
const isPayable = (s: string) => (PAYABLE as readonly string[]).includes(s);
const SYSTEM: Actor = { user: null, source: "payments" };

export function paymentConfig() {
  return {
    enabled: config.payments.enabled,
    keyId: config.payments.enabled ? config.payments.keyId : null, // the public key id only; the secret never leaves the server
    mode: config.payments.enabled ? config.payments.mode : null,
    currency: "INR",
    holdMinutes: config.payments.holdMinutes,
    merchantName: "SeedChain",
  };
}

const toPaise = (rupees: number) => Math.round(rupees * 100);

// ------------------------------------------------------------------ checkout session

export interface CheckoutSession {
  orderId: string;
  orderCode: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: "INR";
  keyId: string;
  mode: "test" | "live";
  expiresAt: string;
  merchantName: string;
  description: string;
  prefill: { name: string; email: string; contact?: string };
}

async function lockOrder(tx: DbOrTx, orderId: string) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${orderId}, 0))`);
}

/** Creates the Razorpay order once per checkout (guarded by an advisory lock and a unique id) and reuses it on retries. */
async function ensureSession(user: User, orderId: string): Promise<CheckoutSession> {
  if (!config.payments.enabled) throw new HttpError(503, "Online payments are not configured", "PAYMENTS_DISABLED");
  const session = await db.transaction(async (tx) => {
    await lockOrder(tx, orderId);
    const [order] = await tx.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    if (!order || order.customerId !== user.id) throw notFound("Order not found");
    if (order.paymentStatus === "PAID") throw conflict("This order is already paid", "ALREADY_PAID");
    if (!isPayable(order.paymentStatus)) throw conflict("This checkout has ended. Please start a new order.", "CHECKOUT_ENDED");
    if (order.paymentDueAt && order.paymentDueAt.getTime() < Date.now()) throw conflict("The payment window expired and the stock hold was released. Please start a new order.", "PAYMENT_EXPIRED");

    const [existing] = await tx
      .select()
      .from(paymentsTable)
      .where(and(eq(paymentsTable.orderId, orderId), inArray(paymentsTable.status, ["CREATED", "PROCESSING", "FAILED"])))
      .orderBy(desc(paymentsTable.createdAt))
      .limit(1);
    let payment: Payment | undefined = existing;
    if (!payment) {
      const amountPaise = toPaise(Number(order.totalAmount));
      if (amountPaise < 100) throw badRequest("The minimum online payment is ₹1");
      const created = await razorpay.createOrder({ amountPaise, receipt: order.orderCode, notes: { orderCode: order.orderCode, seedchainOrderId: order.id } });
      if (created.amount !== amountPaise || created.currency !== "INR") {
        logger.error({ orderCode: order.orderCode }, "Razorpay returned a different amount or currency than requested");
        throw new HttpError(502, "The payment gateway returned an unexpected amount. Please try again.", "GATEWAY_MISMATCH");
      }
      [payment] = await tx.insert(paymentsTable).values({ orderId, razorpayOrderId: created.id, amountPaise, currency: "INR", status: "CREATED", mode: config.payments.mode }).returning();
    }
    return { order, payment };
  });
  const { order, payment } = session;
  return {
    orderId: order.id,
    orderCode: order.orderCode,
    razorpayOrderId: payment.razorpayOrderId,
    amountPaise: payment.amountPaise,
    currency: "INR",
    keyId: config.payments.keyId,
    mode: config.payments.mode,
    expiresAt: (order.paymentDueAt ?? new Date(Date.now() + config.payments.holdMinutes * 60_000)).toISOString(),
    merchantName: "SeedChain",
    description: `SeedChain order ${order.orderCode}`,
    prefill: { name: user.name, email: user.email, ...(user.phone ? { contact: user.phone.replace(/[^\d+]/g, "") } : {}) },
  };
}

/**
 * Validates the cart, reserves stock (inside createOrder's transaction), computes the total on the server,
 * creates the Razorpay order and returns what Checkout needs. The Idempotency-Key makes a double click return the same order.
 */
export async function startCheckout(actor: Actor & { user: User }, idempotencyKey: string, input: CreateOrderInput) {
  if (!config.payments.enabled) throw new HttpError(503, "Online payments are not configured", "PAYMENTS_DISABLED");
  await expireUnpaidOrders();
  const { order } = await createOrder(actor, idempotencyKey, input, { awaitPayment: { holdMinutes: config.payments.holdMinutes } });
  if (order.paymentStatus === "PAID") return { alreadyPaid: true as const, order };
  try {
    const session = await ensureSession(actor.user, order.id);
    return { alreadyPaid: false as const, session, order };
  } catch (err) {
    // Gateway down on the very first attempt: do not leave stock held for an order nobody can pay.
    if (err instanceof HttpError && (err.code === "GATEWAY_ERROR" || err.code === "GATEWAY_UNREACHABLE" || err.code === "GATEWAY_MISMATCH")) {
      await cancelUnpaidOrder(order.id, "Payment gateway unavailable");
    }
    throw err;
  }
}

/** Resume or retry payment for an order that is still inside its hold window. */
export async function getCheckoutSession(user: User, orderId: string) {
  await expireUnpaidOrders();
  return ensureSession(user, orderId);
}

// ------------------------------------------------------------------ marking paid (shared by callback and webhook)

interface PaidInput {
  razorpayPaymentId: string;
  method?: string | null;
  via: "signature" | "webhook";
}

/** Idempotent. Caller holds a transaction. Returns what happened so the caller can report it. */
async function markPaid(tx: DbOrTx, payment: Payment, order: Order, input: PaidInput): Promise<"APPLIED" | "DUPLICATE_STATE" | "LATE_PAYMENT"> {
  const now = new Date();
  const flags = input.via === "signature" ? { signatureVerified: true } : { webhookVerified: true };

  if (payment.status === "PAID" || payment.status === "REFUND_PENDING" || payment.status === "REFUNDED") {
    await tx
      .update(paymentsTable)
      .set({ ...flags, method: payment.method ?? input.method ?? null, razorpayPaymentId: payment.razorpayPaymentId ?? input.razorpayPaymentId, updatedAt: now })
      .where(eq(paymentsTable.id, payment.id));
    return "DUPLICATE_STATE";
  }
  if (payment.razorpayPaymentId && payment.razorpayPaymentId !== input.razorpayPaymentId) {
    // A second, different payment against the same Razorpay order: keep the first, flag the other for a human.
    await raiseAlert(tx, { type: "PAYMENT_MISMATCH", severity: "HIGH", message: `Order ${order.orderCode}: a second payment id arrived for an order that already has one`, entityType: "order", entityId: order.id, dedupeKey: `PAYMENT_MISMATCH:${order.id}` });
    return "DUPLICATE_STATE";
  }

  const orderIsLive = order.status === "PENDING" && isPayable(order.paymentStatus) && (!order.paymentDueAt || order.paymentDueAt.getTime() >= now.getTime() - 60_000);
  if (!orderIsLive) {
    // Money arrived for an order that was cancelled or expired (stock already released): it must be refunded, not fulfilled.
    await tx.update(paymentsTable).set({ ...flags, status: "REFUND_PENDING", razorpayPaymentId: input.razorpayPaymentId, method: input.method ?? null, paidAt: now, updatedAt: now }).where(eq(paymentsTable.id, payment.id));
    await tx.update(ordersTable).set({ paymentStatus: "REFUND_PENDING", paymentDueAt: null, updatedAt: now }).where(eq(ordersTable.id, order.id));
    await raiseAlert(tx, { type: "REFUND_DUE", severity: "HIGH", message: `Order ${order.orderCode}: payment arrived after the order was cancelled or expired; refund due`, entityType: "order", entityId: order.id, dedupeKey: `REFUND_DUE:${order.id}` });
    await notifyAdmins(tx, { type: "REFUND_DUE", params: { orderCode: order.orderCode }, entityType: "order", entityId: order.id });
    await notifyChange(tx, { topic: "orders", entityId: order.id, customerId: order.customerId });
    return "LATE_PAYMENT";
  }

  await tx.update(paymentsTable).set({ ...flags, status: "PAID", razorpayPaymentId: input.razorpayPaymentId, method: input.method ?? payment.method, paidAt: now, failureCode: null, failureReason: null, updatedAt: now }).where(eq(paymentsTable.id, payment.id));
  await tx.update(ordersTable).set({ paymentStatus: "PAID", paymentDueAt: null, updatedAt: now, version: sql`${ordersTable.version} + 1` }).where(eq(ordersTable.id, order.id));
  await notify(tx, [order.farmerId], { type: "ORDER_NEW", params: { orderCode: order.orderCode, customerName: "" }, entityType: "order", entityId: order.id });
  await notify(tx, [order.customerId], { type: "PAYMENT_RECEIVED", params: { orderCode: order.orderCode }, entityType: "order", entityId: order.id });
  await audit(tx, SYSTEM, "PAYMENT_CONFIRMED", "order", order.id, { paymentStatus: order.paymentStatus }, { paymentStatus: "PAID", via: input.via, amountPaise: payment.amountPaise, mode: payment.mode });
  await notifyChange(tx, { topic: "orders", entityId: order.id, farmerId: order.farmerId, customerId: order.customerId });
  return "APPLIED";
}

// ------------------------------------------------------------------ browser callback verification

export interface VerifyInput {
  orderId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export async function verifyCheckout(user: User, input: VerifyInput) {
  const [pre] = await db.select().from(ordersTable).where(eq(ordersTable.id, input.orderId));
  if (!pre || pre.customerId !== user.id) throw notFound("Order not found");
  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.orderId, pre.id)).orderBy(desc(paymentsTable.createdAt)).limit(1);
  if (!payment) throw conflict("No payment was started for this order", "NO_PAYMENT");

  // The id the browser sent must be the one we stored; the signature is checked against OUR copy.
  if (input.razorpay_order_id !== payment.razorpayOrderId) {
    await raiseAlert(db, { type: "PAYMENT_MISMATCH", severity: "MEDIUM", message: `Order ${pre.orderCode}: checkout returned a different Razorpay order id than the one created`, entityType: "order", entityId: pre.id, dedupeKey: `PAYMENT_MISMATCH:${pre.id}` });
    throw badRequest("This payment does not belong to this order", "PAYMENT_ORDER_MISMATCH");
  }
  if (!verifyPaymentSignature(payment.razorpayOrderId, input.razorpay_payment_id, input.razorpay_signature)) {
    await raiseAlert(db, { type: "PAYMENT_SIGNATURE_INVALID", severity: "MEDIUM", message: `Order ${pre.orderCode}: payment signature failed verification (possible tampering)`, entityType: "order", entityId: pre.id, dedupeKey: `PAYMENT_SIGNATURE_INVALID:${pre.id}` });
    throw badRequest("The payment could not be verified", "INVALID_SIGNATURE");
  }

  // Belt and braces: ask Razorpay what it recorded. If it is reachable and disagrees, do not mark paid.
  let method: string | null = null;
  try {
    const rp = await razorpay.fetchPayment(input.razorpay_payment_id);
    if (rp.order_id !== payment.razorpayOrderId || rp.amount !== payment.amountPaise || rp.currency !== payment.currency || rp.status === "failed") {
      await raiseAlert(db, { type: "PAYMENT_MISMATCH", severity: "HIGH", message: `Order ${pre.orderCode}: gateway record disagrees with our order (amount, currency, order id or status)`, entityType: "order", entityId: pre.id, dedupeKey: `PAYMENT_MISMATCH:${pre.id}` });
      throw conflict("The payment record does not match this order. An admin has been alerted.", "PAYMENT_MISMATCH");
    }
    method = rp.method ?? null;
  } catch (err) {
    if (err instanceof HttpError && err.code === "PAYMENT_MISMATCH") throw err;
    logger.warn({ orderCode: pre.orderCode }, "Could not cross-check the payment with Razorpay; relying on the verified signature");
  }

  const outcome = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(ordersTable).where(eq(ordersTable.id, pre.id)).for("update");
    const [pay] = await tx.select().from(paymentsTable).where(eq(paymentsTable.id, payment.id)).for("update");
    const [clash] = await tx.select({ id: paymentsTable.id }).from(paymentsTable).where(eq(paymentsTable.razorpayPaymentId, input.razorpay_payment_id));
    if (clash && clash.id !== pay.id) throw conflict("This payment id is already attached to another order", "PAYMENT_ID_REUSED");
    return markPaid(tx, pay, order, { razorpayPaymentId: input.razorpay_payment_id, method, via: "signature" });
  });
  return { outcome, order: await getOrder(user, pre.id) };
}

// ------------------------------------------------------------------ webhooks

interface WebhookEnvelope {
  event?: string;
  payload?: {
    payment?: { entity?: Record<string, unknown> };
    order?: { entity?: Record<string, unknown> };
    refund?: { entity?: Record<string, unknown> };
  };
}
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" ? v : null);

export type WebhookResult = { status: number; body: Record<string, unknown> };

export async function handleWebhook(rawBody: Buffer, signature: string | undefined, eventId: string | undefined): Promise<WebhookResult> {
  if (!config.payments.webhookSecret) return { status: 503, body: { error: "Webhooks are not configured" } };
  if (!verifyWebhookSignature(rawBody, signature)) {
    logger.warn("Rejected a Razorpay webhook with an invalid signature");
    return { status: 400, body: { error: "Invalid signature" } };
  }
  if (!eventId) return { status: 400, body: { error: "Missing event id" } };
  let env: WebhookEnvelope;
  try {
    env = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return { status: 400, body: { error: "Invalid JSON" } };
  }
  const event = str(env.event) ?? "unknown";
  const pe = env.payload?.payment?.entity ?? {};
  const oe = env.payload?.order?.entity ?? {};
  const re = env.payload?.refund?.entity ?? {};
  const rpPaymentId = str(pe.id) ?? str(re.payment_id);
  const rpOrderId = str(pe.order_id) ?? str(oe.id);

  try {
    const outcome = await db.transaction(async (tx) => {
      let out = "IGNORED";
      let paymentRowId: string | null = null;
      const summary: Record<string, unknown> = { event, status: str(pe.status), method: str(pe.method), amount: num(pe.amount) ?? num(re.amount), errorCode: str(pe.error_code) };

      const [payment] = rpOrderId
        ? await tx.select().from(paymentsTable).where(eq(paymentsTable.razorpayOrderId, rpOrderId)).for("update")
        : rpPaymentId
          ? await tx.select().from(paymentsTable).where(eq(paymentsTable.razorpayPaymentId, rpPaymentId)).for("update")
          : [];
      if (!payment) {
        out = rpOrderId || rpPaymentId ? "UNKNOWN_ORDER" : "IGNORED";
      } else {
        paymentRowId = payment.id;
        const [order] = await tx.select().from(ordersTable).where(eq(ordersTable.id, payment.orderId)).for("update");
        const amount = num(pe.amount);
        const currency = str(pe.currency);
        const amountOk = amount === null || (amount === payment.amountPaise && (currency === null || currency === payment.currency));

        if (event === "payment.captured" || event === "order.paid" || event === "payment.authorized") {
          if (!amountOk || !rpPaymentId) {
            out = "MISMATCH";
            await raiseAlert(tx, { type: "PAYMENT_MISMATCH", severity: "HIGH", message: `Order ${order.orderCode}: webhook amount or currency differs from the order (expected ${payment.amountPaise} paise)`, entityType: "order", entityId: order.id, metadata: { event, got: amount }, dedupeKey: `PAYMENT_MISMATCH:${order.id}` });
          } else if (event === "payment.authorized") {
            // Authorized but not yet captured: show "processing". Capture (or order.paid) will complete it.
            if (payment.status === "CREATED" || payment.status === "FAILED") {
              await tx.update(paymentsTable).set({ status: "PROCESSING", method: str(pe.method) ?? payment.method, razorpayPaymentId: payment.razorpayPaymentId ?? rpPaymentId, webhookVerified: true, updatedAt: new Date() }).where(eq(paymentsTable.id, payment.id));
              if (isPayable(order.paymentStatus)) await tx.update(ordersTable).set({ paymentStatus: "PAYMENT_PROCESSING", updatedAt: new Date() }).where(eq(ordersTable.id, order.id));
              await notifyChange(tx, { topic: "orders", entityId: order.id, customerId: order.customerId });
              out = "APPLIED";
            } else out = "DUPLICATE_STATE";
          } else {
            out = await markPaid(tx, payment, order, { razorpayPaymentId: rpPaymentId, method: str(pe.method), via: "webhook" });
          }
        } else if (event === "payment.failed") {
          if (payment.status === "PAID" || payment.status === "REFUND_PENDING" || payment.status === "REFUNDED") {
            out = "DUPLICATE_STATE"; // a later retry already succeeded; ignore the earlier failure
          } else {
            const reason = (str(pe.error_description) ?? "Payment failed").slice(0, 200);
            await tx.update(paymentsTable).set({ status: "FAILED", method: str(pe.method) ?? payment.method, failureCode: str(pe.error_code)?.slice(0, 80) ?? null, failureReason: reason, webhookVerified: true, updatedAt: new Date() }).where(eq(paymentsTable.id, payment.id));
            if (isPayable(order.paymentStatus)) await tx.update(ordersTable).set({ paymentStatus: "PAYMENT_FAILED", updatedAt: new Date() }).where(eq(ordersTable.id, order.id));
            await notifyChange(tx, { topic: "orders", entityId: order.id, customerId: order.customerId });
            out = "APPLIED";
          }
        } else if (event === "refund.processed") {
          await tx.update(paymentsTable).set({ status: "REFUNDED", refundId: str(re.id) ?? payment.refundId, refundAmountPaise: num(re.amount) ?? payment.refundAmountPaise, refundedAt: new Date(), webhookVerified: true, updatedAt: new Date() }).where(eq(paymentsTable.id, payment.id));
          await tx.update(ordersTable).set({ paymentStatus: "REFUNDED", updatedAt: new Date() }).where(eq(ordersTable.id, order.id));
          await notify(tx, [order.customerId], { type: "PAYMENT_RECEIVED", params: { orderCode: order.orderCode, refunded: true }, entityType: "order", entityId: order.id });
          await notifyChange(tx, { topic: "orders", entityId: order.id, customerId: order.customerId });
          out = "APPLIED";
        }
      }
      // Last statement: a unique violation here rolls back everything above, so redelivery changes nothing.
      await tx.insert(paymentEventsTable).values({ eventId, eventType: event.slice(0, 80), razorpayPaymentId: rpPaymentId, razorpayOrderId: rpOrderId, paymentId: paymentRowId, outcome: out, summary });
      return out;
    });
    return { status: 200, body: { ok: true, outcome } };
  } catch (err) {
    const pg = (err as { cause?: { code?: string; constraint?: string } }).cause ?? (err as { code?: string; constraint?: string });
    if (pg?.code === "23505" && pg.constraint === "payment_events_event_id_uq") return { status: 200, body: { ok: true, outcome: "DUPLICATE_EVENT" } };
    logger.error({ event, eventId, err: (err as Error).message }, "Webhook processing failed");
    return { status: 500, body: { error: "Processing failed; please retry" } }; // Razorpay retries non-2xx responses
  }
}

// ------------------------------------------------------------------ abandoned checkouts

/** Cancels one unpaid order and releases its held stock, atomically. Safe to call repeatedly. */
export async function cancelUnpaidOrder(orderId: string, reason: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(ordersTable).where(eq(ordersTable.id, orderId)).for("update");
    if (!order || order.status !== "PENDING" || !isPayable(order.paymentStatus)) return false;
    const items = await tx.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
    for (const item of [...items].sort((a, b) => a.lotId.localeCompare(b.lotId))) {
      const [lot] = await tx.select().from(lotsTable).where(eq(lotsTable.id, item.lotId)).for("update");
      const qty = Number(item.quantity);
      const before = counters(lot);
      const after = await applyLotState(tx, lot, { ...before, reserved: round3(before.reserved - qty) });
      await appendEvent(tx, SYSTEM, {
        lotId: lot.id,
        orderId,
        eventType: "ORDER_CANCELLED",
        quantityBefore: availableOf(before),
        quantityChange: -qty,
        quantityAfter: availableOf(counters(after)),
        status: "CANCELLED",
        reason,
        isPublic: false,
        metadata: { orderCode: order.orderCode, action: "payment-expired", inventoryEffect: "release", quantity: qty },
      });
      await notifyChange(tx, { topic: "lots", entityId: lot.id, lotId: lot.id, farmerId: lot.farmerId });
    }
    const now = new Date();
    await tx.update(ordersTable).set({ status: "CANCELLED", paymentStatus: "PAYMENT_CANCELLED", paymentDueAt: null, cancelReason: reason, cancelledAt: now, updatedAt: now, version: sql`${ordersTable.version} + 1` }).where(eq(ordersTable.id, orderId));
    await tx.update(paymentsTable).set({ status: "CANCELLED", updatedAt: now }).where(and(eq(paymentsTable.orderId, orderId), inArray(paymentsTable.status, ["CREATED", "PROCESSING", "FAILED"])));
    await audit(tx, SYSTEM, "ORDER_PAYMENT_EXPIRED", "order", orderId, { paymentStatus: order.paymentStatus }, { paymentStatus: "PAYMENT_CANCELLED", reason });
    await notifyChange(tx, { topic: "orders", entityId: orderId, customerId: order.customerId });
    await notifyChange(tx, { topic: "listings" });
    return true;
  });
}

/** Releases stock held by checkouts that were abandoned or never completed. Runs lazily and on a timer. */
export async function expireUnpaidOrders(now = new Date()): Promise<number> {
  const due = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(and(eq(ordersTable.status, "PENDING"), inArray(ordersTable.paymentStatus, [...PAYABLE]), lt(ordersTable.paymentDueAt, now)))
    .orderBy(asc(ordersTable.paymentDueAt))
    .limit(100);
  let n = 0;
  for (const o of due) if (await cancelUnpaidOrder(o.id, "Payment was not completed in time; stock released")) n++;
  return n;
}

// ------------------------------------------------------------------ admin: list and refund

export async function listPayments(limit = 200) {
  const rows = await db
    .select({ p: paymentsTable, orderCode: ordersTable.orderCode, orderStatus: ordersTable.status, customerName: usersTable.name })
    .from(paymentsTable)
    .innerJoin(ordersTable, eq(ordersTable.id, paymentsTable.orderId))
    .innerJoin(usersTable, eq(usersTable.id, ordersTable.customerId))
    .orderBy(desc(paymentsTable.createdAt))
    .limit(limit);
  return rows.map(({ p, orderCode, orderStatus, customerName }) => ({
    id: p.id,
    orderId: p.orderId,
    orderCode,
    orderStatus,
    customerName,
    razorpayOrderId: p.razorpayOrderId,
    razorpayPaymentId: p.razorpayPaymentId,
    amountPaise: p.amountPaise,
    currency: p.currency,
    status: p.status,
    method: p.method,
    mode: p.mode,
    signatureVerified: p.signatureVerified,
    webhookVerified: p.webhookVerified,
    failureReason: p.failureReason,
    refundId: p.refundId,
    paidAt: p.paidAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  }));
}

export async function refundPayment(actor: Actor & { user: User }, paymentId: string, reason: string) {
  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(paymentsTable).where(eq(paymentsTable.id, paymentId)).for("update");
    if (!p) throw notFound("Payment not found");
    if (p.status === "REFUNDED") return { alreadyRefunded: true, refundId: p.refundId };
    if (!p.razorpayPaymentId || (p.status !== "PAID" && p.status !== "REFUND_PENDING")) throw conflict("Only a captured payment can be refunded", "NOT_REFUNDABLE");
    if (p.refundId) return { alreadyRefunded: false, refundId: p.refundId, pending: true }; // one refund per payment; wait for refund.processed
    const rf = await razorpay.refund(p.razorpayPaymentId, p.amountPaise, { reason: reason.slice(0, 200), seedchainPaymentId: p.id });
    const done = rf.status === "processed";
    const now = new Date();
    await tx.update(paymentsTable).set({ status: done ? "REFUNDED" : "REFUND_PENDING", refundId: rf.id, refundAmountPaise: rf.amount, refundedAt: done ? now : null, updatedAt: now }).where(eq(paymentsTable.id, p.id));
    await tx.update(ordersTable).set({ paymentStatus: done ? "REFUNDED" : "REFUND_PENDING", updatedAt: now }).where(eq(ordersTable.id, p.orderId));
    await audit(tx, actor, "PAYMENT_REFUND_REQUESTED", "payment", p.id, { status: p.status }, { refundId: rf.id, status: rf.status, reason });
    await notifyChange(tx, { topic: "orders", entityId: p.orderId });
    return { alreadyRefunded: false, refundId: rf.id, pending: !done };
  });
}
