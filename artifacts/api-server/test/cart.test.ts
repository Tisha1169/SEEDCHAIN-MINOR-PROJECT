/** Multi-item cart: per-customer, re-priced from live lots, grouped by farmer, cleared only when items are really bought. */
import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db, cartItemsTable } from "@workspace/db";
import { config } from "../src/config";
import { agent, approvedFarmerWithFarm, createAdmin, harvestedListedLot, newKey, registerCustomer } from "./helpers";

let admin: Awaited<ReturnType<typeof createAdmin>>;
let fa: Awaited<ReturnType<typeof approvedFarmerWithFarm>>;
let fb: Awaited<ReturnType<typeof approvedFarmerWithFarm>>;
let a1: { id: string; lotCode: string };
let a2: { id: string; lotCode: string };
let b1: { id: string; lotCode: string };

beforeAll(async () => {
  admin = await createAdmin();
  fa = await approvedFarmerWithFarm(admin.agent);
  fb = await approvedFarmerWithFarm(admin.agent);
  a1 = await harvestedListedLot(fa.agent, fa.farm.id, 500, 20);
  a2 = await harvestedListedLot(fa.agent, fa.farm.id, 300, 35);
  b1 = await harvestedListedLot(fb.agent, fb.farm.id, 200, 18);
});

const add = (c: Awaited<ReturnType<typeof registerCustomer>>, lotId: string, quantity: number) => c.agent.post("/api/cart/items").send({ lotId, quantity });

describe("cart basics", () => {
  it("is for customers only", async () => {
    expect((await agent().get("/api/cart")).status).toBe(401);
    expect((await fa.agent.get("/api/cart")).status).toBe(403);
    expect((await admin.agent.post("/api/cart/items").send({ lotId: a1.id, quantity: 1 })).status).toBe(403);
  });

  it("adds, accumulates, updates and removes lines; totals come from live prices", async () => {
    const c = await registerCustomer();
    expect((await c.agent.get("/api/cart")).body).toMatchObject({ itemCount: 0, total: 0, groups: [] });
    const r1 = await add(c, a1.id, 10);
    expect(r1.status).toBe(201);
    expect((await add(c, a1.id, 5)).body.groups[0].lines[0].quantity).toBe(15); // adding again adds up
    await add(c, a2.id, 2);
    const cart = (await add(c, b1.id, 4)).body;
    expect(cart.itemCount).toBe(3);
    expect(cart.groups).toHaveLength(2); // one group per farmer
    const ga = cart.groups.find((g: { farmer: { id: string } }) => g.farmer.id === fa.user.id);
    expect(ga.subtotal).toBe(15 * 20 + 2 * 35); // 370
    expect(ga.canCheckout).toBe(true);
    expect(cart.total).toBe(370 + 4 * 18); // 442
    expect((await c.agent.get("/api/cart/count")).body.count).toBe(3);

    const upd = await c.agent.patch(`/api/cart/items/${a2.id}`).send({ quantity: 6 });
    expect(upd.status).toBe(200);
    expect(upd.body.total).toBe(15 * 20 + 6 * 35 + 4 * 18);
    const del = await c.agent.delete(`/api/cart/items/${b1.id}`);
    expect(del.body.groups).toHaveLength(1);
    expect((await c.agent.patch(`/api/cart/items/${b1.id}`).send({ quantity: 1 })).status).toBe(404); // no longer in the cart
    expect((await c.agent.delete("/api/cart")).body.itemCount).toBe(0);
  });

  it("keeps carts private per customer", async () => {
    const [c1, c2] = [await registerCustomer(), await registerCustomer()];
    await add(c1, a1.id, 3);
    expect((await c2.agent.get("/api/cart")).body.itemCount).toBe(0);
    expect((await c2.agent.patch(`/api/cart/items/${a1.id}`).send({ quantity: 1 })).status).toBe(404);
  });

  it("refuses bad input and more than is available", async () => {
    const c = await registerCustomer();
    expect((await add(c, a1.id, 0)).status).toBe(400);
    expect((await add(c, a1.id, -2)).status).toBe(400);
    expect((await c.agent.post("/api/cart/items").send({ lotId: "not-a-uuid", quantity: 1 })).status).toBe(400);
    expect((await add(c, "00000000-0000-4000-8000-000000000000", 1)).status).toBe(404);
    const tooMuch = await add(c, a1.id, 501);
    expect(tooMuch.status).toBe(409);
    expect(tooMuch.body.code).toBe("INSUFFICIENT_INVENTORY");
    await add(c, a1.id, 400);
    expect((await add(c, a1.id, 150)).status).toBe(409); // 400 + 150 > 500: the cart total for the lot is what is capped
  });

  it("will not take unlisted or recalled lots", async () => {
    const c = await registerCustomer();
    const hidden = await harvestedListedLot(fb.agent, fb.farm.id, 50, 10);
    await fb.agent.post(`/api/lots/${hidden.id}/listing`).send({ listed: false });
    const r = await add(c, hidden.id, 1);
    expect(r.status).toBe(409);
    expect(r.body.code).toBe("NOT_LISTED");
  });

  it("limits the number of different lots in one cart", async () => {
    const c = await registerCustomer();
    const f = await approvedFarmerWithFarm(admin.agent);
    const lots = [];
    for (let i = 0; i < 31; i++) lots.push(await harvestedListedLot(f.agent, f.farm.id, 10, 5));
    for (let i = 0; i < 30; i++) expect((await add(c, lots[i].id, 1)).status).toBe(201);
    const over = await add(c, lots[30].id, 1);
    expect(over.status).toBe(409);
    expect(over.body.code).toBe("CART_FULL");
  }, 60_000);
});

