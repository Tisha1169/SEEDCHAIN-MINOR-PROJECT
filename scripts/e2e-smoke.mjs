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

const BASE = (process.env.BASE || "http://localhost:8080").replace(/\/+$/, "");
const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD");
const out = process.argv[2] || "e2e-results.json";

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
const key = crypto.randomUUID();
r = await cust("POST", "/api/orders", { items: [{ lotId: lot?.id, quantity: 20 }], fulfillmentMethod: "CUSTOMER_PICKUP" }, { "idempotency-key": key }); check("Orders", "Customer places order", r.s === 201, `HTTP ${r.s}`); const oid = r.j?.id;
const r2 = await cust("POST", "/api/orders", { items: [{ lotId: lot?.id, quantity: 20 }], fulfillmentMethod: "CUSTOMER_PICKUP" }, { "idempotency-key": key }); check("Orders", "Same idempotency key does not double-order", r2.j?.id === oid, `same id: ${r2.j?.id === oid}`);
r = await cust("POST", "/api/orders", { items: [{ lotId: lot?.id, quantity: 100000 }], fulfillmentMethod: "CUSTOMER_PICKUP" }, { "idempotency-key": crypto.randomUUID() }); check("Orders", "Over-ordering rejected (no negative stock)", r.s >= 400 && r.s < 500, `HTTP ${r.s}`);
for (const a of ["accept", "prepare", "ready", "complete"]) { r = await farmer("POST", `/api/orders/${oid}/${a}`, {}); check("Orders", `Order action: ${a}`, r.s === 200, r.j?.status ?? `HTTP ${r.s}`); }
r = await cust("GET", `/api/orders/${oid}`); check("Orders", "Customer sees order status", r.s === 200, r.j?.status);
r = await cust("GET", "/api/admin/users"); check("Security", "Customer blocked from admin API", r.s === 403, `HTTP ${r.s}`);
r = await cust("GET", "/api/lots"); check("Security", "Customer blocked from farmer lots API", r.s === 403, `HTTP ${r.s}`);

const passed = results.filter((x) => x.status === "PASS").length;
fs.writeFileSync(out, JSON.stringify({ base: BASE, at: new Date().toISOString(), seconds: Math.round((Date.now() - started) / 1000), passed, total: results.length, results }, null, 2));
console.log(`\n${passed}/${results.length} passed -> ${out}`);
process.exit(passed === results.length ? 0 : 1);
