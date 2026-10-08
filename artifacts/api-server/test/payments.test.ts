/**
 * Razorpay checkout, verification and webhooks against the real app and Postgres.
 * Razorpay's HTTP API is replaced by an in-process stub; signatures are real HMAC-SHA256 computed with the test secrets.
 */
import { createHmac } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import request from "supertest";
import { db, ordersTable, paymentsTable } from "@workspace/db";
import { config } from "../src/config";
import { expireUnpaidOrders } from "../src/services/payments";
import { agent, app, approvedFarmerWithFarm, createAdmin, harvestedListedLot, newKey, registerCustomer } from "./helpers";

const KEY_SECRET = "unit-test-key-secret-not-real";
const WH_SECRET = "unit-test-webhook-secret-not-real";

// ---- Razorpay stub -------------------------------------------------------------------------------------
const rzp = {
  orders: new Map<string, { id: string; amount: number; currency: string; receipt: string }>(),
  payments: new Map<string, { id: string; order_id: string; amount: number; currency: string; status: string; method: string }>(),
  failCreate: false,
  refunds: [] as { paymentId: string; amount: number }[],
  seq: 0,
};
const realFetch = globalThis.fetch;
function stubFetch() {
  vi.stubGlobal("fetch", async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    if (!u.startsWith(config.payments.apiBase)) return realFetch(url, init);
    const path = u.slice(config.payments.apiBase.length);
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    const auth = (init?.headers as Record<string, string>)?.authorization ?? "";
    if (auth !== `Basic ${Buffer.from(`${config.payments.keyId}:${config.payments.keySecret}`).toString("base64")}`) return json(401, { error: { code: "BAD_REQUEST_ERROR", description: "Authentication failed" } });
    if (path === "/v1/orders" && init?.method === "POST") {
      if (rzp.failCreate) return json(500, { error: { code: "SERVER_ERROR", description: "gateway down" } });
      const b = JSON.parse(String(init.body));
      const o = { id: `order_T${String(++rzp.seq).padStart(6, "0")}`, amount: b.amount, currency: b.currency, receipt: b.receipt, status: "created" };
      rzp.orders.set(o.id, o);
      return json(200, o);
    }
    const pm = path.match(/^\/v1\/payments\/([^/]+)$/);
    if (pm && init?.method === "GET") {
      const p = rzp.payments.get(pm[1]);
      return p ? json(200, p) : json(404, { error: { code: "BAD_REQUEST_ERROR", description: "not found" } });
    }
    const rf = path.match(/^\/v1\/payments\/([^/]+)\/refund$/);
    if (rf && init?.method === "POST") {
      const b = JSON.parse(String(init.body));
      rzp.refunds.push({ paymentId: rf[1], amount: b.amount });
      return json(200, { id: `rfnd_T${rzp.refunds.length}`, payment_id: rf[1], amount: b.amount, status: "processed" });
    }
    return json(404, {});
  });
}

const sign = (orderId: string, paymentId: string, secret = KEY_SECRET) => createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
let evtSeq = 0;
function webhook(event: string, payment: Record<string, unknown> | null, opts: { eventId?: string; secret?: string; refund?: Record<string, unknown> } = {}) {
  const body = JSON.stringify({ event, payload: { ...(payment ? { payment: { entity: payment } } : {}), ...(opts.refund ? { refund: { entity: opts.refund } } : {}) } });
  const sig = createHmac("sha256", opts.secret ?? WH_SECRET).update(body).digest("hex");
  // Plain supertest on purpose: no CSRF header, no cookies. A webhook is authenticated by its signature only.
  return request(app).post("/api/webhooks/razorpay").set("content-type", "application/json").set("x-razorpay-signature", sig).set("x-razorpay-event-id", opts.eventId ?? `evt_${Date.now()}_${++evtSeq}`).send(body);
}
const capturedEntity = (rpOrderId: string, rpPaymentId: string, amount: number, extra: Record<string, unknown> = {}) => ({ id: rpPaymentId, order_id: rpOrderId, amount, currency: "INR", status: "captured", method: "upi", ...extra });

