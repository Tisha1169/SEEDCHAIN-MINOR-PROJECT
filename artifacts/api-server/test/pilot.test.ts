/** Pilot-upgrade features, exercised end to end against the real app and database. */
import http from "node:http";
import type { AddressInfo } from "node:net";
import { beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { startRealtime, stopRealtime } from "../src/services/realtime";
import { agent, app, approvedFarmerWithFarm, createAdmin, harvestedListedLot, newKey, registerCustomer, registerFarmer, type Agent } from "./helpers";

let admin: Awaited<ReturnType<typeof createAdmin>>;
let farmer: Awaited<ReturnType<typeof approvedFarmerWithFarm>>;

const scan = (a: Agent, token: string, extra: Record<string, unknown> = {}) =>
  a.post("/api/scans").send({ publicToken: token, scanSource: "camera_link", clientEventId: crypto.randomUUID(), ...extra });

beforeAll(async () => {
  admin = await createAdmin();
  farmer = await approvedFarmerWithFarm(admin.agent);
});

describe("lot identity and public journey", () => {
  it("uses the SC-state-district-year-sequence code and shows only recorded steps as done", async () => {
    const lot = await farmer.agent.post("/api/lots").send({ farmId: farmer.farm.id, productName: "Potato", variety: "Kufri Jyoti", origin: "Nakodar, Jalandhar, Punjab", harvestDate: "2026-09-01", harvestQuantity: 500 });
    expect(lot.status).toBe(201);
    expect(lot.body.lotCode).toMatch(/^SC-PB-JAL-\d{4}-\d{6}$/);
    const t = await agent().get(`/api/trace/${lot.body.activeQr.publicToken}`);
    const state = Object.fromEntries(t.body.journey.map((s: { key: string; state: string }) => [s.key, s.state]));
    expect(state).toMatchObject({ FARM: "DONE", HARVEST: "DONE", QUALITY: "PENDING", QR: "DONE", LISTING: "PENDING", ORDER: "PENDING", DISPATCH: "PENDING", CONFIRMATION: "PENDING" });
    expect(t.body.journey.find((s: { key: string }) => s.key === "QUALITY").at).toBeNull();
    expect(t.body.completeness.missing).toContain("QUALITY");
    expect(t.body.completeness.percent).toBeLessThan(100);
    expect(t.body.completeness.note).toMatch(/not a food-safety score/i);
    expect(t.body.qualityRecord).toBeNull();
  });

  it("records detailed quality (labelled 'recorded by farmer') and the score rises", async () => {
    const lot = await farmer.agent.post("/api/lots").send({ farmId: farmer.farm.id, productName: "Potato", variety: "Kufri Pukhraj", origin: "Nakodar, Jalandhar", harvestDate: "2026-09-02", harvestQuantity: 200 });
    const token = lot.body.activeQr.publicToken;
    const before = (await agent().get(`/api/trace/${token}`)).body.completeness.percent;
    const clientEventId = crypto.randomUUID();
    const body = { eventType: "QUALITY_RECORDED", clientEventId, qualityGrade: "B", appearance: "Clean skin, few scabs", sizeCategory: "medium", defects: "2% greening", inspectionDate: "2026-09-03", reason: "Visual inspection" };
    const r1 = await farmer.agent.post(`/api/lots/${lot.body.id}/events`).send(body);
    const r2 = await farmer.agent.post(`/api/lots/${lot.body.id}/events`).send(body);
    expect([r1.status, r2.status]).toEqual([201, 200]);
    const t = await agent().get(`/api/trace/${token}`);
    expect(t.body.qualityRecord).toMatchObject({ grade: "B", appearance: "Clean skin, few scabs", sizeCategory: "medium", inspectionDate: "2026-09-03", recordedBy: "FARMER" });
    expect(t.body.completeness.percent).toBeGreaterThan(before);
    const n = (await db.execute(sql`SELECT count(*)::int n FROM lot_quality_records WHERE lot_id = ${lot.body.id}`)).rows[0] as { n: number };
    expect(n.n).toBe(1); // the lot was created without a grade; the replayed request added no second record
  });
});

describe("QR disable / enable", () => {
  it("a disabled QR resolves to a warning with no lot data, and re-enabling restores it", async () => {
    const lot = await harvestedListedLot(farmer.agent, farmer.farm.id, 100, 10);
    const qr = lot.activeQr;
    const anon = agent();
    expect((await admin.agent.post(`/api/admin/qr/${qr.id}/disable`).send({ reason: "x" })).status).toBe(400); // reason too short
    const off = await admin.agent.post(`/api/admin/qr/${qr.id}/disable`).send({ reason: "Under review after a report" });
    expect(off.status).toBe(200);
    expect(off.body.status).toBe("DISABLED");
    const gone = await anon.get(`/api/trace/${qr.publicToken}`);
    expect(gone.status).toBe(410);
    expect(gone.body.status).toBe("DISABLED");
    expect(JSON.stringify(gone.body)).not.toMatch(new RegExp(`${lot.lotCode}|Gurpreet|Kufri`));
    expect((await scan(anon, qr.publicToken)).body.result).toBe("DISABLED");
    expect((await admin.agent.post(`/api/admin/qr/${qr.id}/disable`).send({ reason: "twice twice" })).status).toBe(409);
    // farmers cannot touch it
    expect((await farmer.agent.post(`/api/admin/qr/${qr.id}/enable`).send({ reason: "let me" })).status).toBe(403);
    const on = await admin.agent.post(`/api/admin/qr/${qr.id}/enable`).send({ reason: "Review finished" });
    expect(on.body.status).toBe("ACTIVE");
    expect((await anon.get(`/api/trace/${qr.publicToken}`)).status).toBe(200);
    const audit = await admin.agent.get("/api/admin/audit-logs?entityType=qr_code");
    expect(audit.body.map((a: { action: string }) => a.action)).toEqual(expect.arrayContaining(["QR_DISABLED", "QR_ENABLED"]));
    const events = await farmer.agent.get(`/api/lots/${lot.id}/events`);
    expect(events.body.map((e: { eventType: string }) => e.eventType)).toEqual(expect.arrayContaining(["QR_DISABLED", "QR_ENABLED"]));
    const notes = await farmer.agent.get("/api/me/notifications");
    expect(notes.body.items.map((x: { type: string }) => x.type)).toEqual(expect.arrayContaining(["QR_DISABLED", "QR_ENABLED"]));
  });

  it("a disabled QR can be replaced or revoked", async () => {
    const lot = await harvestedListedLot(farmer.agent, farmer.farm.id, 100, 10);
    await admin.agent.post(`/api/admin/qr/${lot.activeQr.id}/disable`).send({ reason: "Suspicious label" });
    const rep = await farmer.agent.post("/api/qr/generate").send({ lotId: lot.id, reason: "Label replaced after review" });
    expect(rep.status).toBe(201);
    const qrs = await farmer.agent.get(`/api/lots/${lot.id}/qr`);
    expect(qrs.body.map((q: { status: string }) => q.status)).toEqual(["ACTIVE", "REPLACED"]);
  });
});

describe("QR anomaly detection", () => {
  it("flags impossible travel for the same QR as a *potential* anomaly an admin can handle", async () => {
    const lot = await harvestedListedLot(farmer.agent, farmer.farm.id, 100, 10);
    const token = lot.activeQr.publicToken;
    const anon = agent();
    await scan(anon, token, { sessionId: "session-aaaaaaaa", approxLat: 31.33, approxLon: 75.57 }); // Jalandhar
    await scan(anon, token, { sessionId: "session-bbbbbbbb", approxLat: 19.07, approxLon: 72.88 }); // Mumbai, seconds later
    const list = await admin.agent.get("/api/admin/anomalies?status=OPEN");
    const a = list.body.find((x: { lotId: string }) => x.lotId === lot.id);
    expect(a).toBeTruthy();
    expect(a.kind).toBe("IMPOSSIBLE_TRAVEL");
    expect(a.detail.impliedSpeedKmh == null || a.detail.impliedSpeedKmh > 900).toBe(true);
    // stored coordinates are coarse (0.1°)
    const row = (await db.execute(sql`SELECT approx_lat FROM qr_scan_events WHERE session_id='session-aaaaaaaa'`)).rows[0] as { approx_lat: number };
    expect(row.approx_lat).toBe(31.3);

    // a third scan does not create a duplicate open anomaly of the same kind
    await scan(anon, token, { sessionId: "session-cccccccc", approxLat: 19.07, approxLon: 72.88 });
    const again = (await admin.agent.get("/api/admin/anomalies?status=OPEN")).body.filter((x: { lotId: string; kind: string }) => x.lotId === lot.id && x.kind === "IMPOSSIBLE_TRAVEL");
    expect(again).toHaveLength(1);

    // alert + admin notification + private event exist; farmers/customers cannot see anomalies
    expect((await admin.agent.get("/api/alerts")).body.some((x: { type: string }) => x.type === "QR_ANOMALY")).toBe(true);
    expect((await admin.agent.get("/api/me/notifications")).body.items.some((x: { type: string }) => x.type === "QR_ANOMALY")).toBe(true);
    expect((await farmer.agent.get("/api/admin/anomalies")).status).toBe(403);
    const pub = await agent().get(`/api/trace/${token}`);
    expect(JSON.stringify(pub.body)).not.toMatch(/ANOMALY|anomal/i);

    // human workflow: investigate → disable → re-enable → dismiss (note required)
    expect((await admin.agent.post(`/api/admin/anomalies/${a.id}/investigate`).send({})).body.status).toBe("INVESTIGATING");
    expect((await admin.agent.post(`/api/admin/anomalies/${a.id}/dismiss`).send({})).status).toBe(409);
    await admin.agent.post(`/api/admin/qr/${lot.activeQr.id}/disable`).send({ reason: "Investigating anomaly", anomalyId: a.id });
    await admin.agent.post(`/api/admin/qr/${lot.activeQr.id}/enable`).send({ reason: "Reviewed: farmer travelled with produce" });
    const closed = await admin.agent.post(`/api/admin/anomalies/${a.id}/dismiss`).send({ note: "Two phones, one on a flight" });
    expect(closed.body.status).toBe("DISMISSED");
    expect((await admin.agent.post(`/api/admin/anomalies/${a.id}/confirm`).send({ note: "late" })).status).toBe(409);
    const audit = await admin.agent.get("/api/admin/audit-logs?entityType=qr_anomaly");
    expect(audit.body.map((x: { action: string }) => x.action)).toEqual(expect.arrayContaining(["QR_ANOMALY_INVESTIGATE", "QR_ANOMALY_DISMISS"]));
  });

  it("does not flag nearby scans, and flags a burst of many distinct scanners", async () => {
    const lot = await harvestedListedLot(farmer.agent, farmer.farm.id, 100, 10);
    const token = lot.activeQr.publicToken;
    const anon = agent();
    await scan(anon, token, { sessionId: "near-aaaaaaaaa", approxLat: 31.3, approxLon: 75.6 });
    await scan(anon, token, { sessionId: "near-bbbbbbbbb", approxLat: 30.9, approxLon: 75.9 }); // Ludhiana
    expect((await admin.agent.get("/api/admin/anomalies")).body.some((x: { lotId: string }) => x.lotId === lot.id)).toBe(false);
    for (let i = 0; i < 15; i++) await scan(anon, token, { sessionId: `burst-session-${i}` });
    const a = (await admin.agent.get("/api/admin/anomalies")).body.find((x: { lotId: string }) => x.lotId === lot.id);
    expect(a.kind).toBe("SCAN_BURST");
  });

  it("scan analytics count unique scanners vs repeats and failures; farmers only see their own lots", async () => {
    const mine = await harvestedListedLot(farmer.agent, farmer.farm.id, 50, 10);
    const other = await approvedFarmerWithFarm(admin.agent);
    const theirs = await harvestedListedLot(other.agent, other.farm.id, 50, 10);
    const anon = agent();
    for (const s of ["u-aaaaaaaa", "u-aaaaaaaa", "u-bbbbbbbb"]) await scan(anon, mine.activeQr.publicToken, { sessionId: s });
    await scan(anon, theirs.activeQr.publicToken, { sessionId: "other-aaaaaa" });
    await scan(anon, "z".repeat(43), { sessionId: "bad-aaaaaaaa" }); // unknown
    const a = await admin.agent.get("/api/analytics/qr?days=7");
    const row = a.body.perLot.find((l: { lotId: string }) => l.lotId === mine.id);
    expect(row).toMatchObject({ scans: 3, uniqueScanners: 2 });
    expect(a.body.failedScans).toBeGreaterThanOrEqual(1);
    expect(a.body.totalVerifiedScans - a.body.uniqueScanners).toBe(a.body.repeatScans);
    expect(a.body.failedByResult.some((x: { label: string }) => x.label === "UNKNOWN")).toBe(true);
    const f = await farmer.agent.get("/api/analytics/qr");
    expect(f.body.perLot.every((l: { lotId: string }) => l.lotId !== theirs.id)).toBe(true);
    expect(f.body.perLot.some((l: { lotId: string }) => l.lotId === mine.id)).toBe(true);
    expect((await registerCustomer().then((c) => c.agent.get("/api/analytics/qr"))).status).toBe(403);
  });
});

describe("lot recall", () => {
  it("blocks sales, warns on the QR page, notifies affected parties, and keeps an audit trail", async () => {
    const lot = await harvestedListedLot(farmer.agent, farmer.farm.id, 200, 12);
    const token = lot.activeQr.publicToken;
    const c1 = await registerCustomer("Recall Customer");
    const o = await c1.agent.post("/api/orders").set("Idempotency-Key", newKey()).send({ items: [{ lotId: lot.id, quantity: 20 }], fulfillmentMethod: "CUSTOMER_PICKUP" });
    expect(o.status).toBe(201);

    const impact = await admin.agent.get(`/api/admin/lots/${lot.id}/recall-impact`);
    expect(impact.body).toMatchObject({ lotCode: lot.lotCode, customersAffected: 1, qrActive: true });
    expect(impact.body.openOrders[0].orderCode).toBe(o.body.orderCode);
    expect(impact.body.inventory.reserved).toBe(20);
    expect((await farmer.agent.post(`/api/admin/lots/${lot.id}/recall`).send({ reason: "no no no", publicMessage: "no no no" })).status).toBe(403);
    expect((await admin.agent.post(`/api/admin/lots/${lot.id}/recall`).send({ reason: "x", publicMessage: "y" })).status).toBe(400);

    const rc = await admin.agent.post(`/api/admin/lots/${lot.id}/recall`).send({ reason: "Possible contamination reported by a customer", publicMessage: "Do not consume. Contact the seller for a refund." });
    expect(rc.status).toBe(200);
    expect(rc.body.status).toBe("ACTIVE");
    expect((await admin.agent.post(`/api/admin/lots/${lot.id}/recall`).send({ reason: "again again", publicMessage: "again again" })).status).toBe(409);

    // QR shows the recall state (and only public-safe information)
    const t = await agent().get(`/api/trace/${token}`);
    expect(t.status).toBe(200);
    expect(t.body.recalled).toBe(true);
    expect(t.body.recall.message).toBe("Do not consume. Contact the seller for a refund.");
    expect(t.body.listed).toBe(false);
    expect(t.body.availableQuantity).toBeNull();
    expect(JSON.stringify(t.body)).not.toMatch(/contamination|Recall Customer/);
    expect(t.body.timeline.some((e: { eventType: string; detail: string | null }) => e.eventType === "LOT_RECALLED" && e.detail === "Do not consume. Contact the seller for a refund.")).toBe(true);

    // inventory blocked: not on the marketplace, cannot be ordered, cannot be relisted, orders cannot advance
    expect((await agent().get("/api/marketplace/listings")).body.some((l: { lotId: string }) => l.lotId === lot.id)).toBe(false);
    const c2 = await registerCustomer();
    const blocked = await c2.agent.post("/api/orders").set("Idempotency-Key", newKey()).send({ items: [{ lotId: lot.id, quantity: 1 }], fulfillmentMethod: "CUSTOMER_PICKUP" });
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toMatch(/LOT_RECALLED|NOT_LISTED/);
    expect((await farmer.agent.post(`/api/lots/${lot.id}/listing`).send({ listed: true, pricePerUnit: 12 })).body.code).toBe("LOT_RECALLED");
    const accept = await farmer.agent.post(`/api/orders/${o.body.id}/accept`).send({});
    expect(accept.status).toBe(409);
    expect(accept.body.code).toBe("LOT_RECALLED");

    // farmer and the customer with an open order were notified; the customer can still cancel and stock is released
    expect((await farmer.agent.get("/api/me/notifications")).body.items.some((n: { type: string }) => n.type === "LOT_RECALLED")).toBe(true);
    expect((await c1.agent.get("/api/me/notifications")).body.items.some((n: { type: string }) => n.type === "LOT_RECALLED")).toBe(true);
    expect((await c2.agent.get("/api/me/notifications")).body.items.some((n: { type: string }) => n.type === "LOT_RECALLED")).toBe(false);
    expect((await c1.agent.post(`/api/orders/${o.body.id}/cancel`).send({})).body.status).toBe("CANCELLED");
    expect((await farmer.agent.get(`/api/lots/${lot.id}`)).body.inventory.reserved).toBe(0);
    expect((await farmer.agent.get(`/api/lots/${lot.id}/recall`)).body.status).toBe("ACTIVE");

    const audit = await admin.agent.get("/api/admin/audit-logs?entityType=lot");
    expect(audit.body.some((a: { action: string; entityId: string }) => a.action === "LOT_RECALLED" && a.entityId === lot.id)).toBe(true);
    expect((await admin.agent.get("/api/alerts")).body.some((a: { type: string }) => a.type === "LOT_RECALLED")).toBe(true);

    // clearing restores the QR page but leaves the lot unlisted until the farmer relists
    const cleared = await admin.agent.post(`/api/admin/lots/${lot.id}/recall/clear`).send({ note: "Lab result negative; recall lifted" });
    expect(cleared.body.status).toBe("CLEARED");
    const after = await agent().get(`/api/trace/${token}`);
    expect(after.body.recalled).toBe(false);
    expect(after.body.listed).toBe(false);
    expect((await farmer.agent.post(`/api/lots/${lot.id}/listing`).send({ listed: true, pricePerUnit: 12 })).status).toBe(200);
  });
});

describe("reviews", () => {
  it("only verified purchasers can review, once; admins can hide/restore; ratings ignore hidden reviews", async () => {
    const f = await approvedFarmerWithFarm(admin.agent);
    const lot = await harvestedListedLot(f.agent, f.farm.id, 100, 10);
    const cust = await registerCustomer("Reviewer");
    const stranger = await registerCustomer("Stranger");
    const o = await cust.agent.post("/api/orders").set("Idempotency-Key", newKey()).send({ items: [{ lotId: lot.id, quantity: 10 }], fulfillmentMethod: "CUSTOMER_PICKUP" });
    expect((await cust.agent.post(`/api/orders/${o.body.id}/feedback`).send({ rating: 5 })).status).toBe(409); // not yet received
    for (const a of ["accept", "prepare", "ready"]) await f.agent.post(`/api/orders/${o.body.id}/${a}`).send({});
    await cust.agent.post(`/api/orders/${o.body.id}/confirm-receipt`).send({});
    expect((await stranger.agent.post(`/api/orders/${o.body.id}/feedback`).send({ rating: 1 })).status).toBe(404);
    expect((await f.agent.post(`/api/orders/${o.body.id}/feedback`).send({ rating: 5 })).status).toBe(403);
    expect((await cust.agent.post(`/api/orders/${o.body.id}/feedback`).send({ rating: 6 })).status).toBe(400);
    const ok = await cust.agent.post(`/api/orders/${o.body.id}/feedback`).send({ rating: 4, freshnessRating: 5, qualityRating: 3, comment: "Fresh, a few small ones" });
    expect(ok.status).toBe(201);
    expect(ok.body.feedback).toMatchObject({ rating: 4, freshnessRating: 5, qualityRating: 3 });
    expect((await cust.agent.post(`/api/orders/${o.body.id}/feedback`).send({ rating: 5 })).status).toBe(409);
    expect((await f.agent.get("/api/me/notifications")).body.items.some((n: { type: string }) => n.type === "REVIEW_RECEIVED")).toBe(true);

    const prof = await agent().get(`/api/farmers/${f.user.id}`);
    expect(prof.body.stats.rating).toMatchObject({ average: 4, count: 1, freshness: 5, quality: 3 });
    expect(prof.body.stats.successfulOrders).toBe(1);
    expect(prof.body.reviews[0]).toMatchObject({ rating: 4, verifiedPurchase: true });
    expect(JSON.stringify(prof.body)).not.toMatch(/Reviewer|@example|\+91/);

    expect((await cust.agent.post(`/api/admin/reviews/${o.body.id}/hide`).send({ reason: "x" })).status).toBe(403);
    expect((await admin.agent.post(`/api/admin/reviews/${o.body.id}/hide`).send({})).status).toBe(409); // reason required
    expect((await admin.agent.post(`/api/admin/reviews/${o.body.id}/hide`).send({ reason: "Abusive language" })).status).toBe(204);
    const hidden = await agent().get(`/api/farmers/${f.user.id}`);
    expect(hidden.body.stats.rating.count).toBe(0);
    expect(hidden.body.reviews).toHaveLength(0);
    expect((await admin.agent.get("/api/admin/reviews")).body.find((r: { orderId: string }) => r.orderId === o.body.id).hidden).toBe(true);
    expect((await admin.agent.post(`/api/admin/reviews/${o.body.id}/restore`).send({})).status).toBe(204);
    expect((await agent().get(`/api/farmers/${f.user.id}`)).body.stats.rating.count).toBe(1);
  });
});

describe("farmer verification workflow", () => {
  it("application → correction required → resubmit → verified, with notifications and a review panel", async () => {
    const f = await registerFarmer();
    await f.agent.post("/api/farms").send({ name: "Application farm", state: "Punjab", district: "Jalandhar", sizeHectares: 3 });
    await f.agent.post("/api/products").send({ name: "Potato", variety: "Kufri Jyoti" });
    const panel = await admin.agent.get(`/api/admin/farmers/${f.user.id}/review`);
    expect(panel.status).toBe(200);
    expect(panel.body.farms[0]).toMatchObject({ name: "Application farm", district: "Jalandhar", sizeHectares: 3 });
    expect(panel.body.products[0].variety).toBe("Kufri Jyoti");
    expect(panel.body.user.status).toBe("pending");
    expect((await admin.agent.get("/api/me/notifications")).body.items.some((n: { type: string }) => n.type === "FARMER_APPLICATION")).toBe(true);

    expect((await f.agent.post("/api/me/resubmit").send({})).status).toBe(409); // not asked yet
    expect((await admin.agent.post(`/api/admin/users/${f.user.id}/request-correction`).send({})).status).toBe(400);
    const corr = await admin.agent.post(`/api/admin/users/${f.user.id}/request-correction`).send({ note: "Please add your district and village" });
    expect(corr.body.status).toBe("correction_required");
    const me = await f.agent.get("/api/auth/me");
    expect(me.body.status).toBe("correction_required");
    expect(me.body.farmerProfile.reviewNote).toBe("Please add your district and village");
    expect((await f.agent.get("/api/me/notifications")).body.items.some((n: { type: string }) => n.type === "FARMER_CORRECTION_REQUIRED")).toBe(true);
    // still cannot create lots; can update the profile
    expect((await f.agent.post("/api/lots").send({ farmId: panel.body.farms[0].id, origin: "Jalandhar", productName: "Potato", variety: "x" })).status).toBe(403);
    expect((await f.agent.patch("/api/me/profile").send({ farmerProfile: { publicName: "Gurpreet Farms", district: "Jalandhar", village: "Nakodar" } })).status).toBe(200);
    const re = await f.agent.post("/api/me/resubmit").send({});
    expect(re.body.status).toBe("pending");
    expect((await admin.agent.post(`/api/admin/users/${f.user.id}/approve`).send({ note: "Details verified by phone call" })).body.status).toBe("active");
    expect((await f.agent.get("/api/me/notifications")).body.items.some((n: { type: string }) => n.type === "FARMER_VERIFIED")).toBe(true);
    const hist = (await admin.agent.get(`/api/admin/farmers/${f.user.id}/review`)).body.history.map((h: { action: string }) => h.action);
    expect(hist).toEqual(expect.arrayContaining(["USER_APPROVE", "USER_REQUEST_CORRECTION", "FARMER_RESUBMITTED"]));
  });
});

describe("notifications and inventory under concurrency", () => {
  it("order lifecycle notifies the right people and marks read", async () => {
    const lot = await harvestedListedLot(farmer.agent, farmer.farm.id, 100, 10);
    const c = await registerCustomer();
    const o = await c.agent.post("/api/orders").set("Idempotency-Key", newKey()).send({ items: [{ lotId: lot.id, quantity: 5 }], fulfillmentMethod: "FARMER_DELIVERY", deliveryAddress: "Somewhere 1" });
    expect((await farmer.agent.get("/api/me/notifications")).body.items.some((n: { type: string; params: { orderCode: string } }) => n.type === "ORDER_NEW" && n.params.orderCode === o.body.orderCode)).toBe(true);
    for (const a of ["accept", "prepare", "ready", "dispatch", "complete"]) await farmer.agent.post(`/api/orders/${o.body.id}/${a}`).send({});
    await c.agent.post(`/api/orders/${o.body.id}/confirm-receipt`).send({});
    const cn = (await c.agent.get("/api/me/notifications")).body;
    expect(cn.items.map((n: { type: string }) => n.type)).toEqual(expect.arrayContaining(["ORDER_ACCEPTED", "ORDER_DISPATCHED", "ORDER_DELIVERED"]));
    expect((await farmer.agent.get("/api/me/notifications")).body.items.some((n: { type: string }) => n.type === "ORDER_CONFIRMED")).toBe(true);
    expect(cn.unread).toBeGreaterThan(0);
    await c.agent.post("/api/me/notifications/read").send({});
    expect((await c.agent.get("/api/me/notifications")).body.unread).toBe(0);
    // other users' notifications are never visible
    const other = await registerCustomer();
    expect((await other.agent.get("/api/me/notifications")).body.items).toHaveLength(0);
  });

  it("10 kg available, two customers order 10 kg at once: exactly one succeeds", async () => {
    const lot = await harvestedListedLot(farmer.agent, farmer.farm.id, 10, 10);
    const [a, b] = await Promise.all([registerCustomer("Customer A"), registerCustomer("Customer B")]);
    const send = (c: typeof a) => c.agent.post("/api/orders").set("Idempotency-Key", newKey()).send({ items: [{ lotId: lot.id, quantity: 10 }], fulfillmentMethod: "CUSTOMER_PICKUP" });
    const results = await Promise.all([send(a), send(b)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const inv = (await farmer.agent.get(`/api/lots/${lot.id}`)).body.inventory;
    expect(inv).toMatchObject({ reserved: 10, available: 0 });
  });
});

describe("real-time delivery (server-sent events)", () => {
  it("an admin's open stream receives a change notice when a farmer creates a lot", async () => {
    await startRealtime(); // normally started by the server's main()
    const server = http.createServer(app);
    await new Promise<void>((r) => server.listen(0, r));
    const port = (server.address() as AddressInfo).port;
    // log in over a real socket to obtain a cookie for the stream
    const login = await fetch(`http://127.0.0.1:${port}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json", "x-seedchain-csrf": "1" }, body: JSON.stringify({ email: admin.email, password: "admin password 123" }) });
    const sc = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
    const got: string[] = [];
    const ctl = new AbortController();
    const stream = await fetch(`http://127.0.0.1:${port}/api/stream`, { headers: { cookie: sc }, signal: ctl.signal });
    const reader = stream.body!.getReader();
    const pump = (async () => {
      const dec = new TextDecoder();
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          got.push(dec.decode(value));
        }
      } catch {
        /* aborted */
      }
    })();
    await new Promise((r) => setTimeout(r, 300));
    await farmer.agent.post("/api/lots").send({ farmId: farmer.farm.id, productName: "Potato", variety: "Live", origin: "Punjab" });
    await new Promise((r) => setTimeout(r, 800));
    ctl.abort();
    await pump;
    server.closeAllConnections?.();
    server.close();
    await stopRealtime();
    const text = got.join("");
    expect(text).toContain("event: ready");
    expect(text).toMatch(/event: change\ndata: \{"topic":"lots"/);
  });
});
