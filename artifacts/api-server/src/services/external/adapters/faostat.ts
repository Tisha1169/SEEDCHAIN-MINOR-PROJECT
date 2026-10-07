import { Unzip, UnzipInflate } from "fflate";
import { db, referenceStatisticsTable } from "@workspace/db";
import { runAdapter, sha256 } from "../pipeline";

/**
 * FAOSTAT "Crops and livestock products" bulk file → India potato series (historical benchmark).
 *
 * The FAOSTAT JSON API needs an authorisation token, so the public bulk zip is streamed
 * (≈34 MB compressed, ≈545 MB of CSV) and only the rows for India (area code 100) and
 * Potatoes (item 116) are kept. Licence: CC BY 4.0 with FAO additional terms.
 */

export const FAO_URL = "https://bulks-faostat.fao.org/production/Production_Crops_Livestock_E_All_Data_(Normalized).zip";
export const FAO_VERSION = "faostat-bulk-v1";
const CSV_NAME = "Production_Crops_Livestock_E_All_Data_(Normalized).csv";

export interface FaoRow {
  areaCode: string;
  area: string;
  itemCode: string;
  item: string;
  elementCode: string;
  element: string;
  year: number;
  unit: string;
  value: number;
  flag: string;
}

/** Minimal quoted-CSV line splitter (FAOSTAT quotes every text field and may contain commas inside quotes). */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

export const WANTED: Record<string, { metric: string; unit: string }> = {
  "5312": { metric: "area_harvested_ha", unit: "ha" },
  "5412": { metric: "yield_kg_per_ha", unit: "kg/ha" },
  "5510": { metric: "production_tonnes", unit: "t" },
};

export function parseFaoLine(line: string): FaoRow | null {
  const f = splitCsvLine(line);
  if (f.length < 13) return null;
  const year = Number(f[9]);
  return { areaCode: f[0], area: f[2], itemCode: f[3], item: f[5], elementCode: f[6], element: f[7], year, unit: f[10], value: Number(f[11]), flag: f[12] };
}

export const isIndiaPotato = (r: FaoRow) => r.areaCode === "100" && r.itemCode === "116" && r.elementCode in WANTED;

export function validateFao(rows: FaoRow[]): { accepted: FaoRow[]; rejected: string[]; warnings: string[] } {
  const accepted: FaoRow[] = [];
  const rejected: string[] = [];
  const warnings: string[] = [];
  const maxYear = new Date().getUTCFullYear();
  for (const r of rows) {
    const w = WANTED[r.elementCode];
    if (!Number.isInteger(r.year) || r.year < 1961 || r.year > maxYear) rejected.push(`${r.element} ${r.year}: year out of range`);
    else if (!Number.isFinite(r.value) || r.value < 0) rejected.push(`${r.element} ${r.year}: invalid value`);
    else if (r.unit !== w.unit) rejected.push(`${r.element} ${r.year}: unexpected unit ${r.unit}`);
    else accepted.push(r);
  }
  const by = new Map<number, Record<string, number>>();
  for (const r of accepted) by.set(r.year, { ...(by.get(r.year) ?? {}), [r.elementCode]: r.value });
  for (const [y, v] of by) {
    if (v["5312"] && v["5412"] && v["5510"] && Math.abs((v["5312"] * v["5412"]) / 1000 - v["5510"]) / v["5510"] > 0.02) warnings.push(`${y}: production differs from area × yield by more than 2%`);
  }
  return { accepted, rejected, warnings };
}

/** Streams the zip, never holding the CSV in memory. */
export async function streamIndiaPotato(body: ReadableStream<Uint8Array>): Promise<{ header: string; lines: string[]; zipSha256: string; bytes: number }> {
  const { createHash } = await import("node:crypto");
  const hash = createHash("sha256");
  let bytes = 0;
  let header = "";
  const lines: string[] = [];
  let carry = "";
  const dec = new TextDecoder();
  const unzip = new Unzip((file) => {
    if (file.name !== CSV_NAME) return;
    file.ondata = (err, chunk, final) => {
      if (err) throw err;
      carry += dec.decode(chunk, { stream: !final });
      let nl: number;
      while ((nl = carry.indexOf("\n")) >= 0) {
        const line = carry.slice(0, nl).replace(/\r$/, "");
        carry = carry.slice(nl + 1);
        if (!header) header = line;
        else if (line.startsWith('"100","') && line.includes('"116"')) lines.push(line);
      }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  const reader = body.getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    hash.update(value);
    bytes += value.length;
    unzip.push(value, false);
  }
  unzip.push(new Uint8Array(0), true);
  return { header, lines, zipSha256: hash.digest("hex"), bytes };
}

export async function ingestFaostat() {
  return runAdapter("faostat_potato_india", FAO_URL, { area: "India (100)", item: "Potatoes (116)", elements: Object.keys(WANTED) }, FAO_VERSION, async (ctx) => {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 10 * 60_000);
    try {
      const res = await fetch(FAO_URL, { signal: ctl.signal, headers: { "user-agent": "SeedChain-data-pipeline/1.0" } });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const { header, lines, zipSha256, bytes } = await streamIndiaPotato(res.body);
      if (!header.startsWith("Area Code")) throw new Error("Unexpected FAOSTAT CSV header (format changed?)");
      await ctx.saveRaw([header, ...lines].join("\n"), "text/csv", sha256([header, ...lines].join("\n")));
      const parsed = lines.map(parseFaoLine).filter((r): r is FaoRow => !!r && isIndiaPotato(r));
      const v = validateFao(parsed);
      if (!v.accepted.length) throw new Error("No India potato rows found in the bulk file");
      const retrievedAt = new Date();
      const cite = (r: FaoRow) => `FAOSTAT, Crops and livestock products (QCL), element ${r.elementCode} ${r.element}, India, Potatoes, ${r.year}; flag ${r.flag || "n/a"}. Bulk file ${bytes} bytes, SHA-256 ${zipSha256.slice(0, 16)}…, retrieved ${retrievedAt.toISOString().slice(0, 10)}. CC BY 4.0, FAO.`;
      for (const r of v.accepted) {
        const w = WANTED[r.elementCode];
        await db
          .insert(referenceStatisticsTable)
          .values({ sourceId: "faostat_potato_india", runId: ctx.runId, geographyLevel: "country", geographyName: "India", crop: "Potato", metric: w.metric, unit: w.unit, periodLabel: String(r.year), yearStart: r.year, value: r.value, citation: cite(r), retrievedAt })
          .onConflictDoUpdate({
            target: [referenceStatisticsTable.sourceId, referenceStatisticsTable.geographyLevel, referenceStatisticsTable.geographyName, referenceStatisticsTable.crop, referenceStatisticsTable.metric, referenceStatisticsTable.periodLabel],
            set: { value: r.value, runId: ctx.runId, citation: cite(r), retrievedAt },
          });
      }
      return { fetched: parsed.length, accepted: v.accepted.length, rejected: v.rejected.length, notes: [...v.rejected, ...v.warnings.map((w) => `warning: ${w}`)] };
    } finally {
      clearTimeout(timer);
    }
  });
}