// ---- fixtures -----------------------------------------------------------------------------------------
let admin: Awaited<ReturnType<typeof createAdmin>>;
let farmer: Awaited<ReturnType<typeof approvedFarmerWithFarm>>;
let lot: { id: string; lotCode: string };
const cart = (qty: number, extra: Record<string, unknown> = {}) => ({ items: [{ lotId: lot.id, quantity: qty }], fulfillmentMethod: "CUSTOMER_PICKUP", ...extra });
const checkout = (c: Awaited<ReturnType<typeof registerCustomer>>, qty: number, key = newKey(), extra: Record<string, unknown> = {}) =>
  c.agent.post("/api/checkout").set("Idempotency-Key", key).send(cart(qty, extra));
async function available() {
  const r = await farmer.agent.get(`/api/lots/${lot.id}`);
  return r.body.inventory.available as number;
}
async function pay(c: Awaited<ReturnType<typeof registerCustomer>>, session: { orderId: string; razorpayOrderId: string; amountPaise: number }, paymentId: string) {
  rzp.payments.set(paymentId, { id: paymentId, order_id: session.razorpayOrderId, amount: session.amountPaise, currency: "INR", status: "captured", method: "upi" });
  return c.agent.post("/api/checkout/verify").send({ orderId: session.orderId, razorpay_order_id: session.razorpayOrderId, razorpay_payment_id: paymentId, razorpay_signature: sign(session.razorpayOrderId, paymentId) });
}

beforeAll(async () => {
  Object.assign(config.payments, { keyId: "rzp_test_unitkey", keySecret: KEY_SECRET, webhookSecret: WH_SECRET, apiBase: "https://razorpay.invalid" });
  stubFetch();
  admin = await createAdmin();
  farmer = await approvedFarmerWithFarm(admin.agent);
  const l = await harvestedListedLot(farmer.agent, farmer.farm.id, 1000, 22.5);
  lot = { id: l.id, lotCode: l.lotCode };
});
afterAll(() => {
  vi.unstubAllGlobals();
  Object.assign(config.payments, { keyId: "", keySecret: "", webhookSecret: "" });
});
beforeEach(() => {
  rzp.failCreate = false;
});

describe("configuration and the no-bypass rule", () => {
  it("exposes only the public key id, never the secret", async () => {
    const r = await agent().get("/api/payments/config");
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ enabled: true, keyId: "rzp_test_unitkey", mode: "test", currency: "INR" });
    expect(JSON.stringify(r.body)).not.toContain(KEY_SECRET);
    expect(JSON.stringify(r.body)).not.toContain(WH_SECRET);
  });
  it("refuses plain orders while payments are on, so paying cannot be skipped", async () => {
    const c = await registerCustomer();
    const r = await c.agent.post("/api/orders").set("Idempotency-Key", newKey()).send(cart(5));
    expect(r.status).toBe(409);
    expect(r.body.code).toBe("PAYMENT_REQUIRED");
  });
});

