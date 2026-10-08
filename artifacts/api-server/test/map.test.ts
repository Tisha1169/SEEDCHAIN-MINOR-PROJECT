/** Map features: admin-only coarse scan areas, and event coordinates on the lot journey. */
import { beforeAll, describe, expect, it } from "vitest";
import { agent, approvedFarmerWithFarm, createAdmin, registerCustomer } from "./helpers";

let admin: Awaited<ReturnType<typeof createAdmin>>;
let farmer: Awaited<ReturnType<typeof approvedFarmerWithFarm>>;
let lot: { id: string; activeQr: { publicToken: string } };

const scan = (token: string, extra: Record<string, unknown> = {}) =>
  agent().post("/api/scans").send({ publicToken: token, scanSource: "camera_link", clientEventId: crypto.randomUUID(), sessionId: crypto.randomUUID(), ...extra });

beforeAll(async () => {
  admin = await createAdmin();
  farmer = await approvedFarmerWithFarm(admin.agent);
  const up = await farmer.agent.patch(`/api/farms/${farmer.farm.id}`).send({ name: "Green Acres", state: "Punjab", district: "Jalandhar", village: "Nakodar", latitude: 31.1256, longitude: 75.4747 });
  expect(up.status).toBe(200);
  const r = await farmer.agent.post("/api/lots").send({ farmId: farmer.farm.id, productName: "Potato", variety: "Kufri Jyoti", origin: "Nakodar, Jalandhar, Punjab", harvestDate: "2026-09-01", harvestQuantity: 400 });
  expect(r.status).toBe(201);
  lot = r.body;
});

describe("scan areas (admin only, coarse)", () => {
  it("groups located scans into ~55 km cells and never returns the submitted point", async () => {
    // Two scans in one cell, one elsewhere, one with no location shared.
    expect((await scan(lot.activeQr.publicToken, { approxLat: 31.12, approxLon: 75.47, location: "Jalandhar, Punjab" })).status).toBeLessThan(300);
    expect((await scan(lot.activeQr.publicToken, { approxLat: 31.2, approxLon: 75.6 })).status).toBeLessThan(300);
    expect((await scan(lot.activeQr.publicToken, { approxLat: 28.6, approxLon: 77.2 })).status).toBeLessThan(300);
    expect((await scan(lot.activeQr.publicToken)).status).toBeLessThan(300);

    const r = await admin.agent.get("/api/admin/scans/areas?days=30");
    expect(r.status).toBe(200);
    expect(r.body.gridDegrees).toBe(0.5);
    expect(r.body.scansWithSharedLocation).toBeGreaterThanOrEqual(3);
    expect(r.body.okScans).toBeGreaterThan(r.body.scansWithSharedLocation - 1);
    for (const c of r.body.cells) {
      // Centres sit on the grid (x.25 or x.75), so they can never equal an exact scan point.
      expect(Math.abs(((c.lat * 100) % 50) - 25)).toBeLessThan(0.001);
      expect(Math.abs(((c.lon * 100) % 50) - 25)).toBeLessThan(0.001);
    }
    const jal = r.body.cells.find((c: { lat: number; lon: number }) => c.lat === 31.25 && c.lon === 75.75);
    expect(jal.scans).toBeGreaterThanOrEqual(2);
    expect(jal.scanners).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(r.body)).not.toContain("31.12");
  });

  it("is forbidden to farmers, customers and anonymous visitors", async () => {
    const c = await registerCustomer();
    expect((await farmer.agent.get("/api/admin/scans/areas")).status).toBe(403);
    expect((await c.agent.get("/api/admin/scans/areas")).status).toBe(403);
    expect((await agent().get("/api/admin/scans/areas")).status).toBe(401);
  });

  it("rejects an out-of-range window", async () => {
    expect((await admin.agent.get("/api/admin/scans/areas?days=0")).status).toBe(400);
    expect((await admin.agent.get("/api/admin/scans/areas?days=9999")).status).toBe(400);
  });
});

describe("lot journey coordinates", () => {
  it("returns recorded event coordinates to the owner and to admins, but not on the public trace", async () => {
    const owner = await farmer.agent.get(`/api/lots/${lot.id}/events`);
    expect(owner.status).toBe(200);
    const located = owner.body.filter((e: { latitude: number | null }) => e.latitude != null);
    expect(located.length).toBeGreaterThan(0);
    expect(located[0].latitude).toBeCloseTo(31.1256, 3);
    expect((await admin.agent.get(`/api/lots/${lot.id}/events`)).status).toBe(200);
    const pub = await agent().get(`/api/trace/${lot.activeQr.publicToken}`);
    expect(JSON.stringify(pub.body)).not.toContain("31.1256");
    expect(JSON.stringify(pub.body)).not.toContain("75.4747");
  });

  it("lets admins list all farms with coordinates, and a farmer see only their own", async () => {
    const all = await admin.agent.get("/api/farms");
    expect(all.body.some((f: { id: string; latitude: number | null }) => f.id === farmer.farm.id && f.latitude != null)).toBe(true);
    const mine = await farmer.agent.get("/api/farms");
    expect(mine.body.every((f: { farmerId: string }) => f.farmerId === farmer.user.id)).toBe(true);
  });
});