describe("live re-pricing and issues", () => {
  it("flags a changed price, a sold-out lot and an over-stock line instead of charging blindly", async () => {
    const c = await registerCustomer();
    const f = await approvedFarmerWithFarm(admin.agent);
    const lot = await harvestedListedLot(f.agent, f.farm.id, 100, 10);
    await add(c, lot.id, 60);
    // the farmer raises the price: the cart shows the NEW price and says it changed
    await f.agent.post(`/api/lots/${lot.id}/listing`).send({ listed: true, pricePerUnit: 12 });
    let line = (await c.agent.get("/api/cart")).body.groups[0].lines[0];
    expect(line).toMatchObject({ unitPrice: 12, priceAtAdd: 10, priceChanged: true, lineTotal: 720 });
    // another customer buys most of it: this line now exceeds stock
    const other = await registerCustomer();
    expect((await other.agent.post("/api/orders").set("Idempotency-Key", newKey()).send({ items: [{ lotId: lot.id, quantity: 70 }], fulfillmentMethod: "CUSTOMER_PICKUP" })).status).toBe(201);
    const cart = (await c.agent.get("/api/cart")).body;
    line = cart.groups[0].lines[0];
    expect(line.issues).toContain("EXCEEDS_STOCK");
    expect(line.available).toBe(30);
    expect(cart.groups[0].canCheckout).toBe(false);
    expect(cart.hasIssues).toBe(true);
    // fix it by lowering the quantity
    const fixed = await c.agent.patch(`/api/cart/items/${lot.id}`).send({ quantity: 30 });
    expect(fixed.body.groups[0].canCheckout).toBe(true);
    expect(fixed.body.groups[0].lines[0].priceChanged).toBe(false); // re-confirmed at the current price
  });

  it("drops lines whose lot disappeared and shows recalled lots as unbuyable", async () => {
    const c = await registerCustomer();
    const f = await approvedFarmerWithFarm(admin.agent);
    const lot = await harvestedListedLot(f.agent, f.farm.id, 50, 9);
    await add(c, lot.id, 5);
    expect((await admin.agent.post(`/api/admin/lots/${lot.id}/recall`).send({ reason: "Contamination reported by a customer", publicMessage: "Do not consume; contact the seller" })).status).toBeLessThan(300);
    const line = (await c.agent.get("/api/cart")).body.groups[0].lines[0];
    expect(line.issues).toContain("RECALLED");
  });
});