describe("checkout", () => {
  it("computes the total on the server, holds stock, and hides the order from the farmer until paid", async () => {
    const c = await registerCustomer();
    const before = await available();
    // The client tries to dictate the price: unknown fields are ignored; the amount comes from the lot's price.
    const r = await checkout(c, 10, newKey(), { totalAmount: 1, amountPaise: 100, unitPrice: 0.01 });
    expect(r.status).toBe(201);
    expect(r.body.session.amountPaise).toBe(22500); // 10 kg x 22.50 = 225.00 INR
    expect(rzp.orders.get(r.body.session.razorpayOrderId)?.amount).toBe(22500);
    expect(r.body.session.keyId).toBe("rzp_test_unitkey");
    expect(JSON.stringify(r.body)).not.toContain(KEY_SECRET);
    expect(r.body.order.paymentStatus).toBe("PAYMENT_PENDING");
    expect(await available()).toBe(before - 10);

    expect((await farmer.agent.get("/api/orders")).body.some((o: { id: string }) => o.id === r.body.order.id)).toBe(false);
    expect((await farmer.agent.get(`/api/orders/${r.body.order.id}`)).status).toBe(404);
    const adminAccept = await admin.agent.post(`/api/orders/${r.body.order.id}/accept`).send({});
    expect(adminAccept.status).toBe(409);
    expect(adminAccept.body.code).toBe("AWAITING_PAYMENT");
  });

  it("is idempotent: the same Idempotency-Key gives the same order and the same Razorpay order", async () => {
    const c = await registerCustomer();
    const key = newKey();
    const before = await available();
    const [a, b] = await Promise.all([checkout(c, 4, key), checkout(c, 4, key)]);
    expect([a.status, b.status].every((s) => s === 201)).toBe(true);
    expect(a.body.order.id).toBe(b.body.order.id);
    expect(a.body.session.razorpayOrderId).toBe(b.body.session.razorpayOrderId);
    expect(await available()).toBe(before - 4); // held once, not twice
    const rows = await db.select().from(paymentsTable).where(eq(paymentsTable.orderId, a.body.order.id));
    expect(rows).toHaveLength(1);
  });

  it("never oversells: held stock counts, and the last kilos go to exactly one buyer", async () => {
    const f2 = await approvedFarmerWithFarm(admin.agent);
    const small = await harvestedListedLot(f2.agent, f2.farm.id, 30, 10);
    const [c1, c2] = [await registerCustomer(), await registerCustomer()];
    const go = (c: typeof c1) => c.agent.post("/api/checkout").set("Idempotency-Key", newKey()).send({ items: [{ lotId: small.id, quantity: 20 }], fulfillmentMethod: "CUSTOMER_PICKUP" });
    const [r1, r2] = await Promise.all([go(c1), go(c2)]);
    expect([r1.status, r2.status].sort()).toEqual([201, 409]);
    const lose = [r1, r2].find((r) => r.status === 409)!;
    expect(lose.body.code).toBe("INSUFFICIENT_INVENTORY");
  });

  it("releases the hold if the gateway is down, instead of leaking reserved stock", async () => {
    const c = await registerCustomer();
    const before = await available();
    rzp.failCreate = true;
    const r = await checkout(c, 6);
    expect(r.status).toBe(502);
    expect(await available()).toBe(before);
    const mine = await c.agent.get("/api/orders");
    expect(mine.body[0].status).toBe("CANCELLED");
    expect(mine.body[0].paymentStatus).toBe("PAYMENT_CANCELLED");
  });

  it("rejects bad input before touching the gateway", async () => {
    const c = await registerCustomer();
    expect((await c.agent.post("/api/checkout").send(cart(5))).status).toBe(400); // no Idempotency-Key
    expect((await checkout(c, 0)).status).toBe(400);
    expect((await checkout(c, -3)).status).toBe(400);
    expect((await agent().post("/api/checkout").set("Idempotency-Key", newKey()).send(cart(5))).status).toBe(401);
    expect((await farmer.agent.post("/api/checkout").set("Idempotency-Key", newKey()).send(cart(5))).status).toBe(403);
    expect((await checkout(c, 5, newKey(), { fulfillmentMethod: "FARMER_DELIVERY" })).status).toBe(400); // address required
  });
});

