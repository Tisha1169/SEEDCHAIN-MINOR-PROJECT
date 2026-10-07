
import { db, referenceNotesTable, referenceStatisticsTable } from "@workspace/db";
import { config } from "../../../config";
import { fetchText, runAdapter } from "../pipeline";

/**
 * PAU potato page → district statistics.
 *
 * The page publishes a table "Area and Production of Potato Crop in major potato growing
 * districts of Punjab during <year>*" with a footnote "*Source: Department of Horticulture,
 * Punjab, <year>", and a sentence naming the major districts. We parse exactly that, validate it,
 * and store it with the page URL as citation. Nothing is typed in from memory.
 */

export const PAU_URL = "https://www.pau.edu/potato/Potato_cult.php";
export const PAU_VERSION = "pau-parser-v1";

export interface PauRow {
  district: string;
  areaHa: number;
  productionT: number;
  yieldQPerHa: number;
}
export interface PauParsed {
  periodLabel: string;
  yearStart: number;
  attribution: string;
  rows: PauRow[];
  state: PauRow | null;
  majorDistrictsSentence: string | null;
  varietiesSentence: string | null;
}

const text = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const num = (s: string) => {
  const n = Number(s.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : NaN;
};

export function parsePauPage(html: string): PauParsed {
  const heading = html.match(/Area and Production of Potato Crop[^<]*?during\s*(\d{4}-\d{2})/i);
  if (!heading) throw new Error("Could not find the district table heading (page layout changed?)");
  const period = heading[1];
  const after = html.slice(html.indexOf(heading[0]));
  const tableHtml = after.match(/<table[\s\S]*?<\/table>/i)?.[0];
  if (!tableHtml) throw new Error("District table not found after the heading");
  const rows: PauRow[] = [];
  let state: PauRow | null = null;
  for (const tr of tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const cells = (tr.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) ?? []).map(text);
    if (cells.length < 4 || /^districts?$/i.test(cells[0])) continue;
    const row: PauRow = { district: cells[0], areaHa: num(cells[1]), productionT: num(cells[2]), yieldQPerHa: num(cells[3]) };
    if (/^state$/i.test(row.district)) state = row;
    else rows.push(row);
  }
  const foot = after.match(/\*\s*Source:\s*([^<]{3,120})/i)?.[1]?.trim() ?? "Department of Horticulture, Punjab";
  const sentences = text(html).split(/(?<=\.)\s+(?=[A-Z])/);
  return {
    periodLabel: period,
    yearStart: Number(period.slice(0, 4)),
    attribution: foot,
    rows,
    state,
    majorDistrictsSentence: sentences.find((s) => /major potato growing districts/i.test(s)) ?? null,
    varietiesSentence: sentences.find((s) => /commonly grown varieties/i.test(s)) ?? null,
  };
}

export interface PauValidation {
  accepted: PauRow[];
  rejected: string[];
  warnings: string[];
}

/** A row is accepted only if its numbers are positive and internally consistent (yield ≈ production / area). */
export function validatePau(p: PauParsed): PauValidation {
  const accepted: PauRow[] = [];
  const rejected: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (const r of p.rows) {
    if (!r.district) { rejected.push("row without a district name"); continue; }
    if (seen.has(r.district.toLowerCase())) { rejected.push(`${r.district}: duplicate row`); continue; }
    if (![r.areaHa, r.productionT, r.yieldQPerHa].every((v) => Number.isFinite(v) && v > 0)) { rejected.push(`${r.district}: non-numeric or non-positive value`); continue; }
    const impliedQPerHa = (r.productionT / r.areaHa) * 10; // t/ha × 10 = q/ha
    if (Math.abs(impliedQPerHa - r.yieldQPerHa) / r.yieldQPerHa > 0.015) { rejected.push(`${r.district}: yield ${r.yieldQPerHa} q/ha disagrees with production/area (${impliedQPerHa.toFixed(1)})`); continue; }
    seen.add(r.district.toLowerCase());
    accepted.push(r);
  }
  if (p.state) {
    const sumA = accepted.reduce((s, r) => s + r.areaHa, 0);
    const sumP = accepted.reduce((s, r) => s + r.productionT, 0);
    if (Math.abs(sumA - p.state.areaHa) / p.state.areaHa > 0.01) warnings.push(`district areas sum to ${sumA} ha vs published state total ${p.state.areaHa} ha`);
    if (Math.abs(sumP - p.state.productionT) / p.state.productionT > 0.01) warnings.push(`district production sums to ${sumP} t vs published state total ${p.state.productionT} t`);
  } else warnings.push("no State total row found");
  return { accepted, rejected, warnings };
}

export async function ingestPau() {
  return runAdapter("pau_potato_punjab", PAU_URL, { url: PAU_URL }, PAU_VERSION, async (ctx) => {
    const { body, contentType } = await fetchText(PAU_URL, config.ingestion.httpTimeoutMs);
    await ctx.saveRaw(body, contentType);
    const parsed = parsePauPage(body);
    const v = validatePau(parsed);
    if (!v.accepted.length) throw new Error(`No valid district rows. ${v.rejected.slice(0, 3).join("; ")}`);
    const retrievedAt = new Date();
    const cite = `PAU, "Potato Cultivation in Punjab" (${PAU_URL}), table for ${parsed.periodLabel}; table source: ${parsed.attribution}. Retrieved ${retrievedAt.toISOString().slice(0, 10)}.`;
    const put = async (level: "district" | "state", name: string, metric: string, unit: string, value: number) => {
      await db
        .insert(referenceStatisticsTable)
        .values({ sourceId: "pau_potato_punjab", runId: ctx.runId, geographyLevel: level, geographyName: name, crop: "Potato", metric, unit, periodLabel: parsed.periodLabel, yearStart: parsed.yearStart, value, citation: cite, retrievedAt })
        .onConflictDoUpdate({
          target: [referenceStatisticsTable.sourceId, referenceStatisticsTable.geographyLevel, referenceStatisticsTable.geographyName, referenceStatisticsTable.crop, referenceStatisticsTable.metric, referenceStatisticsTable.periodLabel],
          set: { value, runId: ctx.runId, citation: cite, retrievedAt },
        });
    };
    for (const r of v.accepted) {
      await put("district", r.district, "area_ha", "ha", r.areaHa);
      await put("district", r.district, "production_tonnes", "t", r.productionT);
      await put("district", r.district, "yield_q_per_ha", "q/ha", r.yieldQPerHa);
    }
    if (parsed.state) {
      await put("state", "Punjab", "area_ha", "ha", parsed.state.areaHa);
      await put("state", "Punjab", "production_tonnes", "t", parsed.state.productionT);
      await put("state", "Punjab", "yield_q_per_ha", "q/ha", parsed.state.yieldQPerHa);
    }
    for (const [topic, t] of [["major_districts", parsed.majorDistrictsSentence], ["varieties", parsed.varietiesSentence]] as const) {
      if (!t) continue;
      await db
        .insert(referenceNotesTable)
        .values({ sourceId: "pau_potato_punjab", runId: ctx.runId, topic, text: t, retrievedAt })
        .onConflictDoUpdate({ target: [referenceNotesTable.sourceId, referenceNotesTable.topic], set: { text: t, runId: ctx.runId, retrievedAt } });
    }
    return { fetched: parsed.rows.length + (parsed.state ? 1 : 0), accepted: v.accepted.length + (parsed.state ? 1 : 0), rejected: v.rejected.length, notes: [...v.rejected, ...v.warnings.map((w) => `warning: ${w}`)] };
  });
}