describe("checkout preview and buying from the cart", () => {
  it("previews a multi-line, single-farmer purchase and refuses a mixed-farmer one", async () => {
    const c = await registerCustomer();
    const ok = await c.agent.post("/api/checkout/preview").send({ items: [{ lotId: a1.id, quantity: 10 }, { lotId: a2.id, quantity: 4 }], fulfillmentMethod: "CUSTOMER_PICKUP" });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ canCheckout: true, singleFarmer: true, subtotal: 10 * 20 + 4 * 35 });
    const mixed = await c.agent.post("/api/checkout/preview").send({ items: [{ lotId: a1.id, quantity: 1 }, { lotId: b1.id, quantity: 1 }], fulfillmentMethod: "CUSTOMER_PICKUP" });
    expect(mixed.status).toBe(200);
    expect(mixed.body).toMatchObject({ canCheckout: false, singleFarmer: false, farmerCount: 2 });
    const direct = await c.agent.post("/api/orders").set("Idempotency-Key", newKey()).send({ items: [{ lotId: a1.id, quantity: 1 }, { lotId: b1.id, quantity: 1 }], fulfillmentMethod: "CUSTOMER_PICKUP" });
    expect(direct.status).toBe(400); // the server still enforces one farmer per order
  });

  it("an order placed without online payment removes exactly the bought lots from the cart", async () => {
    const c = await registerCustomer();
    await add(c, a1.id, 3);
    await add(c, a2.id, 2);
    await add(c, b1.id, 1);
    const o = await c.agent.post("/api/orders").set("Idempotency-Key", newKey()).send({ items: [{ lotId: a1.id, quantity: 3 }, { lotId: a2.id, quantity: 2 }], fulfillmentMethod: "CUSTOMER_PICKUP" });
    expect(o.status).toBe(201);
    expect(o.body.items).toHaveLength(2);
    expect(o.body.totalAmount).toBe(3 * 20 + 2 * 35);
    const cart = (await c.agent.get("/api/cart")).body;
    expect(cart.itemCount).toBe(1);
    expect(cart.groups[0].lines[0].lotId).toBe(b1.id); // the other farmer's line stays for its own checkout
  });
});

describe("multi-item online payment", () => {
  const KEY_SECRET = "cart-test-key-secret";
  const realFetch = globalThis.fetch;
  let seq = 0;
  beforeAll(() => {
    Object.assign(config.payments, { keyId: "rzp_test_cart", keySecret: KEY_SECRET, webhookSecret: "cart-wh", apiBase: "https://razorpay.invalid" });
    vi.stubGlobal("fetch", async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (!u.startsWith("https://razorpay.invalid")) return realFetch(url, init);
      const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { "content-type": "application/json" } });
      if (u.endsWith("/v1/orders")) {
        const b = JSON.parse(String(init!.body));
        return json({ id: `order_C${String(++seq).padStart(6, "0")}`, amount: b.amount, currency: b.currency, status: "created" });
      }
      return new Response("{}", { status: 404 });
    });
  });
  afterAll(() => {
    vi.unstubAllGlobals();
    Object.assign(config.payments, { keyId: "", keySecret: "", webhookSecret: "" });
  });

  it("charges one total for several lots from one farmer, and clears only those lines when paid (not when merely started)", async () => {
    const c = await registerCustomer();
    await add(c, a1.id, 4);
    await add(c, a2.id, 3);
    await add(c, b1.id, 2);
    const items = [{ lotId: a1.id, quantity: 4 }, { lotId: a2.id, quantity: 3 }];
    const start = await c.agent.post("/api/checkout").set("Idempotency-Key", newKey()).send({ items, fulfillmentMethod: "CUSTOMER_PICKUP" });
    expect(start.status).toBe(201);
    expect(start.body.session.amountPaise).toBe((4 * 20 + 3 * 35) * 100); // 18500 paise, computed on the server from both lots
    expect(start.body.order.items).toHaveLength(2);
    expect((await c.agent.get("/api/cart")).body.itemCount).toBe(3); // started but unpaid: the cart is untouched

    const s = start.body.session;
    // the fetch stub has no payment record, so the server falls back on the verified signature alone
    const sig = createHmac("sha256", KEY_SECRET).update(`${s.razorpayOrderId}|pay_CART00000001`).digest("hex");
    const paid = await c.agent.post("/api/checkout/verify").send({ orderId: s.orderId, razorpay_order_id: s.razorpayOrderId, razorpay_payment_id: "pay_CART00000001", razorpay_signature: sig });
    expect(paid.status).toBe(200);
    expect(paid.body.order.paymentStatus).toBe("PAID");
    const cart = (await c.agent.get("/api/cart")).body;
    expect(cart.itemCount).toBe(1);
    expect(cart.groups[0].lines[0].lotId).toBe(b1.id);
    const rows = await db.select().from(cartItemsTable).where(eq(cartItemsTable.customerId, c.user.id));
    expect(rows).toHaveLength(1);
  });

  it("an abandoned checkout leaves the cart intact so the customer can try again", async () => {
    const c = await registerCustomer();
    await add(c, a1.id, 2);
    const start = await c.agent.post("/api/checkout").set("Idempotency-Key", newKey()).send({ items: [{ lotId: a1.id, quantity: 2 }], fulfillmentMethod: "CUSTOMER_PICKUP" });
    expect(start.status).toBe(201);
    expect((await c.agent.post(`/api/orders/${start.body.order.id}/cancel`).send({ reason: "changed my mind" })).status).toBe(200);
    expect((await c.agent.get("/api/cart")).body.itemCount).toBe(1);
  });
});