describe("browser callback verification", () => {
  it("rejects a forged signature and a swapped Razorpay order id, and stays unpaid", async () => {
    const c = await registerCustomer();
    const r = await checkout(c, 3);
    const s = r.body.session;
    const forged = await c.agent.post("/api/checkout/verify").send({ orderId: s.orderId, razorpay_order_id: s.razorpayOrderId, razorpay_payment_id: "pay_FORGED000001", razorpay_signature: "0".repeat(64) });
    expect(forged.status).toBe(400);
    expect(forged.body.code).toBe("INVALID_SIGNATURE");
    const swapped = await c.agent.post("/api/checkout/verify").send({ orderId: s.orderId, razorpay_order_id: "order_SOMEONEELSE1", razorpay_payment_id: "pay_X00000000001", razorpay_signature: sign("order_SOMEONEELSE1", "pay_X00000000001") });
    expect(swapped.status).toBe(400);
    expect(swapped.body.code).toBe("PAYMENT_ORDER_MISMATCH");
    expect((await c.agent.get(`/api/orders/${s.orderId}`)).body.paymentStatus).toBe("PAYMENT_PENDING");
    const [o] = await db.select().from(ordersTable).where(eq(ordersTable.id, s.orderId));
    expect(o.paymentStatus).toBe("PAYMENT_PENDING");
  });

  it("a valid signature for ANOTHER customer's checkout cannot pay this one", async () => {
    const [a, b] = [await registerCustomer(), await registerCustomer()];
    const ra = await checkout(a, 2);
    const rb = await checkout(b, 2);
    rzp.payments.set("pay_A0000000001", { id: "pay_A0000000001", order_id: ra.body.session.razorpayOrderId, amount: ra.body.session.amountPaise, currency: "INR", status: "captured", method: "card" });
    // b presents a's real payment against b's own order id
    const r = await b.agent.post("/api/checkout/verify").send({ orderId: rb.body.session.orderId, razorpay_order_id: rb.body.session.razorpayOrderId, razorpay_payment_id: "pay_A0000000001", razorpay_signature: sign(ra.body.session.razorpayOrderId, "pay_A0000000001") });
    expect(r.status).toBe(400);
    // and a customer cannot verify someone else's order at all
    const cross = await b.agent.post("/api/checkout/verify").send({ orderId: ra.body.session.orderId, razorpay_order_id: ra.body.session.razorpayOrderId, razorpay_payment_id: "pay_A0000000001", razorpay_signature: sign(ra.body.session.razorpayOrderId, "pay_A0000000001") });
    expect(cross.status).toBe(404);
  });

  it("marks the order PAID, shows it to the farmer, and a repeated callback changes nothing", async () => {
    const c = await registerCustomer();
    const r = await checkout(c, 8);
    const s = r.body.session;
    const first = await pay(c, s, "pay_OK000000001");
    expect(first.status).toBe(200);
    expect(first.body.outcome).toBe("APPLIED");
    expect(first.body.order.paymentStatus).toBe("PAID");
    expect(first.body.order.payment).toMatchObject({ status: "PAID", method: "upi", razorpayPaymentId: "pay_OK000000001" });

    const again = await pay(c, s, "pay_OK000000001");
    expect(again.status).toBe(200);
    expect(again.body.outcome).toBe("DUPLICATE_STATE");

    const seen = await farmer.agent.get(`/api/orders/${s.orderId}`);
    expect(seen.status).toBe(200);
    expect(seen.body.paymentStatus).toBe("PAID");
    expect(seen.body.payment.razorpayPaymentId).toBeNull(); // the farmer learns "paid", not the gateway ids
    expect(seen.body.payment.signatureVerified).toBeNull();
    const accepted = await farmer.agent.post(`/api/orders/${s.orderId}/accept`).send({});
    expect(accepted.status).toBe(200);
    const adminView = await admin.agent.get(`/api/orders/${s.orderId}`);
    expect(adminView.body.payment).toMatchObject({ signatureVerified: true, razorpayPaymentId: "pay_OK000000001" });
  });

  it("refuses to mark paid when the gateway's own record disagrees on the amount", async () => {
    const c = await registerCustomer();
    const r = await checkout(c, 2);
    const s = r.body.session;
    rzp.payments.set("pay_SHORT000001", { id: "pay_SHORT000001", order_id: s.razorpayOrderId, amount: 100, currency: "INR", status: "captured", method: "upi" });
    const res = await c.agent.post("/api/checkout/verify").send({ orderId: s.orderId, razorpay_order_id: s.razorpayOrderId, razorpay_payment_id: "pay_SHORT000001", razorpay_signature: sign(s.razorpayOrderId, "pay_SHORT000001") });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("PAYMENT_MISMATCH");
    expect((await c.agent.get(`/api/orders/${s.orderId}`)).body.paymentStatus).toBe("PAYMENT_PENDING");
  });
});

