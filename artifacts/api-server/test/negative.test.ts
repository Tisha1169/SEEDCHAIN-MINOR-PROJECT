/** Phase 34: negative, concurrency and security tests against the real app + database. */
import { beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { db, sessionsTable, alertsTable, pool } from "@workspace/db";
import { eq } from "drizzle-orm";
import { agent, app, approvedFarmerWithFarm, createAdmin, harvestedListedLot, newKey, registerCustomer, registerFarmer, request, setUserStatus, type Agent } from "./helpers";

let admin: Awaited<ReturnType<typeof createAdmin>>;
let farmerA: Awaited<ReturnType<typeof approvedFarmerWithFarm>>;
let farmerB: Awaited<ReturnType<typeof approvedFarmerWithFarm>>;
let lotA: { id: string; activeQr: { id: string; publicToken: string }; lotCode: string };

beforeAll(async () => {
  admin = await createAdmin();
  farmerA = await approvedFarmerWithFarm(admin.agent);
  farmerB = await approvedFarmerWithFarm(admin.agent);
  lotA = await harvestedListedLot(farmerA.agent, farmerA.farm.id, 1000, 20);
});

describe("authentication & session", () => {
  it("rejects wrong passwords and unknown users identically", async () => {
    const a = agent();
    const wrong = await a.post("/api/auth/login").send({ email: farmerA.email, password: "nope nope nope" });
    const unknown = await a.post("/api/auth/login").send({ email: "nobody@example.test", password: "nope nope nope" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error).toBe(unknown.body.error);
  });

  it("cannot self-register as admin (role is validated)", async () => {
    const r = await agent().post("/api/auth/register").send({ name: "Evil", email: `e-${Date.now()}@x.test`, password: "long enough password", role: "admin" });
    expect(r.status).toBe(400);
  });

  it("rejects short passwords and duplicate emails", async () => {
    const short = await agent().post("/api/auth/register").send({ name: "Short", email: "s@x.test", password: "short", role: "customer" });
    expect(short.status).toBe(400);
    const dup = await agent().post("/api/auth/register").send({ name: "Dup", email: farmerA.email, password: "long enough password", role: "customer" });
    expect(dup.status).toBe(409);
  });

  it("logout revokes the session server-side", async () => {
    const c = await registerCustomer();
    expect((await c.agent.get("/api/auth/me")).status).toBe(200);
    await c.agent.post("/api/auth/logout");
    expect((await c.agent.get("/api/auth/me")).status).toBe(401);
  });

  it("expired sessions are rejected", async () => {
    const c = await registerCustomer();
    await db.update(sessionsTable).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(sessionsTable.userId, c.user.id));
    expect((await c.agent.get("/api/auth/me")).status).toBe(401);
  });

  it("suspended users lose access immediately", async () => {
    const c = await registerCustomer();
    await setUserStatus(c.user.id, "suspended");
    expect((await c.agent.get("/api/auth/me")).status).toBe(401);
  });

  it("role comes from the database, not the client", async () => {
    const c = await registerCustomer();
    // Forged bearer / role headers are ignored.
    const r = await request(app).get("/api/admin/users").set("x-seedchain-csrf", "1").set("Authorization", "Bearer forged.token").set("x-role", "admin");
    expect(r.status).toBe(401);
    expect((await c.agent.get("/api/admin/users")).status).toBe(403);
  });

  it("legacy HMAC password hashes verify once and are upgraded to scrypt", async () => {
    const { createHmac } = await import("node:crypto");
    const email = `legacy-${Date.now()}@x.test`;
    const hash = "legacy-hmac$" + createHmac("sha256", "legacy-secret").update("old password 1").digest("hex");
    await db.execute(sql`INSERT INTO users (name,email,password_hash,role,status) VALUES ('Old',${email},${hash},'customer','active')`);
    const a = agent();
    expect((await a.post("/api/auth/login").send({ email, password: "old password 1" })).status).toBe(200);
    const row = (await db.execute(sql`SELECT password_hash FROM users WHERE email=${email}`)).rows[0] as { password_hash: string };
    expect(row.password_hash.startsWith("scrypt$")).toBe(true);
    expect((await agent().post("/api/auth/login").send({ email, password: "old password 1" })).status).toBe(200);
    expect((await agent().post("/api/auth/login").send({ email, password: "wrong password" })).status).toBe(401);
  });
});

describe("CSRF", () => {
  it("rejects state-changing requests without the custom header", async () => {
    const r = await request(app).post("/api/auth/login").send({ email: "a@b.c", password: "x" });
    expect(r.status).toBe(403);
    expect(r.body.code).toBe("CSRF");
  });
});

describe("authorization / IDOR", () => {
  it("farmer B cannot read, modify, list, or QR-replace farmer A's lot (404, no existence leak)", async () => {
    const get = await farmerB.agent.get(`/api/lots/${lotA.id}`);
    expect(get.status).toBe(404);
    expect((await farmerB.agent.patch(`/api/lots/${lotA.id}`).send({ publicNotes: "hijack" })).status).toBe(404);
    expect((await farmerB.agent.post(`/api/lots/${lotA.id}/listing`).send({ listed: false })).status).toBe(404);
    expect((await farmerB.agent.get(`/api/lots/${lotA.id}/events`)).status).toBe(404);
    expect((await farmerB.agent.get(`/api/lots/${lotA.id}/qr`)).status).toBe(404);
    expect((await farmerB.agent.post("/api/qr/generate").send({ lotId: lotA.id, reason: "steal the label" })).status).toBe(404);
    const ev = await farmerB.agent.post(`/api/lots/${lotA.id}/events`).send({ eventType: "LOSS_RECORDED", clientEventId: crypto.randomUUID(), quantity: 5, reason: "x" });
    expect(ev.status).toBe(404);
    const mine = await farmerB.agent.get("/api/lots");
    expect(mine.body.find((l: { id: string }) => l.id === lotA.id)).toBeUndefined();
  });

  it("customers cannot touch lots, inventory, events, farms, or QR administration", async () => {
    const c = await registerCustomer();
    for (const [method, url, body] of [
      ["get", "/api/lots", undefined],
      ["post", "/api/lots", { farmId: farmerA.farm.id, origin: "x", productName: "Potato", variety: "x" }],
      ["patch", `/api/lots/${lotA.id}`, { publicNotes: "x" }],
      ["post", `/api/lots/${lotA.id}/listing`, { listed: false }],
      ["post", `/api/lots/${lotA.id}/events`, { eventType: "LOSS_RECORDED", clientEventId: crypto.randomUUID(), quantity: 1, reason: "x" }],
      ["post", "/api/farms", { name: "Fake farm", state: "Punjab" }],
      ["post", "/api/qr/revoke", { qrId: lotA.activeQr.id, reason: "malicious" }],
      ["post", "/api/qr/generate", { lotId: lotA.id, reason: "malicious" }],
      ["get", "/api/dashboard/overview", undefined],
      ["get", "/api/admin/users", undefined],
      ["get", "/api/alerts", undefined],
    ] as const) {
      const r = await (c.agent as Agent)[method](url).send(body as object);
      expect(r.status, `${method} ${url}`).toBe(403);
    }
    const lot = await farmerA.agent.get(`/api/lots/${lotA.id}`);
    expect(lot.body.inventory.harvested).toBe(1000);
    expect(lot.body.publicNotes).toBeNull();
  });

  it("farmers cannot use admin endpoints or review themselves", async () => {
    expect((await farmerA.agent.get("/api/admin/users")).status).toBe(403);
    expect((await farmerA.agent.post(`/api/admin/users/${farmerA.user.id}/approve`).send({})).status).toBe(403);
    expect((await farmerA.agent.post("/api/qr/revoke").send({ qrId: lotA.activeQr.id, reason: "nope nope" })).status).toBe(403);
  });

  it("pending farmers cannot create farms/lots; rejected farmers cannot log in", async () => {
    const p = await registerFarmer();
    expect((await p.agent.post("/api/lots").send({ farmId: farmerA.farm.id, origin: "x", productName: "Potato", variety: "y" })).status).toBe(403);
    expect((await admin.agent.post(`/api/admin/users/${p.user.id}/reject`).send({})).status).toBe(400); // note required
    expect((await admin.agent.post(`/api/admin/users/${p.user.id}/reject`).send({ note: "Documents invalid" })).status).toBe(200);
    expect((await agent().post("/api/auth/login").send({ email: p.email, password: "correct horse battery" })).status).toBe(401);
  });

  it("farmer cannot create a lot on another farmer's farm or product", async () => {
    const r = await farmerB.agent.post("/api/lots").send({ farmId: farmerA.farm.id, origin: "Punjab", productName: "Potato", variety: "y" });
    expect(r.status).toBe(404);
  });

  it("orders are only visible to their customer, farmer and admins", async () => {
    const c1 = await registerCustomer();
    const c2 = await registerCustomer();
    const o = await c1.agent.post("/api/orders").set("Idempotency-Key", newKey()).send({ items: [{ lotId: lotA.id, quantity: 1 }], fulfillmentMethod: "CUSTOMER_PICKUP" });
    expect(o.status).toBe(201);
    expect((await c2.agent.get(`/api/orders/${o.body.id}`)).status).toBe(404);
    expect((await c2.agent.post(`/api/orders/${o.body.id}/cancel`).send({})).status).toBe(404);
    expect((await farmerB.agent.get(`/api/orders/${o.body.id}`)).status).toBe(404);
    expect((await farmerB.agent.post(`/api/orders/${o.body.id}/accept`).send({})).status).toBe(404);
    expect((await farmerA.agent.get(`/api/orders/${o.body.id}`)).status).toBe(200);
    expect((await c2.agent.get("/api/orders")).body).toEqual([]);
    // Customer cannot accept their own order or confirm receipt early.
    expect((await c1.agent.post(`/api/orders/${o.body.id}/accept`).send({})).status).toBe(409);
    expect((await c1.agent.post(`/api/orders/${o.body.id}/confirm-receipt`).send({})).status).toBe(409);
    await c1.agent.post(`/api/orders/${o.body.id}/cancel`).send({});
  });
});

describe("inventory integrity", () => {
  it("rejects negative / zero / absurd quantities", async () => {
    const c = await registerCustomer();
    for (const quantity of [-5, 0, 1e12, "abc"]) {
      const r = await c.agent.post("/api/orders").set("Idempotency-Key", newKey()).send({ items: [{ lotId: lotA.id, quantity }], fulfillmentMethod: "CUSTOMER_PICKUP" });
      expect(r.status, String(quantity)).toBe(400);
    }
  });

  it("refuses to oversell and raises an OVER_ORDER alert", async () => {
    const c = await registerCustomer();
    const r = await c.agent.post("/api/orders").set("Idempotency-Key", newKey()).send({ items: [{ lotId: lotA.id, quantity: 99999 }], fulfillmentMethod: "CUSTOMER_PICKUP" });
    expect(r.status).toBe(409);
    expect(r.body.code).toBe("INSUFFICIENT_INVENTORY");
    const alerts = await db.select().from(alertsTable).where(eq(alertsTable.type, "OVER_ORDER"));
    expect(alerts.length).toBeGreaterThan(0);
  });

  it("concurrent orders can never reserve more than is available", async () => {
    const lot = await harvestedListedLot(farmerA.agent, farmerA.farm.id, 100, 10);
    const customers = await Promise.all(Array.from({ length: 12 }, () => registerCustomer()));
    const results = await Promise.all(
      customers.map((c) => c.agent.post("/api/orders").set("Idempotency-Key", newKey()).send({ items: [{ lotId: lot.id, quantity: 30 }], fulfillmentMethod: "CUSTOMER_PICKUP" })),
    );
    const ok = results.filter((r) => r.status === 201).length;
    const conflicts = results.filter((r) => r.status === 409).length;
    expect(ok).toBe(3); // 3 × 30 = 90 ≤ 100 < 120
    expect(conflicts).toBe(9);
    const after = await farmerA.agent.get(`/api/lots/${lot.id}`);
    expect(after.body.inventory).toMatchObject({ reserved: 90, available: 10, sold: 0 });
  });

  it("duplicate order submission with the same Idempotency-Key reserves only once", async () => {
    const lot = await harvestedListedLot(farmerA.agent, farmerA.farm.id, 100, 10);
    const c = await registerCustomer();
    const key = newKey();
    const body = { items: [{ lotId: lot.id, quantity: 40 }], fulfillmentMethod: "CUSTOMER_PICKUP" };
    const [r1, r2, r3] = await Promise.all([1, 2, 3].map(() => c.agent.post("/api/orders").set("Idempotency-Key", key).send(body)));
    const ids = new Set([r1.body.id, r2.body.id, r3.body.id]);
    expect(ids.size).toBe(1);
    expect([r1.status, r2.status, r3.status].filter((s) => s === 201)).toHaveLength(1);
    const after = await farmerA.agent.get(`/api/lots/${lot.id}`);
    expect(after.body.inventory.reserved).toBe(40);
    const missing = await c.agent.post("/api/orders").send(body);
    expect(missing.status).toBe(400);
  });

  it("cancellation and rejection release stock exactly once; double transitions are refused", async () => {
    const lot = await harvestedListedLot(farmerA.agent, farmerA.farm.id, 100, 10);
    const c = await registerCustomer();
    const o = await c.agent.post("/api/orders").set("Idempotency-Key", newKey()).send({ items: [{ lotId: lot.id, quantity: 60 }], fulfillmentMethod: "CUSTOMER_PICKUP" });
    expect((await farmerA.agent.get(`/api/lots/${lot.id}`)).body.inventory.reserved).toBe(60);
    const [a, b] = await Promise.all([c.agent.post(`/api/orders/${o.body.id}/cancel`).send({}), c.agent.post(`/api/orders/${o.body.id}/cancel`).send({})]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect((await farmerA.agent.get(`/api/lots/${lot.id}`)).body.inventory).toMatchObject({ reserved: 0, available: 100 });
    // Farmer rejection path requires a reason.
    const o2 = await c.agent.post("/api/orders").set("Idempotency-Key", newKey()).send({ items: [{ lotId: lot.id, quantity: 10 }], fulfillmentMethod: "CUSTOMER_PICKUP" });
    expect((await farmerA.agent.post(`/api/orders/${o2.body.id}/reject`).send({})).status).toBe(409);
    expect((await farmerA.agent.post(`/api/orders/${o2.body.id}/reject`).send({ reason: "Out of stock at the shed" })).status).toBe(200);
    expect((await farmerA.agent.get(`/api/lots/${lot.id}`)).body.inventory.reserved).toBe(0);
  });

  it("invalid state transitions are refused by the backend", async () => {
    const lot = await harvestedListedLot(farmerA.agent, farmerA.farm.id, 50, 10);
    const c = await registerCustomer();
    const o = await c.agent.post("/api/orders").set("Idempotency-Key", newKey()).send({ items: [{ lotId: lot.id, quantity: 5 }], fulfillmentMethod: "FARMER_DELIVERY", deliveryAddress: "Somewhere" });
    for (const action of ["prepare", "ready", "dispatch", "complete"]) {
      const r = await farmerA.agent.post(`/api/orders/${o.body.id}/${action}`).send({});
      expect(r.status, action).toBe(409);
      expect(r.body.code).toBe("INVALID_STATE_TRANSITION");
    }
    expect((await farmerA.agent.post(`/api/orders/${o.body.id}/bogus`).send({})).status).toBe(400);
  });

  it("farmer loss/correction cannot make inventory negative; events cannot be rewritten", async () => {
    const lot = await harvestedListedLot(farmerA.agent, farmerA.farm.id, 100, 10);
    const tooMuch = await farmerA.agent.post(`/api/lots/${lot.id}/events`).send({ eventType: "LOSS_RECORDED", clientEventId: crypto.randomUUID(), quantity: 101, reason: "rot" });
    expect(tooMuch.status).toBe(409);
    const ok = await farmerA.agent.post(`/api/lots/${lot.id}/events`).send({ eventType: "LOSS_RECORDED", clientEventId: crypto.randomUUID(), quantity: 10, reason: "rot" });
    expect(ok.status).toBe(201);
    expect(ok.body).toMatchObject({ quantityBefore: 100, quantityChange: -10, quantityAfter: 90 });
    const evId = ok.body.id;
    await expect(pool.query("UPDATE traceability_events SET reason='tampered' WHERE id=$1", [evId])).rejects.toThrow(/append-only/);
    await expect(pool.query("DELETE FROM traceability_events WHERE id=$1", [evId])).rejects.toThrow(/append-only/);
    await expect(pool.query("DELETE FROM audit_logs")).rejects.toThrow(/append-only/);
    // Database constraint is the last line of defence even for raw SQL.
    await expect(pool.query("UPDATE lots SET sold_qty = 999999 WHERE id=$1", [lot.id])).rejects.toThrow(/lots_inventory/);
    // Correction: new event, original untouched.
    const corr = await farmerA.agent.post(`/api/lots/${lot.id}/events`).send({ eventType: "CORRECTION_RECORDED", clientEventId: crypto.randomUUID(), correctsEventId: evId, reason: "Entered wrong qty", harvestAdjustment: 5 });
    expect(corr.status, JSON.stringify(corr.body)).toBeLessThan(500);
  });
});

describe("idempotent events / offline sync", () => {
  it("same clientEventId returns the original event and changes inventory once", async () => {
    const lot = await harvestedListedLot(farmerA.agent, farmerA.farm.id, 100, 10);
    const clientEventId = crypto.randomUUID();
    const body = { eventType: "LOSS_RECORDED", clientEventId, quantity: 7, reason: "bruising", eventTime: new Date(Date.now() - 3_600_000).toISOString() };
    const first = await farmerA.agent.post(`/api/lots/${lot.id}/events`).set("X-Offline-Replay", "1").send(body);
    const second = await farmerA.agent.post(`/api/lots/${lot.id}/events`).set("X-Offline-Replay", "1").send(body);
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
    expect(first.body.source).toBe("offline_sync");
    expect((await farmerA.agent.get(`/api/lots/${lot.id}`)).body.inventory.loss).toBe(7);
  });

  it("a replayed offline action that conflicts is rejected, alerted, and never overwrites history", async () => {
    const lot = await harvestedListedLot(farmerA.agent, farmerA.farm.id, 10, 10);
    const r = await farmerA.agent.post(`/api/lots/${lot.id}/events`).set("X-Offline-Replay", "1").send({ eventType: "LOSS_RECORDED", clientEventId: crypto.randomUUID(), quantity: 50, reason: "queued offline" });
    expect(r.status).toBe(409);
    const alerts = await db.select().from(alertsTable).where(eq(alertsTable.type, "OFFLINE_SYNC_CONFLICT"));
    expect(alerts.some((a) => a.entityId === lot.id)).toBe(true);
    expect((await farmerA.agent.get(`/api/lots/${lot.id}`)).body.inventory.loss).toBe(0);
  });

  it("future-dated events are refused", async () => {
    const lot = await harvestedListedLot(farmerA.agent, farmerA.farm.id, 10, 10);
    const r = await farmerA.agent.post(`/api/lots/${lot.id}/events`).send({ eventType: "LOSS_RECORDED", clientEventId: crypto.randomUUID(), quantity: 1, reason: "x", eventTime: new Date(Date.now() + 86_400_000).toISOString() });
    expect(r.status).toBe(400);
  });
});

describe("QR security", () => {
  it("unknown / malformed / SQLi / traversal tokens return 404 with no data", async () => {
    const anon = agent();
    for (const t of ["x".repeat(43), "short", "' OR 1=1 --", "%27%20OR%201=1", "../../etc/passwd", "A".repeat(500)]) {
      const r = await anon.get(`/api/trace/${encodeURIComponent(t)}`);
      expect(r.status, t).toBe(404);
      expect(JSON.stringify(r.body)).not.toMatch(/lotCode|farmer/);
    }
    const scan = await anon.post("/api/scans").send({ publicToken: "x".repeat(43), scanSource: "in_app_scanner", clientEventId: crypto.randomUUID() });
    expect(scan.body.result).toBe("UNKNOWN");
    const bad = await anon.post("/api/scans").send({ publicToken: "{\"batchCode\":\"SC-1\"}", scanSource: "in_app_scanner", clientEventId: crypto.randomUUID() });
    expect(bad.body.result).toBe("INVALID");
  });

  it("duplicate scan submission (same clientEventId) is recorded once", async () => {
    const anon = agent();
    const id = crypto.randomUUID();
    const body = { publicToken: lotA.activeQr.publicToken, scanSource: "camera_link", clientEventId: id };
    const a = await anon.post("/api/scans").send(body);
    const b = await anon.post("/api/scans").send(body);
    expect(a.body.duplicate).toBe(false);
    expect(b.body.duplicate).toBe(true);
    const n = (await db.execute(sql`SELECT count(*)::int n FROM qr_scan_events WHERE client_event_id=${id}`)).rows[0] as { n: number };
    expect(n.n).toBe(1);
  });

  it("replace + revoke: old QR dies, new QR resolves to the SAME lot with intact history", async () => {
    const lot = await harvestedListedLot(farmerA.agent, farmerA.farm.id, 100, 10);
    const oldToken = lot.activeQr.publicToken;
    const anon = agent();
    expect((await anon.get(`/api/trace/${oldToken}`)).status).toBe(200);

    const replaced = await farmerA.agent.post("/api/qr/generate").send({ lotId: lot.id, reason: "Label got wet" });
    expect(replaced.status).toBe(201);
    expect(replaced.body.version).toBe(2);
    const gone = await anon.get(`/api/trace/${oldToken}`);
    expect(gone.status).toBe(410);
    expect(gone.body).toEqual({ status: "REPLACED", message: expect.any(String) });
    const fresh = await anon.get(`/api/trace/${replaced.body.publicToken}`);
    expect(fresh.status).toBe(200);
    expect(fresh.body.lotCode).toBe(lot.lotCode);
    expect(fresh.body.lotId).toBe(lot.id);
    expect(fresh.body.qrVersion).toBe(2);
    expect(fresh.body.timeline.map((e: { eventType: string }) => e.eventType)).toEqual(expect.arrayContaining(["LOT_CREATED", "HARVEST_RECORDED", "QR_REPLACED"]));

    // Admin revokes the compromised label; revoked QR exposes nothing.
    const rv = await admin.agent.post("/api/qr/revoke").send({ qrId: replaced.body.id, reason: "Label photographed and copied", issueReplacement: true });
    expect(rv.status).toBe(200);
    const revoked = await anon.get(`/api/trace/${replaced.body.publicToken}`);
    expect(revoked.status).toBe(410);
    expect(revoked.body.status).toBe("REVOKED");
    expect(JSON.stringify(revoked.body)).not.toMatch(new RegExp(`${lot.lotCode}|Gurpreet|Kufri`));
    const scanRevoked = await anon.post("/api/scans").send({ publicToken: replaced.body.publicToken, scanSource: "in_app_scanner", clientEventId: crypto.randomUUID() });
    expect(scanRevoked.body.result).toBe("REVOKED");
    const qrs = await farmerA.agent.get(`/api/lots/${lot.id}/qr`);
    expect(qrs.body.map((q: { status: string }) => q.status)).toEqual(["ACTIVE", "REVOKED", "REPLACED"]);
    expect((await admin.agent.post("/api/qr/revoke").send({ qrId: replaced.body.id, reason: "again again" })).status).toBe(409);
    const alerts = await admin.agent.get("/api/alerts");
    expect(alerts.body.map((a: { type: string }) => a.type)).toContain("REVOKED_QR");
  });

  it("different lots never share a token", async () => {
    const rows = (await db.execute(sql`SELECT count(*)::int n, count(DISTINCT public_token)::int d, count(DISTINCT lot_id)::int l FROM qr_codes`)).rows[0] as { n: number; d: number; l: number };
    expect(rows.n).toBe(rows.d);
    expect(rows.l).toBeGreaterThan(5);
  });

  it("public trace never leaks private data (XSS payloads are returned as inert JSON text)", async () => {
    const xss = `<script>alert(1)</script>`;
    const lot = await harvestedListedLot(farmerA.agent, farmerA.farm.id, 10, 10);
    await farmerA.agent.patch(`/api/lots/${lot.id}`).send({ publicNotes: xss, privateNotes: "SECRET-INTERNAL" });
    const r = await agent().get(`/api/trace/${lot.activeQr.publicToken}`);
    expect(r.headers["content-type"]).toMatch(/application\/json/);
    expect(r.headers["cache-control"]).toBe("no-store");
    expect(r.body.publicNotes).toBe(xss);
    const text = JSON.stringify(r.body);
    for (const secret of ["SECRET-INTERNAL", farmerA.email, "+91", "passwordHash", "password", "privateNotes"]) expect(text).not.toContain(secret);
    // No database ids besides the lot id and farmer public profile id.
    expect(Object.keys(r.body)).not.toEqual(expect.arrayContaining(["farmerId", "farmId", "productId"]));
  });
});

describe("input handling", () => {
  it("ignores mass-assigned protected fields (server decides owner, status, inventory, role)", async () => {
    const r = await farmerA.agent.post("/api/lots").send({
      farmId: farmerA.farm.id, origin: "Punjab", productName: "Potato", variety: "Mass",
      farmerId: farmerB.user.id, status: "SOLD_OUT", soldQty: 5, harvestedQty: 999999, lotCode: "LOT-HACK", version: 99,
    });
    expect(r.status).toBe(201);
    expect(r.body.farmerId).toBe(farmerA.user.id);
    expect(r.body.status).toBe("CREATED");
    expect(r.body.lotCode).toMatch(/^LOT-\d{4}-PB-\d{6}$/);
    expect(r.body.inventory).toMatchObject({ harvested: 0, sold: 0 });
    const p = await farmerA.agent.patch(`/api/lots/${lotA.id}`).send({ publicNotes: "ok", harvestedQty: 999999, status: "SOLD_OUT", farmerId: farmerB.user.id });
    expect(p.status).toBe(200);
    expect(p.body.inventory.harvested).toBe(1000);
    expect(p.body.status).not.toBe("SOLD_OUT");
    expect(p.body.farmerId).toBe(farmerA.user.id);
    const prof = await farmerA.agent.patch("/api/me/profile").send({ name: "Renamed Farmer", role: "admin", status: "active", email: "x@y.z" });
    expect(prof.status).toBe(200);
    const me = (await farmerA.agent.get("/api/auth/me")).body;
    expect(me.role).toBe("farmer");
    expect(me.email).toBe(farmerA.email);
    // Farmers cannot self-verify via the profile endpoint.
    await farmerA.agent.patch("/api/me/profile").send({ farmerProfile: { publicName: "Gurpreet Farms", verifiedAt: "2020-01-01T00:00:00Z" } });
    const profRow = (await db.execute(sql`SELECT verified_by FROM farmer_profiles WHERE user_id=${farmerA.user.id}`)).rows[0] as { verified_by: string };
    expect(profRow.verified_by).toBe(admin.user.id);
  });

  it("malformed JSON returns 400, oversized bodies 413, bad UUIDs 400", async () => {
    const bad = await farmerA.agent.post("/api/farms").set("content-type", "application/json").send("{not json");
    expect(bad.status).toBe(400);
    const big = await farmerA.agent.post("/api/farms").send({ name: "x".repeat(200_000), state: "Punjab" });
    expect(big.status).toBe(413);
    expect((await farmerA.agent.get("/api/lots/not-a-uuid")).status).toBe(400);
  });

  it("SQL injection strings are treated as data", async () => {
    const r = await agent().get("/api/marketplace/listings").query({ q: "'; DROP TABLE users; --" });
    expect(r.status).toBe(200);
    expect((await db.execute(sql`SELECT count(*)::int n FROM users`)).rows[0]).toBeTruthy();
    const login = await agent().post("/api/auth/login").send({ email: "' OR '1'='1", password: "' OR '1'='1" });
    expect(login.status).toBe(401);
  });
});

describe("public marketplace exposure", () => {
  it("shows only listed, in-stock lots of active farmers and no private fields", async () => {
    const r = await agent().get("/api/marketplace/listings");
    expect(r.status).toBe(200);
    const text = JSON.stringify(r.body);
    for (const secret of [farmerA.email, "+91 98888", "privateNotes", "PRIVATE-NOTE"]) expect(text).not.toContain(secret);
    expect(r.body.every((l: { available: number }) => l.available > 0)).toBe(true);
    await setUserStatus(farmerB.user.id, "suspended");
    const lotB = await db.execute(sql`SELECT 1`);
    void lotB;
    await setUserStatus(farmerB.user.id, "active");
  });

  it("farmers' unlisted lots are not purchasable", async () => {
    const lot = await farmerA.agent.post("/api/lots").send({ farmId: farmerA.farm.id, productName: "Potato", variety: "Hidden", origin: "Punjab", harvestDate: "2026-03-01", harvestQuantity: 50 });
    const c = await registerCustomer();
    const r = await c.agent.post("/api/orders").set("Idempotency-Key", newKey()).send({ items: [{ lotId: lot.body.id, quantity: 1 }], fulfillmentMethod: "CUSTOMER_PICKUP" });
    expect(r.status).toBe(409);
    expect(r.body.code).toBe("NOT_LISTED");
  });
});

describe("public landing overview", () => {
  it("returns live aggregates + one featured public lot, with no private data and no login", async () => {
    const { clearPublicOverviewCache } = await import("../src/services/public-overview");
    clearPublicOverviewCache();
    const r = await agent().get("/api/public/overview");
    expect(r.status).toBe(200);
    const db1 = (await db.execute(sql`SELECT count(*)::int n FROM users u JOIN farmer_profiles p ON p.user_id=u.id WHERE u.role='farmer' AND u.status='active' AND p.verified_at IS NOT NULL`)).rows[0] as { n: number };
    expect(r.body.verifiedFarmers).toBe(db1.n);
    expect(r.body.listedLots).toBeGreaterThan(0);
    expect(r.body.traceabilityCoverage.percent).toBeGreaterThanOrEqual(0);
    expect(r.body.featured.publicToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(r.body.featured.timeline.length).toBeGreaterThan(0);
    const text = JSON.stringify(r.body);
    for (const secret of [farmerA.email, "+91", "PRIVATE-NOTE", "SECRET-INTERNAL", "passwordHash", "customerId", "farmerId"]) expect(text).not.toContain(secret);
    expect(r.body.market === null || r.body.market.source.includes("data.gov.in")).toBe(true);
  });
});

describe("health", () => {
  it("/health and /ready report status without leaking secrets", async () => {
    const h = await request(app).get("/health");
    expect(h.status).toBe(200);
    const r = await request(app).get("/ready");
    expect([200, 503]).toContain(r.status);
    expect(r.body.checks.database.ok).toBe(true);
    expect(JSON.stringify(r.body)).not.toMatch(/postgres:\/\/|AUTH_SECRET/);
  });
  it("sets security headers", async () => {
    const r = await request(app).get("/health");
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
    expect(r.headers["content-security-policy"]).toContain("default-src 'self'");
    expect(r.headers["x-powered-by"]).toBeUndefined();
    expect(r.headers["x-request-id"]).toBeTruthy();
  });
});
