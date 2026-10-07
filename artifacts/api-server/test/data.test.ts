/**
 * External data pipeline. Parsers are tested on REAL captured source material (the PAU page and real FAOSTAT rows
 * in test/fixtures). The mandi adapter is tested on the documented response shape using clearly synthetic TEST records
 * that exist only inside this file; they are never used by the application.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { zipSync, strToU8 } from "fflate";
import { alertsTable, db, externalIngestionRunsTable, externalRawPayloadsTable, marketPriceObservationsTable, referenceStatisticsTable } from "@workspace/db";
import { agent, createAdmin, registerCustomer, registerFarmer, type Agent } from "./helpers";
import { parsePauPage, validatePau } from "../src/services/external/adapters/pau";
import { isIndiaPotato, parseFaoLine, splitCsvLine, validateFao } from "../src/services/external/adapters/faostat";
import { checkMarketRecord, parseCsv } from "../src/services/external/adapters/mandi";
import { checkWeather } from "../src/services/external/adapters/weather";
import { ingestFaostat, ingestMarketPrices, ingestPau } from "../src/services/external/ingestion";
import { computeFreshness } from "../src/services/external/status";
import { REGISTRY, syncRegistry } from "../src/services/external/registry";
import { runDueSources } from "../src/services/scheduler";

const pauHtml = readFileSync(join(__dirname, "fixtures/pau_potato_cult.html"), "utf8");
const faoCsv = readFileSync(join(__dirname, "fixtures/fao_qcl_sample.csv"), "utf8");

const textResponse = (body: string, type = "text/html") => new Response(body, { status: 200, headers: { "content-type": type } });
afterEach(() => vi.unstubAllGlobals());

describe("PAU parser and validator (real page)", () => {
  it("extracts the period, attribution, district rows and state total from the real PAU page", () => {
    const p = parsePauPage(pauHtml);
    expect(p.periodLabel).toBe("2023-24");
    expect(p.yearStart).toBe(2023);
    expect(p.attribution).toMatch(/Department of Horticulture, Punjab/);
    expect(p.rows.length).toBeGreaterThanOrEqual(20);
    expect(p.rows.find((r) => r.district === "Jalandhar")).toEqual({ district: "Jalandhar", areaHa: 25125, productionT: 707018, yieldQPerHa: 281.4 });
    expect(p.state).toMatchObject({ areaHa: 117066, productionT: 3238759 });
    expect(p.majorDistrictsSentence).toMatch(/Jalandhar, Hoshiarpur, Kapurthala, Ludhiana, Amritsar, Bathinda and Fatehgarh Sahib/);
  });

  it("validates internal consistency and reports (not hides) anything it rejects", () => {
    const p = parsePauPage(pauHtml);
    const v = validatePau(p);
    expect(v.accepted.length + v.rejected.length).toBe(p.rows.length);
    expect(v.accepted.find((r) => r.district === "Jalandhar")).toBeTruthy();
    // tamper: impossible yield, negative area, duplicate, non-numeric
    const bad = validatePau({ ...p, rows: [{ district: "A", areaHa: 100, productionT: 1000, yieldQPerHa: 500 }, { district: "B", areaHa: -5, productionT: 10, yieldQPerHa: 5 }, { district: "C", areaHa: 100, productionT: 1000, yieldQPerHa: 100 }, { district: "C", areaHa: 100, productionT: 1000, yieldQPerHa: 100 }, { district: "D", areaHa: NaN, productionT: 1, yieldQPerHa: 1 }] });
    expect(bad.accepted.map((r) => r.district)).toEqual(["C"]);
    expect(bad.rejected).toHaveLength(4);
  });

  it("fails loudly when the page layout changes instead of inventing data", () => {
    expect(() => parsePauPage("<html><body>no table here</body></html>")).toThrow(/layout changed|heading/);
  });
});

describe("FAOSTAT parser (real rows)", () => {
  const lines = faoCsv.split("\n").slice(1).filter(Boolean);
  it("splits quoted CSV with commas inside quotes", () => {
    expect(splitCsvLine('"2","\'004","Afghanistan","221","\'01371","Almonds, in shell","5510","Production","2023","2023","t","67000.000000","A",')[5]).toBe("Almonds, in shell");
  });
  it("keeps only India potato area, yield and production and validates units and consistency", () => {
    const rows = lines.map(parseFaoLine).filter((r) => r && isIndiaPotato(r)) as NonNullable<ReturnType<typeof parseFaoLine>>[];
    expect(rows).toHaveLength(9); // 3 years × 3 elements; Afghanistan almonds and India wheat are excluded
    const v = validateFao(rows);
    expect(v.accepted).toHaveLength(9);
    expect(v.rejected).toHaveLength(0);
    expect(v.warnings).toHaveLength(0);
    const wrongUnit = validateFao([{ ...rows[0], unit: "acres" }]);
    expect(wrongUnit.rejected[0]).toMatch(/unit/);
  });
});

describe("mandi record validation", () => {
  const ok = { state: "Punjab", district: "Jalandhar", market: "TEST Market", commodity: "Potato", variety: "Other", grade: "FAQ", arrival_date: "06/10/2026", min_price: "800", max_price: "1200", modal_price: "1000" };
  it("normalises valid records and never fabricates missing fields", () => {
    expect(checkMarketRecord(ok)).toMatchObject({ observationDate: "2026-10-06", modalPrice: 1000, arrivalQuantityTonnes: null });
    expect(checkMarketRecord({ ...ok, arrivals_in_qtl: "50" })).toMatchObject({ arrivalQuantityTonnes: 5 });
  });
  it("rejects with a reason: bad date, no price, min>max, modal outside range, future date", () => {
    expect(checkMarketRecord({ ...ok, arrival_date: "31/02/2026x" })).toMatch(/date/);
    expect(checkMarketRecord({ ...ok, min_price: "", max_price: "", modal_price: "" })).toMatch(/no usable price/);
    expect(checkMarketRecord({ ...ok, min_price: "900", max_price: "100" })).toMatch(/min price above max/);
    expect(checkMarketRecord({ ...ok, modal_price: "5000" })).toMatch(/modal price outside/);
    expect(checkMarketRecord({ ...ok, arrival_date: "01/01/2999" })).toMatch(/future/);
  });
  it("parses CSV exports from the portal", () => {
    expect(parseCsv('State,District,Market,Commodity,Arrival_Date\nPunjab,Jalandhar,"A, B",Potato,06/10/2026')[0]).toMatchObject({ market: "A, B", district: "Jalandhar" });
  });
});

describe("weather validation", () => {
  it("accepts plausible values and rejects impossible ones (no clamping)", () => {
    expect(checkWeather({ time: "2026-10-07T15:00", temperature_2m: 27, relative_humidity_2m: 70, precipitation: 0, weather_code: 0 })).toMatchObject({ t: 27 });
    expect(checkWeather({ time: "2026-10-07T15:00", temperature_2m: 99 })).toMatch(/out of range/);
    expect(checkWeather({ time: "2026-10-07T15:00", relative_humidity_2m: 140 })).toMatch(/out of range/);
    expect(checkWeather(undefined)).toMatch(/missing/);
  });
});

describe("freshness vocabulary", () => {
  const now = new Date("2026-10-07T12:00:00Z");
  const ago = (h: number) => new Date(now.getTime() - h * 3_600_000);
  const e = { integration: "automated" as const, staleAfterHours: 72 };
  it("is CURRENT / CACHED / STALE / NO_DATA / NOT_INTEGRATED", () => {
    expect(computeFreshness(e, ago(5), false, now)).toBe("CURRENT");
    expect(computeFreshness(e, ago(5), true, now)).toBe("CACHED"); // latest attempt failed, validated data still inside the window
    expect(computeFreshness(e, ago(100), false, now)).toBe("STALE");
    expect(computeFreshness(e, ago(100), true, now)).toBe("STALE");
    expect(computeFreshness(e, null, false, now)).toBe("NO_DATA");
    expect(computeFreshness({ integration: "reference_only", staleAfterHours: null }, null, false, now)).toBe("NOT_INTEGRATED");
  });
});

describe("pipeline end to end", () => {
  let admin: Awaited<ReturnType<typeof createAdmin>>;
  let farmerAgent: Agent;
  beforeAll(async () => {
    admin = await createAdmin();
    farmerAgent = (await registerFarmer()).agent;
    await syncRegistry();
  });

  it("the registry covers every named source and is mirrored into the database", async () => {
    const ids = REGISTRY.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(["pau_potato_punjab", "datagov_mandi_daily", "agmarknet_portal", "faostat_potato_india", "open_meteo_current", "imd_mausam", "icar_cpri_jalandhar", "des_agri", "nhb_statistics"]));
    for (const r of REGISTRY) for (const k of ["organization", "url", "dataset", "geography", "frequency", "licence", "integrationNote"] as const) expect(r[k], `${r.id}.${k}`).toBeTruthy();
    expect(((await db.execute(sql`SELECT count(*)::int n FROM data_sources`)).rows[0] as { n: number }).n).toBe(REGISTRY.length);
  });

  it("PAU: fetch → raw → validate → normalise → master, idempotent, with lineage and cited API output", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => textResponse(pauHtml)));
    const run = await ingestPau();
    expect(run.status === "SUCCESS" || run.status === "PARTIAL").toBe(true);
    expect(run.recordCount).toBeGreaterThanOrEqual(20);
    expect(run.fetchedCount).toBe(run.recordCount + run.rejectedCount);
    const [raw] = await db.select().from(externalRawPayloadsTable).where(eq(externalRawPayloadsTable.runId, run.id));
    expect(raw.body).toContain("Potato Cultivation in Punjab"); // untouched raw copy
    expect(raw.sha256).toMatch(/^[0-9a-f]{64}$/);
    const before = ((await db.execute(sql`SELECT count(*)::int n FROM reference_statistics WHERE source_id='pau_potato_punjab'`)).rows[0] as { n: number }).n;
    await ingestPau();
    const after = ((await db.execute(sql`SELECT count(*)::int n FROM reference_statistics WHERE source_id='pau_potato_punjab'`)).rows[0] as { n: number }).n;
    expect(after).toBe(before); // re-running updates in place, never duplicates
    expect(((await db.execute(sql`SELECT count(*)::int n FROM external_raw_payloads WHERE source_id='pau_potato_punjab'`)).rows[0] as { n: number }).n).toBeGreaterThanOrEqual(2); // raw is appended, never overwritten

    const r = await agent().get("/api/reference/punjab-potato");
    expect(r.status).toBe(200);
    expect(r.body.available).toBe(true);
    expect(r.body.period).toBe("2023-24");
    expect(r.body.districts[0]).toMatchObject({ name: "Jalandhar", rank: 1, areaHa: 25125, productionT: 707018 });
    expect(r.body.districts[0].sharePct).toBeCloseTo(21.8, 1);
    expect(r.body.attribution).toMatch(/Department of Horticulture, Punjab/);
    expect(r.body.citation).toContain("https://www.pau.edu/potato/Potato_cult.php");
    expect(r.body.source).toMatchObject({ source: "pau_potato_punjab", organization: expect.stringContaining("Punjab Agricultural University"), freshness: "CURRENT", dataClass: "historical", observationDate: "2023-24" });
    expect(r.body.majorDistrictsNote.text).toMatch(/major potato growing districts/);
  });

  it("when the source later fails: nothing breaks, last validated data stays, an alert is raised, freshness says CACHED", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } }); }));
    const run = await ingestPau();
    expect(run.status).toBe("FAILED");
    expect(run.error).toMatch(/ECONNRESET/);
    const r = await agent().get("/api/reference/punjab-potato");
    expect(r.body.available).toBe(true);
    expect(r.body.districts.length).toBeGreaterThan(0);
    expect(r.body.source.freshness).toBe("CACHED");
    const alerts = await db.select().from(alertsTable).where(eq(alertsTable.dedupeKey, "EXTERNAL_DATA_FAILURE:pau_potato_punjab"));
    expect(alerts.some((a) => !a.resolvedAt)).toBe(true);
    // a malformed page is rejected, existing data kept
    vi.stubGlobal("fetch", vi.fn(async () => textResponse("<html>garbage</html>")));
    expect((await ingestPau()).status).toBe("FAILED");
    expect((await agent().get("/api/reference/punjab-potato")).body.districts.length).toBeGreaterThan(0);
    // recovery resolves the alert
    vi.stubGlobal("fetch", vi.fn(async () => textResponse(pauHtml)));
    await ingestPau();
    expect((await db.select().from(alertsTable).where(eq(alertsTable.dedupeKey, "EXTERNAL_DATA_FAILURE:pau_potato_punjab"))).every((a) => a.resolvedAt)).toBe(true);
  });

  it("FAOSTAT: streams a zip, keeps only India potatoes, labels the series historical and national", async () => {
    const zip = zipSync({ "Production_Crops_Livestock_E_All_Data_(Normalized).csv": strToU8(faoCsv), "Production_Crops_Livestock_E_Flags.csv": strToU8("Flag,Description\nA,Official figure\n") });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(zip, { status: 200 })));
    const run = await ingestFaostat();
    expect(run.status).toBe("SUCCESS");
    expect(run.recordCount).toBe(9);
    const r = await agent().get("/api/reference/faostat-potato-india");
    expect(r.body.label).toBe("Historical data");
    expect(r.body.geography).toMatch(/national/i);
    expect(r.body.series.map((s: { year: number }) => s.year)).toEqual([2022, 2023, 2024]);
    expect(r.body.series[2]).toEqual({ year: 2024, productionT: 57053344, areaHa: 2322229, yieldKgPerHa: 24568.4 });
    expect(r.body.source.organization).toMatch(/Food and Agriculture Organization/);
    const [stat] = await db.select().from(referenceStatisticsTable).where(eq(referenceStatisticsTable.sourceId, "faostat_potato_india")).limit(1);
    expect(stat.citation).toMatch(/CC BY 4\.0/);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not a zip", { status: 200 })));
    expect((await ingestFaostat()).status).toBe("FAILED");
  });

  it("mandi: stores validated daily observations, rejects bad ones with reasons, and never guesses a missing district", async () => {
    const payload = {
      total: 3,
      records: [
        { state: "Punjab", district: "Jalandhar", market: "TEST Jalandhar City", commodity: "Potato", variety: "Other", grade: "FAQ", arrival_date: "06/10/2026", min_price: "900", max_price: "1300", modal_price: "1100" },
        { state: "Punjab", district: "Ludhiana", market: "TEST Ludhiana", commodity: "Potato", variety: "Other", grade: "FAQ", arrival_date: "06/10/2026", min_price: "1000", max_price: "1400", modal_price: "1200" },
        { state: "Punjab", district: "Moga", market: "TEST Broken", commodity: "Potato", variety: "Other", grade: "FAQ", arrival_date: "06/10/2026", min_price: "900", max_price: "100", modal_price: "500" },
      ],
    };
    const f = vi.fn(async () => textResponse(JSON.stringify(payload), "application/json"));
    vi.stubGlobal("fetch", f);
    const run = await ingestMarketPrices();
    expect(run.status).toBe("PARTIAL");
    expect(run).toMatchObject({ fetchedCount: 3, recordCount: 2, rejectedCount: 1 });
    expect(run.error).toMatch(/min price above max/);
    expect(run.sourceEndpoint).not.toContain("test-key-not-a-real-key"); // secrets never reach lineage
    const calls = f.mock.calls.map((c) => String((c as unknown[])[0]));
    expect(calls[0]).toContain("filters%5Bstate.keyword%5D=Punjab");

    const farmerRef = await farmerAgent.get("/api/market/reference?district=Jalandhar");
    expect(farmerRef.status).toBe(200);
    expect(farmerRef.body.latestObservationDate).toBe("2026-10-06");
    expect(farmerRef.body.district.observation).toMatchObject({ market: "TEST Jalandhar City", modalPrice: 1100, modalPricePerKg: 11 });
    expect(farmerRef.body.stateSummary).toMatchObject({ markets: 2, modalMin: 1100, modalMax: 1200, pricePerKgMedian: 11.5 });
    expect(farmerRef.body.note).toMatch(/not a live price/i);
    expect(JSON.stringify(farmerRef.body)).not.toMatch(/"LIVE"/i);
    // a district with no record: explicit null, never an estimate
    const moga = await farmerAgent.get("/api/market/reference?district=Moga");
    expect(moga.body.district.observation).toBeNull();
    expect(moga.body.district.name).toBe("Moga");
    expect((await (await registerCustomer()).agent.get("/api/market/reference")).status).toBe(403);
    await db.delete(marketPriceObservationsTable).where(eq(marketPriceObservationsTable.source, "datagov_mandi_daily"));
    expect((await farmerAgent.get("/api/market/reference?district=Jalandhar")).body).toMatchObject({ latestObservationDate: null, markets: [], stateSummary: null });
  });

  it("an unreachable mandi API leaves previous data intact and reports the real error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } }); }));
    const run = await ingestMarketPrices();
    expect(run.status).toBe("FAILED");
    expect(run.error).toContain("ECONNRESET");
  });

  it("source health is visible to admins and farmers, not customers; reference-only sources never claim data", async () => {
    const list = await admin.agent.get("/api/data/sources");
    expect(list.status).toBe(200);
    const by = Object.fromEntries(list.body.map((s: { source: string }) => [s.source, s]));
    expect(by.pau_potato_punjab.freshness).toBe("CURRENT");
    expect(by.pau_potato_punjab.lastSyncAt).toBeTruthy();
    for (const id of ["agmarknet_portal", "imd_mausam", "icar_cpri_jalandhar", "des_agri", "nhb_statistics"]) {
      expect(by[id].freshness).toBe("NOT_INTEGRATED");
      expect(by[id].lastSyncAt).toBeNull();
      expect(by[id].integrationNote).toBeTruthy();
    }
    expect(by.icar_cpri_jalandhar.integrationNote).toMatch(/expired TLS certificate/);
    expect(by.open_meteo_current.usageNotes).toMatch(/NOT India Meteorological Department/i);
    expect((await farmerAgent.get("/api/data/sources")).status).toBe(200);
    expect((await (await registerCustomer()).agent.get("/api/data/sources")).status).toBe(403);
    expect((await admin.agent.post("/api/admin/integrations/imd_mausam/run")).status).toBe(400);
    expect((await farmerAgent.post("/api/admin/integrations/pau_potato_punjab/run")).status).toBe(403);
  });

  it("the scheduler only runs sources that are due and configured", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => textResponse(pauHtml)));
    const ran = await runDueSources(Date.now());
    expect(ran).not.toContain("pau_potato_punjab"); // ran moments ago
    expect(ran).not.toContain("faostat_potato_india"); // ran moments ago
    const later = await runDueSources(Date.now() + 8 * 86_400_000);
    expect(later).toContain("pau_potato_punjab");
    expect(later).not.toContain("faostat_potato_india"); // monthly
    await db.delete(externalIngestionRunsTable).where(eq(externalIngestionRunsTable.source, "never_existed"));
  });
});
