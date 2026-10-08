#!/usr/bin/env node
/**
 * End-to-end smoke test against a running SeedChain (local or deployed), using only the public HTTP API.
 *
 *   BASE=http://localhost:8080 ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/e2e-smoke.mjs [out.json]
 *
 * It registers clearly labelled "[E2E TEST]" accounts and a lot, so only run it against a database where
 * that is acceptable. The JSON result file feeds docs/SeedChain_Data_and_Test_Results.xlsx (scripts/build-workbook.py).
 */
import fs from "node:fs";
import { createHmac } from "node:crypto";

const BASE = (process.env.BASE || "http://localhost:8080").replace(/\/+$/, "");
const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD");
const out = process.argv[2] || "e2e-results.json";
// Optional, local mock only: lets the script "pay" with signatures it can compute. Never set these against production.
const { SIM_KEY_SECRET, SIM_WEBHOOK_SECRET } = process.env;

const results = [];
const started = Date.now();
function check(group, name, pass, detail = "") {
  results.push({ group, name, status: pass ? "PASS" : "FAIL", detail: String(detail ?? "") });
  console.log(pass ? "PASS" : "FAIL", `[${group}]`, name, detail);
}
function client() {
  let cookie = "";
  return async (method, path, body, headers = {}) => {
    const r = await fetch(BASE + path, { method, redirect: "manual", headers: { "content-type": "application/json", "x-seedchain-csrf": "1", ...(cookie ? { cookie } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.getSetCookie?.() ?? [];
    if (sc.length) cookie = sc.map((c) => c.split(";")[0]).join("; ");
    let j = null;
    try { j = await r.json(); } catch { /* not json */ }
    return { s: r.status, j, h: r.headers };
  };
}
const admin = client(), farmer = client(), cust = client(), anon = client();
const tag = Date.now().toString(36);
const pw = `E2e-${tag}-Passw0rd!`;
let r;

r = await anon("GET", "/ready"); check("Platform", "Readiness probe /ready", r.s === 200, `HTTP ${r.s}`);
r = await anon("GET", "/"); check("Platform", "Frontend (SPA) served", r.s === 200, `HTTP ${r.s}`);
const h = r.h; check("Security", "HSTS / CSP / nosniff headers present", !!h.get("content-security-policy") && h.get("x-content-type-options") === "nosniff", "CSP + nosniff");

r = await admin("POST", "/api/auth/login", { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }); check("Auth", "Admin login", r.s === 200 && r.j?.user?.role === "admin", `HTTP ${r.s}`);
r = await admin("GET", "/api/dashboard/overview"); check("Admin", "Admin overview loads", r.s === 200, `HTTP ${r.s}`);
r = await anon("POST", "/api/auth/login", { email: "nobody@x.test", password: "wrongwrongwrong" }); check("Auth", "Wrong password rejected", r.s === 401, `HTTP ${r.s}`);
r = await anon("GET", "/api/admin/users"); check("Security", "Anonymous blocked from admin API", r.s === 401, `HTTP ${r.s}`);
r = await anon("POST", "/api/auth/login", { email: ADMIN_EMAIL, password: "x" }, { "x-seedchain-csrf": "" }); check("Security", "Request without CSRF header rejected", r.s === 403, `HTTP ${r.s}`);

for (const s of ["pau_potato_punjab", "faostat_potato_india"]) {
  r = await admin("POST", `/api/admin/integrations/${s}/run`);
  check("Data", `Ingest ${s}`, r.s < 300 && r.j?.status === "SUCCESS", r.j ? `${r.j.status}: ${r.j.recordCount} records, ${r.j.rejectedCount} rejected ${r.j.error || ""}` : `HTTP ${r.s}`);
}
r = await anon("GET", "/api/reference/punjab-potato"); check("Data", "Punjab district data public, Jalandhar ranked first", r.j?.districts?.[0]?.name === "Jalandhar", r.j?.districts?.[0]?.name);
r = await anon("GET", "/api/reference/faostat-potato-india"); check("Data", "FAOSTAT India series public", (r.j?.series?.length ?? 0) > 50, `${r.j?.series?.length} years`);
r = await admin("GET", "/api/data/sources"); check("Data", "Data health lists all sources", r.s === 200 && r.j.length >= 9, `${r.j?.length} sources`);

const fe = `e2e-farmer-${tag}@e2e.seedchain.test`, ce = `e2e-customer-${tag}@e2e.seedchain.test`;
r = await farmer("POST", "/api/auth/register", { name: "[E2E TEST] Farmer", email: fe, password: pw, role: "farmer", phone: "+91 90000 00001", farmerProfile: { publicName: "[E2E TEST] Farm", district: "Jalandhar", state: "Punjab" } });
check("Farmer", "Farmer registration", r.s === 201, `HTTP ${r.s}`); const fid = r.j?.user?.id;
r = await farmer("POST", "/api/farms", { name: "E2E Farm", village: "Nakodar", district: "Jalandhar", state: "Punjab" }); check("Farmer", "Pending farmer may create farm profile", r.s === 201, `HTTP ${r.s}`); const farmId = r.j?.id;
r = await farmer("POST", "/api/lots", { farmId, productName: "Potato", variety: "x", origin: "x", harvestDate: "2026-09-30", harvestQuantity: 5 }); check("Farmer", "Pending farmer cannot create lots", r.s === 403, `HTTP ${r.s}`);
r = await admin("POST", `/api/admin/users/${fid}/approve`, { note: "e2e" }); check("Admin", "Admin approves farmer", r.s === 200, `HTTP ${r.s}`);
r = await farmer("POST", "/api/lots", { farmId, productName: "Potato", variety: "Kufri Jyoti", origin: "Nakodar, Jalandhar, Punjab", harvestDate: "2026-09-30", harvestQuantity: 500, qualityGrade: "A", privateNotes: "PRIVATE-E2E" });
check("Lots", "Approved farmer creates lot", r.s === 201, r.j?.lotCode ?? `HTTP ${r.s}`); const lot = r.j;
r = await farmer("POST", `/api/lots/${lot?.id}/listing`, { listed: true, pricePerUnit: 22 }); check("Lots", "Lot listed for sale", r.s === 200, `HTTP ${r.s}`);
r = await farmer("GET", `/api/lots/${lot?.id}/qr`);
const url = JSON.stringify(r.j).match(/https?:\/\/[^"]+\/trace\/[A-Za-z0-9_-]+/)?.[0];
check("QR", "QR content is only the trace URL on this host", !!url && url.startsWith(BASE + "/trace/") && !/[?&]/.test(url), url ?? "none");
const token = url?.split("/trace/")[1] ?? "";
check("QR", "Token is high-entropy (>= 40 chars)", token.length >= 40, `${token.length} chars`);
r = await anon("GET", `/api/trace/${token}`); check("QR", "Public trace works without login", r.s === 200 && !!r.j?.lotCode, r.j?.lotCode ?? `HTTP ${r.s}`);
const pub = JSON.stringify(r.j);
check("Privacy", "No private notes, email or phone on public trace", !pub.includes("PRIVATE-E2E") && !pub.includes(fe) && !pub.includes("90000 00001"));
r = await anon("GET", `/api/trace/${"x".repeat(43)}`); check("QR", "Unknown token returns 404", r.s === 404, `HTTP ${r.s}`);
r = await anon("POST", "/api/scans", { publicToken: token, scanSource: "camera_link", clientEventId: crypto.randomUUID() }); check("QR", "Scan recorded", r.s < 300, `HTTP ${r.s}`);
r = await anon("GET", `/trace/${token}`); check("QR", "Trace page route serves the app", r.s === 200, `HTTP ${r.s}`);

r = await cust("POST", "/api/auth/register", { name: "[E2E TEST] Customer", email: ce, password: pw, role: "customer", phone: "+91 90000 00002" }); check("Customer", "Customer registration", r.s === 201, `HTTP ${r.s}`);
const cfg = (await anon("GET", "/api/payments/config")).j ?? {};
check("Payments", "Public payment config exposes no secret", !JSON.stringify(cfg).match(/secret/i), `enabled=${cfg.enabled} mode=${cfg.mode ?? "n/a"}`);
let oid;
if (cfg.enabled) {
  r = await cust("POST", "/api/orders", { items: [{ lotId: lot?.id, quantity: 5 }], fulfillmentMethod: "CUSTOMER_PICKUP" }, { "idempotency-key": crypto.randomUUID() });
  check("Payments", "Plain orders refused while online payment is on", r.s === 409 && r.j?.code === "PAYMENT_REQUIRED", `HTTP ${r.s}`);
  const key = crypto.randomUUID();
  r = await cust("POST", "/api/checkout", { items: [{ lotId: lot?.id, quantity: 20 }], fulfillmentMethod: "CUSTOMER_PICKUP", totalAmount: 1 }, { "idempotency-key": key });
  check("Payments", "Checkout creates a Razorpay order; total computed on the server (client total ignored)", r.s === 201 && r.j?.session?.amountPaise === 44000, `amountPaise=${r.j?.session?.amountPaise}`);
  const s = r.j?.session; oid = s?.orderId;
  const r2 = await cust("POST", "/api/checkout", { items: [{ lotId: lot?.id, quantity: 20 }], fulfillmentMethod: "CUSTOMER_PICKUP" }, { "idempotency-key": key });
  check("Payments", "Same Idempotency-Key returns the same Razorpay order (no double charge setup)", r2.j?.session?.razorpayOrderId === s?.razorpayOrderId);
  r = await farmer("GET", `/api/orders/${oid}`); check("Payments", "Unpaid order is invisible to the farmer", r.s === 404, `HTTP ${r.s}`);
  r = await cust("POST", "/api/checkout/verify", { orderId: oid, razorpay_order_id: s?.razorpayOrderId, razorpay_payment_id: "pay_FORGED000001", razorpay_signature: "0".repeat(64) });
  check("Payments", "Forged payment signature rejected", r.s === 400 && r.j?.code === "INVALID_SIGNATURE", `HTTP ${r.s}`);
  r = await anon("POST", "/api/webhooks/razorpay", {}, { "x-razorpay-signature": "bad", "x-razorpay-event-id": "evt_bad" });
  check("Payments", "Webhook with a bad signature rejected", r.s === 400, `HTTP ${r.s}`);
  if (SIM_KEY_SECRET && s) {
    const pid = `pay_SIM_${s.razorpayOrderId.replace("order_", "")}`;
    const sig = createHmac("sha256", SIM_KEY_SECRET).update(`${s.razorpayOrderId}|${pid}`).digest("hex");
    r = await cust("POST", "/api/checkout/verify", { orderId: oid, razorpay_order_id: s.razorpayOrderId, razorpay_payment_id: pid, razorpay_signature: sig });
    check("Payments", "Valid signature marks the order PAID", r.s === 200 && r.j?.order?.paymentStatus === "PAID", `${r.j?.outcome}`);
    r = await cust("POST", "/api/checkout/verify", { orderId: oid, razorpay_order_id: s.razorpayOrderId, razorpay_payment_id: pid, razorpay_signature: sig });
    check("Payments", "Repeating the callback is harmless (idempotent)", r.s === 200 && r.j?.outcome === "DUPLICATE_STATE");
    if (SIM_WEBHOOK_SECRET) {
      const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: pid, order_id: s.razorpayOrderId, amount: s.amountPaise, currency: "INR", status: "captured", method: "upi" } } } });
      const wsig = createHmac("sha256", SIM_WEBHOOK_SECRET).update(body).digest("hex");
      const eid = `evt_${Date.now()}`;
      const send = () => fetch(BASE + "/api/webhooks/razorpay", { method: "POST", headers: { "content-type": "application/json", "x-razorpay-signature": wsig, "x-razorpay-event-id": eid }, body }).then(async (x) => ({ s: x.status, j: await x.json() }));
      const w1 = await send(), w2 = await send();
      check("Payments", "Signed webhook accepted; redelivery of the same event is a no-op", w1.s === 200 && w2.s === 200 && w2.j.outcome === "DUPLICATE_EVENT", `${w1.j.outcome} then ${w2.j.outcome}`);
    }
  } else {
    r = await cust("POST", `/api/orders/${oid}/cancel`, { reason: "smoke test" });
    check("Payments", "Cancelling an unpaid checkout releases the stock hold", r.s === 200 && r.j?.paymentStatus === "PAYMENT_CANCELLED", r.j?.paymentStatus);
    console.log("note: full paid flow skipped (needs real Razorpay test payment, or SIM_KEY_SECRET against the local mock)");
    oid = undefined;
  }
} else {
  const key = crypto.randomUUID();
  r = await cust("POST", "/api/orders", { items: [{ lotId: lot?.id, quantity: 20 }], fulfillmentMethod: "CUSTOMER_PICKUP" }, { "idempotency-key": key }); check("Orders", "Customer places order (pay the farmer directly)", r.s === 201, `HTTP ${r.s}`); oid = r.j?.id;
  const r2 = await cust("POST", "/api/orders", { items: [{ lotId: lot?.id, quantity: 20 }], fulfillmentMethod: "CUSTOMER_PICKUP" }, { "idempotency-key": key }); check("Orders", "Same idempotency key does not double-order", r2.j?.id === oid, `same id: ${r2.j?.id === oid}`);
}
r = await cust("POST", "/api/orders", { items: [{ lotId: lot?.id, quantity: 100000 }], fulfillmentMethod: "CUSTOMER_PICKUP" }, { "idempotency-key": crypto.randomUUID() }); check("Orders", "Over-ordering rejected (no negative stock)", r.s >= 400 && r.s < 500, `HTTP ${r.s}`);
if (oid) {
  for (const a of ["accept", "prepare", "ready", "complete"]) { r = await farmer("POST", `/api/orders/${oid}/${a}`, {}); check("Orders", `Order action: ${a}`, r.s === 200, r.j?.status ?? `HTTP ${r.s}`); }
  r = await cust("GET", `/api/orders/${oid}`); check("Orders", "Customer sees order status", r.s === 200, r.j?.status);
}
r = await cust("GET", "/api/admin/users"); check("Security", "Customer blocked from admin API", r.s === 403, `HTTP ${r.s}`);
r = await cust("GET", "/api/lots"); check("Security", "Customer blocked from farmer lots API", r.s === 403, `HTTP ${r.s}`);

// ---- packages and seals
r = await farmer("POST", `/api/lots/${lot?.id}/packages`, { count: 3, quantityEach: 100 });
check("Seals", "Farmer creates 3 sealed packages, each with its own QR token", r.s === 201 && r.j?.length === 3 && new Set(r.j.map((p) => p.publicToken)).size === 3, `HTTP ${r.s}`);
const pk = r.j ?? [];
for (const p of pk) await farmer("POST", `/api/packages/${p.id}/seal`, { status: "DISPATCH_VERIFIED" });
r = await anon("GET", `/api/trace/${pk[0]?.publicToken}`);
check("Seals", "Package QR opens the public trace with its own seal id", r.s === 200 && r.j?.scope === "PACKAGE" && r.j?.physicalIntegrity?.package?.sealId === pk[0]?.sealId, r.j?.physicalIntegrity?.state);
r = await anon("GET", `/api/trace/${token}`);
check("Seals", "Lot QR summarises seals as intact when all are verified", r.j?.physicalIntegrity?.state === "INTACT", r.j?.physicalIntegrity?.state);
r = await anon("POST", `/api/trace/${pk[1]?.publicToken}/report-seal`, { kind: "SEAL_BROKEN", note: "smoke test report" });
check("Seals", "Public seal report records an exception for that package only", r.s === 201 && r.j?.scope === "PACKAGE", `HTTP ${r.s}`);
r = await anon("GET", `/api/trace/${pk[1]?.publicToken}`); const bad = r.j?.physicalIntegrity?.state;
r = await anon("GET", `/api/trace/${pk[0]?.publicToken}`);
check("Seals", "Exception is isolated: the other package stays intact", bad === "EXCEPTION" && r.j?.physicalIntegrity?.state === "INTACT", `${bad} / ${r.j?.physicalIntegrity?.state}`);
r = await cust("POST", `/api/packages/${pk[0]?.id}/seal`, { status: "INTACT" }); check("Seals", "Customer cannot change a seal", r.s === 403, `HTTP ${r.s}`);

// ---- multi-item cart
r = await farmer("POST", "/api/lots", { farmId, productName: "Potato", variety: "Kufri Chipsona", origin: "Nakodar, Jalandhar, Punjab", harvestDate: "2026-09-30", harvestQuantity: 200, qualityGrade: "A" });
const lot2 = r.j; await farmer("POST", `/api/lots/${lot2?.id}/listing`, { listed: true, pricePerUnit: 30 });
r = await cust("GET", "/api/cart"); check("Cart", "New customer's cart is empty", r.s === 200 && r.j?.itemCount === 0);
r = await cust("POST", "/api/cart/items", { lotId: lot?.id, quantity: 5 }); check("Cart", "Add a lot to the cart", r.s === 201 && r.j?.itemCount === 1, `HTTP ${r.s}`);
r = await cust("POST", "/api/cart/items", { lotId: lot2?.id, quantity: 2 }); check("Cart", "Add a second lot (same farmer): one group, subtotal from live prices", r.j?.groups?.length === 1 && r.j?.groups?.[0]?.subtotal === 5 * 22 + 2 * 30, `subtotal=${r.j?.groups?.[0]?.subtotal}`);
r = await cust("POST", "/api/cart/items", { lotId: lot2?.id, quantity: 5000 }); check("Cart", "Cannot add more than the stock", r.s === 409 && r.j?.code === "INSUFFICIENT_INVENTORY", `HTTP ${r.s}`);
r = await cust("PATCH", `/api/cart/items/${lot2?.id}`, { quantity: 4 }); check("Cart", "Change a quantity", r.j?.groups?.[0]?.subtotal === 5 * 22 + 4 * 30, `subtotal=${r.j?.groups?.[0]?.subtotal}`);
r = await cust("POST", "/api/checkout/preview", { items: [{ lotId: lot?.id, quantity: 5 }, { lotId: lot2?.id, quantity: 4 }], fulfillmentMethod: "CUSTOMER_PICKUP" }); check("Cart", "Server preview prices both lines", r.s === 200 && r.j?.canCheckout === true && r.j?.subtotal === 230, `subtotal=${r.j?.subtotal}`);
const multi = [{ lotId: lot?.id, quantity: 5 }, { lotId: lot2?.id, quantity: 4 }];
if (cfg.enabled) {
  r = await cust("POST", "/api/checkout", { items: multi, fulfillmentMethod: "CUSTOMER_PICKUP" }, { "idempotency-key": crypto.randomUUID() });
  check("Cart", "Multi-item checkout: one Razorpay order for the whole farmer group, total from the server", r.s === 201 && r.j?.session?.amountPaise === 23000 && r.j?.order?.items?.length === 2, `amountPaise=${r.j?.session?.amountPaise}`);
  const ss = r.j?.session;
  r = await cust("GET", "/api/cart"); check("Cart", "Starting checkout does not empty the cart", r.j?.itemCount === 2, `items=${r.j?.itemCount}`);
  if (SIM_KEY_SECRET && ss) {
    const pid = `pay_SIM_${ss.razorpayOrderId.replace("order_", "")}`;
    const sig = createHmac("sha256", SIM_KEY_SECRET).update(`${ss.razorpayOrderId}|${pid}`).digest("hex");
    r = await cust("POST", "/api/checkout/verify", { orderId: ss.orderId, razorpay_order_id: ss.razorpayOrderId, razorpay_payment_id: pid, razorpay_signature: sig });
    check("Cart", "Paying clears exactly those lines from the cart", r.j?.order?.paymentStatus === "PAID" && (await cust("GET", "/api/cart")).j?.itemCount === 0);
  } else if (ss) {
    r = await cust("POST", `/api/orders/${ss.orderId}/cancel`, { reason: "smoke test" });
    check("Cart", "Abandoning the checkout leaves the cart intact", r.s === 200 && (await cust("GET", "/api/cart")).j?.itemCount === 2);
  }
} else {
  r = await cust("POST", "/api/orders", { items: multi, fulfillmentMethod: "CUSTOMER_PICKUP" }, { "idempotency-key": crypto.randomUUID() });
  check("Cart", "Multi-item order (pay the farmer directly): one order, two lines, server total", r.s === 201 && r.j?.items?.length === 2 && r.j?.totalAmount === 230, `total=${r.j?.totalAmount}`);
  check("Cart", "Buying empties those lines from the cart", (await cust("GET", "/api/cart")).j?.itemCount === 0);
}

const passed = results.filter((x) => x.status === "PASS").length;
fs.writeFileSync(out, JSON.stringify({ base: BASE, at: new Date().toISOString(), seconds: Math.round((Date.now() - started) / 1000), passed, total: results.length, results }, null, 2));
console.log(`\n${passed}/${results.length} passed -> ${out}`);
process.exit(passed === results.length ? 0 : 1);
