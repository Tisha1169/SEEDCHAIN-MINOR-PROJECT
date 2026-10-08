/** Packages, tamper-evident seals, package QR tokens and the physical-integrity block on the public trace. */
import { beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db, packagesTable, pool } from "@workspace/db";
import { canTransitionSeal, cleanNote, integrityOf, newSealId, summarizePhysical } from "../src/domain/seals";
import { agent, approvedFarmerWithFarm, createAdmin, harvestedListedLot, registerCustomer } from "./helpers";

describe("seal rules (pure)", () => {
  it("only allows the documented transitions for each role", () => {
    expect(canTransitionSeal("ASSIGNED", "DISPATCH_VERIFIED", "farmer")).toBe(true);
    expect(canTransitionSeal("ASSIGNED", "INTACT", "farmer")).toBe(false); // a farmer cannot declare their own package inspected-intact
    expect(canTransitionSeal("DISPATCH_VERIFIED", "INTACT", "farmer")).toBe(false);
    expect(canTransitionSeal("DISPATCH_VERIFIED", "INTACT", "admin")).toBe(true);
    expect(canTransitionSeal("BROKEN", "INTACT", "admin")).toBe(false); // a broken seal can be replaced, never "un-broken"
    expect(canTransitionSeal("BROKEN", "REPLACED", "farmer")).toBe(true);
    expect(canTransitionSeal("REPLACED", "DISPATCH_VERIFIED", "farmer")).toBe(true);
    expect(canTransitionSeal("REPORTED", "BROKEN", "farmer")).toBe(false);
  });
  it("derives integrity from the seal state and summarises a lot conservatively", () => {
    expect(integrityOf("ASSIGNED")).toBe("NOT_CHECKED");
    expect(integrityOf("INTACT")).toBe("OK");
    expect(integrityOf("REPLACED")).toBe("EXCEPTION");
    expect(summarizePhysical([]).state).toBe("NO_SEALS");
    expect(summarizePhysical([{ sealStatus: "INTACT" }, { sealStatus: "DISPATCH_VERIFIED" }]).state).toBe("INTACT");
    expect(summarizePhysical([{ sealStatus: "INTACT" }, { sealStatus: "ASSIGNED" }]).state).toBe("NOT_VERIFIED");
    expect(summarizePhysical([{ sealStatus: "INTACT" }, { sealStatus: "REPORTED" }]).state).toBe("EXCEPTION"); // one bad package is enough
  });
  it("makes seal ids random, readable and unique, and sanitises free text", () => {
    const ids = new Set(Array.from({ length: 500 }, newSealId));
    expect(ids.size).toBe(500);
    for (const id of ids) expect(id).toMatch(/^SC-SEAL-[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{8}$/);
    expect(cleanNote("  line1\n\tline2\u0000  <script>x</script>  ")).toBe("line1 line2 <script>x</script>"); // kept as inert text; rendered as text, never HTML
    expect(cleanNote("x".repeat(1000))).toHaveLength(300);
    expect(cleanNote("   ")).toBeNull();
  });
});

let admin: Awaited<ReturnType<typeof createAdmin>>;
let farmer: Awaited<ReturnType<typeof approvedFarmerWithFarm>>;
let lot: { id: string; lotCode: string; activeQr: { publicToken: string } };
let packages: { id: string; label: string; sealId: string; publicToken: string; quantity: number }[];

beforeAll(async () => {
  admin = await createAdmin();
  farmer = await approvedFarmerWithFarm(admin.agent);
  const l = await harvestedListedLot(farmer.agent, farmer.farm.id, 1000, 20);
  lot = l;
});

describe("creating packages", () => {
  it("splits a harvested lot into sealed packages, each with its own random token and seal id", async () => {
    const r = await farmer.agent.post(`/api/lots/${lot.id}/packages`).send({ count: 4, quantityEach: 50 });
    expect(r.status).toBe(201);
    packages = r.body;
    expect(packages).toHaveLength(4);
    expect(packages.map((p) => p.label)).toEqual(["PKG-001", "PKG-002", "PKG-003", "PKG-004"]);
    expect(new Set(packages.map((p) => p.sealId)).size).toBe(4);
    expect(new Set(packages.map((p) => p.publicToken)).size).toBe(4);
    for (const p of packages) {
      expect(p.publicToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(p.publicToken).not.toBe(lot.activeQr.publicToken);
    }
  });
  it("refuses to package more than the lot holds, and before harvest", async () => {
    const r = await farmer.agent.post(`/api/lots/${lot.id}/packages`).send({ quantities: [900] }); // 200 already packaged, 800 left
    expect(r.status).toBe(409);
    expect(r.body.code).toBe("EXCEEDS_LOT_QUANTITY");
    const unharvested = await farmer.agent.post("/api/lots").send({ farmId: farmer.farm.id, productName: "Potato", variety: "x", origin: "Nakodar, Jalandhar, Punjab" });
    expect(unharvested.status).toBe(201);
    const none = await farmer.agent.post(`/api/lots/${unharvested.body.id}/packages`).send({ count: 1, quantityEach: 5 });
    expect(none.status).toBe(409);
    expect(none.body.code).toBe("NOT_HARVESTED");
  });
  it("is restricted to the lot's own farmer or an admin", async () => {
    const other = await approvedFarmerWithFarm(admin.agent);
    expect((await other.agent.post(`/api/lots/${lot.id}/packages`).send({ count: 1, quantityEach: 1 })).status).toBe(404);
    expect((await other.agent.get(`/api/lots/${lot.id}/packages`)).status).toBe(404);
    const c = await registerCustomer();
    expect((await c.agent.get(`/api/lots/${lot.id}/packages`)).status).toBe(403);
    expect((await agent().get(`/api/lots/${lot.id}/packages`)).status).toBe(401);
    expect((await admin.agent.get(`/api/lots/${lot.id}/packages`)).status).toBe(200);
  });
});

describe("seal workflow", () => {
  it("lets a farmer verify seals at dispatch but not declare them intact; admin can", async () => {
    const [a, b, c, d] = packages;
    expect((await farmer.agent.post(`/api/packages/${a.id}/seal`).send({ status: "INTACT" })).status).toBe(409);
    for (const p of [a, b, c, d]) {
      const r = await farmer.agent.post(`/api/packages/${p.id}/seal`).send({ status: "DISPATCH_VERIFIED" });
      expect(r.status).toBe(200);
      expect(r.body.integrityStatus).toBe("OK");
    }
    const pub = await agent().get(`/api/trace/${lot.activeQr.publicToken}`);
    expect(pub.body.timeline.some((e: { label: string }) => e.label === "Package seals verified at dispatch")).toBe(true);
    expect((await admin.agent.post(`/api/packages/${a.id}/seal`).send({ status: "INTACT" })).body.sealStatus).toBe("INTACT");
  });

  it("public trace by lot QR summarises seals; by package QR it shows that package and its seal id", async () => {
    const lotView = await agent().get(`/api/trace/${lot.activeQr.publicToken}`);
    expect(lotView.status).toBe(200);
    expect(lotView.body.scope).toBe("LOT");
    expect(lotView.body.physicalIntegrity).toMatchObject({ scope: "LOT", state: "INTACT", packagesTotal: 4 });
    expect(lotView.body.digitalIdentity).toMatchObject({ qrValid: true, lotRegistered: true });
    const pkgView = await agent().get(`/api/trace/${packages[1].publicToken}`);
    expect(pkgView.status).toBe(200);
    expect(pkgView.body.scope).toBe("PACKAGE");
    expect(pkgView.body.lotCode).toBe(lot.lotCode);
    expect(pkgView.body.physicalIntegrity.package).toMatchObject({ label: "PKG-002", sealId: packages[1].sealId, sealStatus: "DISPATCH_VERIFIED" });
    // nothing private rides along
    const text = JSON.stringify(pkgView.body);
    expect(text).not.toContain(farmer.email);
    expect(text).not.toContain(packages[1].id);
  });

  it("a package scan is recorded against the lot's QR", async () => {
    const r = await agent().post("/api/scans").send({ publicToken: packages[2].publicToken, scanSource: "camera_link", clientEventId: crypto.randomUUID() });
    expect(r.status).toBe(200);
    expect(r.body.result).toBe("OK");
  });

  it("a customer report puts only that package under review and raises an alert; the lot-level state becomes an exception", async () => {
    const r = await agent().post(`/api/trace/${packages[3].publicToken}/report-seal`).send({ kind: "SEAL_BROKEN", note: "Seal was already torn when I opened the bag" });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ recorded: true, scope: "PACKAGE", alreadyUnderReview: false });
    const [row] = await db.select().from(packagesTable).where(eq(packagesTable.id, packages[3].id));
    expect(row.sealStatus).toBe("REPORTED");
    expect(row.integrityStatus).toBe("EXCEPTION");

    const pkgView = await agent().get(`/api/trace/${packages[3].publicToken}`);
    expect(pkgView.body.physicalIntegrity.state).toBe("EXCEPTION");
    const other = await agent().get(`/api/trace/${packages[0].publicToken}`);
    expect(other.body.physicalIntegrity.state).toBe("INTACT"); // the other packages are unaffected
    const lotView = await agent().get(`/api/trace/${lot.activeQr.publicToken}`);
    expect(lotView.body.physicalIntegrity.state).toBe("EXCEPTION");
    expect(lotView.body.timeline.some((e: { label: string }) => e.label === "Seal integrity exception recorded")).toBe(true);

    const alerts = await admin.agent.get("/api/alerts?state=all");
    expect(alerts.body.some((a: { type: string; entityId: string }) => a.type === "SEAL_EXCEPTION" && a.entityId === lot.id)).toBe(true);
    const again = await agent().post(`/api/trace/${packages[3].publicToken}/report-seal`).send({ kind: "SEAL_MISSING" });
    expect(again.body.alreadyUnderReview).toBe(true);
  });

  it("validates and sanitises public reports; unknown tokens 404", async () => {
    expect((await agent().post(`/api/trace/${packages[0].publicToken}/report-seal`).send({ kind: "NONSENSE" })).status).toBe(400);
    expect((await agent().post(`/api/trace/${"x".repeat(43)}/report-seal`).send({ kind: "OTHER" })).status).toBe(404);
    expect((await agent().post(`/api/trace/short/report-seal`).send({ kind: "OTHER" })).status).toBe(404);
    expect((await agent().post(`/api/trace/${packages[0].publicToken}/report-seal`).send({ kind: "OTHER", note: "y".repeat(900) })).status).toBe(400); // over-long text is refused
    const r = await agent().post(`/api/trace/${packages[0].publicToken}/report-seal`).send({ kind: "OTHER", note: `<img src=x onerror=alert(1)>\n\t${"y".repeat(250)}` });
    expect(r.status).toBe(201);
    const ev = await db.execute(sql`SELECT note FROM package_events WHERE package_id = ${packages[0].id} AND event_type = 'SEAL_REPORTED'`);
    const note = (ev.rows[0] as { note: string }).note;
    expect(note.length).toBeLessThanOrEqual(320);
    expect(note).not.toMatch(/[\n\t]/); // control characters are flattened; the markup stays inert text
  });

  it("an exception is resolved only by admin action and a replacement seal must be re-verified; history is append-only", async () => {
    const p = packages[3];
    expect((await farmer.agent.post(`/api/packages/${p.id}/seal`).send({ status: "INTACT", note: "it is fine" })).status).toBe(409);
    expect((await admin.agent.post(`/api/packages/${p.id}/seal`).send({ status: "BROKEN" })).status).toBe(400); // a note is required
    expect((await admin.agent.post(`/api/packages/${p.id}/seal`).send({ status: "BROKEN", note: "Confirmed torn, inspected" })).body.sealStatus).toBe("BROKEN");
    const replaced = await farmer.agent.post(`/api/packages/${p.id}/seal`).send({ status: "REPLACED", note: "Repacked and resealed" });
    expect(replaced.status).toBe(200);
    expect(replaced.body.sealId).not.toBe(p.sealId); // a new serial is issued; the old one stays in history
    expect(replaced.body.integrityStatus).toBe("EXCEPTION");
    expect((await farmer.agent.post(`/api/packages/${p.id}/seal`).send({ status: "DISPATCH_VERIFIED" })).body.integrityStatus).toBe("OK");

    const hist = (await admin.agent.get(`/api/lots/${lot.id}/packages`)).body.find((x: { id: string }) => x.id === p.id).history;
    expect(hist.map((h: { eventType: string }) => h.eventType)).toEqual(expect.arrayContaining(["SEAL_ASSIGNED", "SEAL_REPORTED", "SEAL_BROKEN", "SEAL_REPLACED", "SEAL_DISPATCH_VERIFIED"]));
    expect(JSON.stringify(hist)).toContain(p.sealId); // the replaced serial is preserved in the note
    await expect(pool.query("UPDATE package_events SET note = 'edited' WHERE package_id = $1", [p.id])).rejects.toThrow(/append-only/);
    await expect(pool.query("DELETE FROM package_events WHERE package_id = $1", [p.id])).rejects.toThrow(/append-only/);
  });

  it("a revoked lot QR also disables its package tokens", async () => {
    const f2 = await approvedFarmerWithFarm(admin.agent);
    const l2 = await harvestedListedLot(f2.agent, f2.farm.id, 100, 10);
    const pk = (await f2.agent.post(`/api/lots/${l2.id}/packages`).send({ count: 1, quantityEach: 10 })).body[0];
    expect((await agent().get(`/api/trace/${pk.publicToken}`)).status).toBe(200);
    const qrId = (await f2.agent.get(`/api/lots/${l2.id}/qr`)).body[0].id;
    expect((await admin.agent.post(`/api/admin/qr/${qrId}/disable`).send({ reason: "Investigating a report" })).status).toBe(200);
    expect((await agent().get(`/api/trace/${pk.publicToken}`)).status).toBe(410);
  });
});