describe("webhooks", () => {
  it("rejects a bad signature, and is not subject to the cookie CSRF rule", async () => {
    const bad = await webhook("payment.captured", capturedEntity("order_x", "pay_x", 100), { secret: "wrong-secret" });
    expect(bad.status).toBe(400);
    const noHeaders = await request(app).post("/api/webhooks/razorpay").set("content-type", "application/json").send("{}");
    expect(noHeaders.status).toBe(400);
  });

  it("payment.captured marks the order paid even if the browser never came back, and redelivery is a no-op", async () => {
    const c = await registerCustomer();
    const s = (await checkout(c, 5)).body.session;
    const eventId = `evt_fixed_${Date.now()}`;
    const first = await webhook("payment.captured", capturedEntity(s.razorpayOrderId, "pay_WH0000000001", s.amountPaise), { eventId });
    expect(first.status).toBe(200);
    expect(first.body.outcome).toBe("APPLIED");
    const [p] = await db.select().from(paymentsTable).where(eq(paymentsTable.razorpayOrderId, s.razorpayOrderId));
    expect(p).toMatchObject({ status: "PAID", webhookVerified: true, signatureVerified: false, method: "upi", razorpayPaymentId: "pay_WH0000000001" });

    const replay = await webhook("payment.captured", capturedEntity(s.razorpayOrderId, "pay_WH0000000001", s.amountPaise), { eventId });
    expect(replay.status).toBe(200);
    expect(replay.body.outcome).toBe("DUPLICATE_EVENT");
    // A *different* event id for the same capture is also harmless
    const second = await webhook("order.paid", capturedEntity(s.razorpayOrderId, "pay_WH0000000001", s.amountPaise));
    expect(second.body.outcome).toBe("DUPLICATE_STATE");
    // and the late browser callback after the webhook changes nothing
    const late = await pay(c, s, "pay_WH0000000001");
    expect(late.body.outcome).toBe("DUPLICATE_STATE");
    expect((await db.select().from(paymentsTable).where(eq(paymentsTable.orderId, s.orderId)))).toHaveLength(1);
    const [o] = await db.select().from(ordersTable).where(eq(ordersTable.id, s.orderId));
    expect(o.paymentStatus).toBe("PAID");
    const notes = await farmer.agent.get("/api/me/notifications");
    const forThisOrder = notes.body.items.filter((n: { type: string; entityId: string }) => n.type === "ORDER_NEW" && n.entityId === s.orderId);
    expect(forThisOrder).toHaveLength(1); // the farmer was told once, not once per delivery
  });

  it("concurrent duplicate deliveries of one event apply it exactly once", async () => {
    const c = await registerCustomer();
    const s = (await checkout(c, 1)).body.session;
    const eventId = `evt_race_${Date.now()}`;
    const ent = capturedEntity(s.razorpayOrderId, "pay_RACE0000001", s.amountPaise);
    const rs = await Promise.all([webhook("payment.captured", ent, { eventId }), webhook("payment.captured", ent, { eventId }), webhook("payment.captured", ent, { eventId })]);
    expect(rs.every((r) => r.status === 200)).toBe(true);
    expect(rs.filter((r) => r.body.outcome === "APPLIED")).toHaveLength(1);
    const n = await db.execute(sql`SELECT count(*)::int AS n FROM payment_events WHERE event_id = ${eventId}`);
    expect((n.rows[0] as { n: number }).n).toBe(1);
  });

  it("an amount mismatch is recorded and alerted, never applied", async () => {
    const c = await registerCustomer();
    const s = (await checkout(c, 3)).body.session;
    const r = await webhook("payment.captured", capturedEntity(s.razorpayOrderId, "pay_MIS000000001", 100));
    expect(r.body.outcome).toBe("MISMATCH");
    const [o] = await db.select().from(ordersTable).where(eq(ordersTable.id, s.orderId));
    expect(o.paymentStatus).toBe("PAYMENT_PENDING");
    const alerts = await admin.agent.get("/api/alerts?state=all");
    expect(alerts.body.some((a: { type: string; entityId: string }) => a.type === "PAYMENT_MISMATCH" && a.entityId === s.orderId)).toBe(true);
  });

  it("payment.failed leaves a retryable checkout; a later success still works; a stale failure after success is ignored", async () => {
    const c = await registerCustomer();
    const s = (await checkout(c, 2)).body.session;
    const failed = await webhook("payment.failed", { id: "pay_FAIL0000001", order_id: s.razorpayOrderId, amount: s.amountPaise, currency: "INR", status: "failed", method: "card", error_code: "BAD_REQUEST_ERROR", error_description: "Payment declined by bank" });
    expect(failed.body.outcome).toBe("APPLIED");
    const view = await c.agent.get(`/api/orders/${s.orderId}`);
    expect(view.body.paymentStatus).toBe("PAYMENT_FAILED");
    expect(view.body.payment.failureReason).toBe("Payment declined by bank");
    // retry uses the same Razorpay order and the same held stock
    const retry = await c.agent.get(`/api/checkout/${s.orderId}/session`);
    expect(retry.status).toBe(200);
    expect(retry.body.razorpayOrderId).toBe(s.razorpayOrderId);
    expect((await pay(c, s, "pay_RETRY000001")).body.order.paymentStatus).toBe("PAID");
    const stale = await webhook("payment.failed", { id: "pay_FAIL0000001", order_id: s.razorpayOrderId, amount: s.amountPaise, currency: "INR", status: "failed" });
    expect(stale.body.outcome).toBe("DUPLICATE_STATE");
    expect((await c.agent.get(`/api/orders/${s.orderId}`)).body.paymentStatus).toBe("PAID");
  });

  it("stores identifiers and status only: no raw payload, no card or UPI details", async () => {
    const c = await registerCustomer();
    const s = (await checkout(c, 1)).body.session;
    await webhook("payment.captured", capturedEntity(s.razorpayOrderId, "pay_PRIV0000001", s.amountPaise, { card: { last4: "4242", network: "Visa", name: "A Customer" }, vpa: "someone@upi", email: "x@example.test", contact: "+919999999999" }));
    const ev = await db.execute(sql`SELECT summary::text AS s FROM payment_events WHERE razorpay_payment_id = 'pay_PRIV0000001'`);
    const text = (ev.rows[0] as { s: string }).s;
    for (const secretish of ["4242", "Visa", "someone@upi", "x@example.test", "9999999999"]) expect(text).not.toContain(secretish);
  });
});

