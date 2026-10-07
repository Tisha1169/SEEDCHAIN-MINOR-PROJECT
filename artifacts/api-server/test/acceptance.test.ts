/**
 * Phase 45/46 acceptance scenario, executed against the real Express app and
 * a real PostgreSQL database (no mocks):
 *
 * farmer registers → admin approves → farm → product → lot + harvest → QR
 * → QR image decoded → public trace → customer orders → inventory reserved
 * → farmer accept/prepare/ready/dispatch/complete → customer confirms
 * → inventory sold → public trace updated → admin dashboard reflects it.
 */
import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { agent, createAdmin, newKey, registerCustomer, registerFarmer } from "./helpers";

async function decodeQrPng(text: string): Promise<string> {
  const buf = await QRCode.toBuffer(text, { errorCorrectionLevel: "M", margin: 4, scale: 6 });
  const png = PNG.sync.read(buf);
  const result = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  if (!result) throw new Error("QR not decodable");
  return result.data;
}

describe("acceptance: direct farmer → customer flow with live QR trace", () => {
  it("runs the full real-world scenario end to end", async () => {
    const admin = await createAdmin();

    // 1-2. Farmer registers (pending) and is approved by admin
    const farmer = await registerFarmer("Punjab");
    expect(farmer.user.role).toBe("farmer");
    expect(farmer.user.status).toBe("pending");
    const blocked = await farmer.agent.post("/api/farms").send({ name: "Too early", state: "Punjab" });
    expect(blocked.status).toBe(403);

    const pending = await admin.agent.get("/api/admin/users?role=farmer&status=pending");
    expect(pending.body.map((u: { id: string }) => u.id)).toContain(farmer.user.id);
    const approved = await admin.agent.post(`/api/admin/users/${farmer.user.id}/approve`).send({ note: "Aadhaar + land record checked" });
    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe("active");
    expect(approved.body.farmerProfile.verifiedAt).toBeTruthy();

    // 3. Farm, 4. product
    const farm = await farmer.agent.post("/api/farms").send({ name: "Green Acres", village: "Nakodar", district: "Jalandhar", state: "Punjab" });
    expect(farm.status).toBe(201);
    const product = await farmer.agent.post("/api/products").send({ name: "Potato", variety: "Kufri Jyoti" });
    expect(product.status).toBe(201);

    // 5-8. Lot with harvest → identity + secure QR
    const lotRes = await farmer.agent.post("/api/lots").send({
      farmId: farm.body.id,
      productId: product.body.id,
      origin: "Nakodar, Jalandhar, Punjab",
      plantingDate: "2025-11-01",
      harvestDate: "2026-02-20",
      harvestQuantity: 1000,
      qualityGrade: "A",
      privateNotes: "PRIVATE farmer note",
      storage: { storageType: "cold_storage", storageLocation: "Jalandhar cold store", storageStart: "2026-02-21T08:00:00Z", temperatureC: 4, humidityPct: 90 },
    });
    expect(lotRes.status).toBe(201);
    const lot = lotRes.body;
    expect(lot.lotCode).toMatch(/^LOT-\d{4}-PB-\d{6}$/);
    expect(lot.status).toBe("HARVESTED");
    expect(lot.inventory).toMatchObject({ harvested: 1000, available: 1000, reserved: 0, sold: 0, loss: 0 });
    expect(lot.activeQr.status).toBe("ACTIVE");
    expect(lot.activeQr.version).toBe(1);
    const traceUrl: string = lot.activeQr.traceUrl;
    expect(traceUrl).toBe(`https://seedchain.test/trace/${lot.activeQr.publicToken}`);

    // 9-11. "Print" the QR and scan it: the decoded payload is ONLY the HTTPS URL.
    const decoded = await decodeQrPng(traceUrl);
    expect(decoded).toBe(traceUrl);
    expect(decoded).not.toMatch(/1000|Kufri|phone|@|\{/);
    const token = new URL(decoded).pathname.split("/").pop()!;

    // 12. Public trace (no login) shows the correct lot from the live DB
    const anon = agent();
    const scan = await anon.post("/api/scans").send({ publicToken: token, scanSource: "camera_link", clientEventId: crypto.randomUUID(), deviceType: "mobile" });
    expect(scan.body.result).toBe("OK");
    const t1 = await anon.get(`/api/trace/${token}`);
    expect(t1.status).toBe(200);
    expect(t1.body).toMatchObject({ verification: "VERIFIED", lotCode: lot.lotCode, productName: "Potato", variety: "Kufri Jyoti", harvestedQuantity: 1000, qualityGrade: "A" });
    expect(t1.body.timeline.map((e: { eventType: string }) => e.eventType)).toEqual(
      expect.arrayContaining(["LOT_CREATED", "HARVEST_RECORDED", "QUALITY_RECORDED", "STORAGE_RECORDED", "QR_GENERATED", "QR_SCANNED"]),
    );
    const publicJson = JSON.stringify(t1.body);
    for (const secret of [farmer.email, "+91", "PRIVATE farmer note", "password", farm.body.id]) expect(publicJson).not.toContain(secret);

    // Farmer lists the lot
    const listed = await farmer.agent.post(`/api/lots/${lot.id}/listing`).send({ listed: true, pricePerUnit: 24 });
    expect(listed.body.status).toBe("AVAILABLE");

    // 13-17. Customer registers, browses, orders → inventory reserved
    const customer = await registerCustomer("Asha Customer");
    const browse = await customer.agent.get("/api/marketplace/listings?q=kufri");
    const listing = browse.body.find((l: { lotId: string }) => l.lotId === lot.id);
    expect(listing).toMatchObject({ available: 1000, pricePerUnit: 24 });
    const key = newKey();
    const order = await customer.agent
      .post("/api/orders")
      .set("Idempotency-Key", key)
      .send({ items: [{ lotId: lot.id, quantity: 150 }], fulfillmentMethod: "FARMER_DELIVERY", deliveryAddress: "12 Model Town, Jalandhar" });
    expect(order.status).toBe(201);
    expect(order.body).toMatchObject({ status: "PENDING", totalAmount: 3600 });
    const afterOrder = await farmer.agent.get(`/api/lots/${lot.id}`);
    expect(afterOrder.body.inventory).toMatchObject({ available: 850, reserved: 150, sold: 0 });

    // 18-22. Farmer receives and fulfils the order
    const inbox = await farmer.agent.get("/api/orders?status=PENDING");
    expect(inbox.body.map((o: { id: string }) => o.id)).toContain(order.body.id);
    expect(inbox.body[0].customer.phone).toBe("+91 90000 00000");
    for (const [action, expected, body] of [
      ["accept", "ACCEPTED", {}],
      ["prepare", "PREPARING", {}],
      ["ready", "READY", {}],
      ["dispatch", "DISPATCHED", { deliveryNotes: "Farm tractor-trolley" }],
      ["complete", "DELIVERED", { deliveryLocation: "Model Town, Jalandhar" }],
    ] as const) {
      const r = await farmer.agent.post(`/api/orders/${order.body.id}/${action}`).send(body);
      expect(r.status, `${action}: ${JSON.stringify(r.body)}`).toBe(200);
      expect(r.body.status).toBe(expected);
    }

    // 23-25. Customer confirms receipt → reserved becomes sold
    const seen = await customer.agent.get(`/api/orders/${order.body.id}`);
    expect(seen.body.allowedActions).toEqual(["confirm-receipt"]);
    expect(seen.body.customer.phone).toBeNull();
    const confirmed = await customer.agent.post(`/api/orders/${order.body.id}/confirm-receipt`).send({});
    expect(confirmed.body.status).toBe("CUSTOMER_CONFIRMED");
    const finalLot = await farmer.agent.get(`/api/lots/${lot.id}`);
    expect(finalLot.body.inventory).toMatchObject({ harvested: 1000, available: 850, reserved: 0, sold: 150 });
    expect(finalLot.body.status).toBe("PARTIALLY_SOLD");
    const fb = await customer.agent.post(`/api/orders/${order.body.id}/feedback`).send({ rating: 5, comment: "Fresh!" });
    expect(fb.status).toBe(201);

    const inv = await farmer.agent.get("/api/inventory");
    expect(inv.body.totals).toMatchObject({ harvested: 1000, available: 850, reserved: 0, sold: 150, loss: 0 });
    expect(inv.body.lots).toHaveLength(1);
    expect((await customer.agent.get("/api/inventory")).status).toBe(403);

    // 26. Same QR, re-opened: trace reflects the updated status
    const t2 = await anon.get(`/api/trace/${token}`);
    expect(t2.body.status).toBe("PARTIALLY_SOLD");
    expect(t2.body.availableQuantity).toBe(850);
    expect(t2.body.timeline.map((e: { eventType: string }) => e.eventType)).toEqual(
      expect.arrayContaining(["ORDER_CREATED", "ORDER_ACCEPTED", "ORDER_DISPATCHED", "DELIVERY_COMPLETED", "CUSTOMER_RECEIVED"]),
    );
    expect(JSON.stringify(t2.body)).not.toContain("Model Town");
    expect(JSON.stringify(t2.body)).not.toContain("Asha");

    // Full private history (farmer view) is ordered and chained
    const events = await farmer.agent.get(`/api/lots/${lot.id}/events`);
    const ev = events.body as Array<{ id: string; previousEventId: string | null; actorRole: string | null }>;
    expect(ev.length).toBeGreaterThanOrEqual(12);
    expect(ev.filter((e) => e.previousEventId === null)).toHaveLength(1); // exactly one chain head (LOT_CREATED)
    expect(new Set(ev.map((e) => e.previousEventId).filter(Boolean)).size).toBe(ev.length - 1); // linear chain, no forks

    // 27. Admin dashboard reflects everything
    const dash = await admin.agent.get("/api/dashboard/overview");
    expect(dash.status).toBe(200);
    expect(dash.body.totalFarmers).toBeGreaterThanOrEqual(1);
    expect(dash.body.verifiedFarmers).toBeGreaterThanOrEqual(1);
    expect(dash.body.completedOrders).toBeGreaterThanOrEqual(1);
    expect(dash.body.qrScansToday).toBeGreaterThanOrEqual(1);
    expect(dash.body.soldQuantity).toBeGreaterThanOrEqual(150);
    expect(dash.body.traceEvents).toBeGreaterThanOrEqual(ev.length);
    const adminEvents = await admin.agent.get("/api/admin/events?eventType=CUSTOMER_RECEIVED");
    expect(adminEvents.body.some((e: { lotId: string }) => e.lotId === lot.id)).toBe(true);
    const auditLog = await admin.agent.get("/api/admin/audit-logs");
    expect(auditLog.body.map((a: { action: string }) => a.action)).toEqual(expect.arrayContaining(["USER_APPROVE", "LOT_CREATED", "ORDER_CREATED", "ORDER_CONFIRM_RECEIPT"]));
  });

  it("pickup orders skip dispatch and are confirmed by the customer", async () => {
    const admin = await createAdmin();
    const farmer = await registerFarmer();
    await admin.agent.post(`/api/admin/users/${farmer.user.id}/approve`).send({});
    const farm = await farmer.agent.post("/api/farms").send({ name: "Farm Two", state: "Punjab" });
    const lot = await farmer.agent.post("/api/lots").send({ farmId: farm.body.id, productName: "Potato", variety: "Kufri Pukhraj", origin: "Punjab", harvestDate: "2026-03-01", harvestQuantity: 100 });
    expect(lot.status, JSON.stringify(lot.body)).toBe(201);
    await farmer.agent.post(`/api/lots/${lot.body.id}/listing`).send({ listed: true, pricePerUnit: 20 });
    const customer = await registerCustomer();
    const o = await customer.agent.post("/api/orders").set("Idempotency-Key", newKey()).send({ items: [{ lotId: lot.body.id, quantity: 100 }], fulfillmentMethod: "CUSTOMER_PICKUP" });
    expect(o.status, JSON.stringify(o.body)).toBe(201);
    const reserved = await farmer.agent.get(`/api/lots/${lot.body.id}`);
    expect(reserved.body.status).toBe("RESERVED");
    for (const a of ["accept", "prepare", "ready"]) await farmer.agent.post(`/api/orders/${o.body.id}/${a}`).send({});
    const dispatch = await farmer.agent.post(`/api/orders/${o.body.id}/dispatch`).send({});
    expect(dispatch.status).toBe(409);
    const c = await customer.agent.post(`/api/orders/${o.body.id}/confirm-receipt`).send({});
    expect(c.body.status).toBe("CUSTOMER_CONFIRMED");
    const sold = await farmer.agent.get(`/api/lots/${lot.body.id}`);
    expect(sold.body.status).toBe("SOLD_OUT");
    const ev = await farmer.agent.get(`/api/lots/${lot.body.id}/events`);
    expect(ev.body.map((e: { eventType: string }) => e.eventType)).toContain("LOT_SOLD_OUT");
  });
});
