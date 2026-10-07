import { and, eq, isNotNull } from "drizzle-orm";
import { db, farmsTable, weatherObservationsTable } from "@workspace/db";
import { config } from "../../../config";
import { fetchText, runAdapter } from "../pipeline";

export const WEATHER_VERSION = "weather-normaliser-v2";

/** WMO weather interpretation codes (subset) used by Open-Meteo. */
export function describeWeatherCode(code: number | null | undefined): string | null {
  if (code == null) return null;
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorm";
}

const finite = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Validation: physically plausible ranges only; anything else is rejected, not clamped. */
export function checkWeather(c: { time?: string; temperature_2m?: number; relative_humidity_2m?: number; precipitation?: number; weather_code?: number } | undefined): string | { observationTime: Date; t: number | null; h: number | null; p: number | null; code: number | null } {
  if (!c?.time) return "missing current conditions";
  const observationTime = new Date(`${c.time}Z`);
  if (Number.isNaN(observationTime.getTime())) return "invalid observation time";
  const t = finite(c.temperature_2m), h = finite(c.relative_humidity_2m), p = finite(c.precipitation);
  if (t != null && (t < -60 || t > 60)) return `temperature ${t} out of range`;
  if (h != null && (h < 0 || h > 100)) return `humidity ${h} out of range`;
  if (p != null && (p < 0 || p > 500)) return `precipitation ${p} out of range`;
  return { observationTime, t, h, p, code: finite(c.weather_code) };
}

export async function ingestWeather(onlyFarmId?: string) {
  const farms = await db
    .select({ id: farmsTable.id, latitude: farmsTable.latitude, longitude: farmsTable.longitude })
    .from(farmsTable)
    .where(and(isNotNull(farmsTable.latitude), isNotNull(farmsTable.longitude), onlyFarmId ? eq(farmsTable.id, onlyFarmId) : undefined));
  const endpoint = `${config.ingestion.openMeteoBaseUrl}/v1/forecast`;
  return runAdapter(
    "open_meteo_current",
    endpoint,
    { farms: farms.length, variables: "temperature_2m,relative_humidity_2m,precipitation,weather_code" },
    WEATHER_VERSION,
    async (ctx) => {
      if (!farms.length) return "SKIPPED";
      let ok = 0;
      const notes: string[] = [];
      const raws: unknown[] = [];
      for (const f of farms) {
        try {
          const url = new URL(endpoint);
          url.searchParams.set("latitude", String(f.latitude));
          url.searchParams.set("longitude", String(f.longitude));
          url.searchParams.set("current", "temperature_2m,relative_humidity_2m,precipitation,weather_code");
          url.searchParams.set("timezone", "UTC");
          const { body } = await fetchText(url.toString(), config.ingestion.httpTimeoutMs);
          const json = JSON.parse(body) as { current?: Parameters<typeof checkWeather>[0] };
          raws.push({ farmId: f.id, response: json });
          const c = checkWeather(json.current);
          if (typeof c === "string") { notes.push(`farm ${f.id.slice(0, 8)}: ${c}`); continue; }
          await db
            .insert(weatherObservationsTable)
            .values({ runId: ctx.runId, farmId: f.id, source: "open_meteo_current", sourceEndpoint: url.toString(), latitude: Number(f.latitude), longitude: Number(f.longitude), observationTime: c.observationTime, retrievedAt: new Date(), temperatureC: c.t, precipitationMm: c.p, humidityPct: c.h, weatherCode: c.code, condition: describeWeatherCode(c.code), processingVersion: WEATHER_VERSION })
            .onConflictDoNothing();
          ok++;
        } catch (err) {
          notes.push(`farm ${f.id.slice(0, 8)}: ${(err as Error).message}`);
        }
      }
      await ctx.saveRaw(JSON.stringify(raws), "application/json");
      return { fetched: farms.length, accepted: ok, rejected: farms.length - ok, notes };
    },
    "No farms with GPS coordinates",
  );
}