describe("abandoned checkout, late payment, refunds", () => {
  it("releases held stock when the window passes, and further payment attempts are refused", async () => {
    const c = await registerCustomer();
    const before = await available();
    const s = (await checkout(c, 12)).body.session;
    expect(await available()).toBe(before - 12);
    await db.execute(sql`UPDATE orders SET payment_due_at = now() - interval '1 minute' WHERE id = ${s.orderId}`);
    expect(await expireUnpaidOrders()).toBeGreaterThanOrEqual(1);
    expect(await available()).toBe(before);
    const o = (await c.agent.get(`/api/orders/${s.orderId}`)).body;
    expect(o).toMatchObject({ status: "CANCELLED", paymentStatus: "PAYMENT_CANCELLED" });
    expect((await c.agent.get(`/api/checkout/${s.orderId}/session`)).status).toBe(409);
    expect(await expireUnpaidOrders()).toBe(0); // idempotent
  });

  it("money arriving after expiry is flagged for refund, never fulfilled", async () => {
    const c = await registerCustomer();
    const s = (await checkout(c, 7)).body.session;
    await db.execute(sql`UPDATE orders SET payment_due_at = now() - interval '10 minutes' WHERE id = ${s.orderId}`);
    await expireUnpaidOrders();
    const before = await available();
    const r = await webhook("payment.captured", capturedEntity(s.razorpayOrderId, "pay_LATE0000001", s.amountPaise));
    expect(r.body.outcome).toBe("LATE_PAYMENT");
    expect(await available()).toBe(before); // stock stays released
    const o = (await c.agent.get(`/api/orders/${s.orderId}`)).body;
    expect(o).toMatchObject({ status: "CANCELLED", paymentStatus: "REFUND_PENDING" });
    const alerts = await admin.agent.get("/api/alerts?state=all");
    expect(alerts.body.some((a: { type: string; entityId: string }) => a.type === "REFUND_DUE" && a.entityId === s.orderId)).toBe(true);
  });

  it("customer can cancel an unpaid checkout, which frees the stock", async () => {
    const c = await registerCustomer();
    const before = await available();
    const s = (await checkout(c, 9)).body.session;
    const r = await c.agent.post(`/api/orders/${s.orderId}/cancel`).send({ reason: "Changed my mind" });
    expect(r.status).toBe(200);
    expect(r.body.paymentStatus).toBe("PAYMENT_CANCELLED");
    expect(await available()).toBe(before);
  });

  it("a farmer rejecting a PAID order moves it to REFUND_PENDING, and an admin refund goes through Razorpay once", async () => {
    const c = await registerCustomer();
    const s = (await checkout(c, 4)).body.session;
    await pay(c, s, "pay_REF0000001");
    const rej = await farmer.agent.post(`/api/orders/${s.orderId}/reject`).send({ reason: "Out of stock after all" });
    expect(rej.status).toBe(200);
    expect(rej.body.paymentStatus).toBe("REFUND_PENDING");

    const [p] = await db.select().from(paymentsTable).where(eq(paymentsTable.orderId, s.orderId));
    expect((await farmer.agent.post(`/api/admin/payments/${p.id}/refund`).send({ reason: "no way" })).status).toBe(403);
    const refund = await admin.agent.post(`/api/admin/payments/${p.id}/refund`).send({ reason: "Order rejected by farmer" });
    expect(refund.status).toBe(200);
    expect(rzp.refunds.filter((x) => x.paymentId === "pay_REF0000001")).toHaveLength(1);
    expect(rzp.refunds.at(-1)!.amount).toBe(s.amountPaise);
    const again = await admin.agent.post(`/api/admin/payments/${p.id}/refund`).send({ reason: "double click" });
    expect(again.body.alreadyRefunded).toBe(true);
    expect(rzp.refunds.filter((x) => x.paymentId === "pay_REF0000001")).toHaveLength(1); // no second refund
    expect((await c.agent.get(`/api/orders/${s.orderId}`)).body.paymentStatus).toBe("REFUNDED");
    const list = await admin.agent.get("/api/admin/payments");
    expect(list.status).toBe(200);
    expect((await c.agent.get("/api/admin/payments")).status).toBe(403);
  });
});

describe("inventory stays consistent through all of the above", () => {
  it("reserved + sold on every lot equals the open and confirmed order lines", async () => {
    const { checkInventoryIntegrity } = await import("../src/services/scheduler");
    expect(await checkInventoryIntegrity()).toBe(0);
  });
});
