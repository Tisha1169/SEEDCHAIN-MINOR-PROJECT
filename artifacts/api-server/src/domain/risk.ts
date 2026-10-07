/**
 * Transparent rule-based spoilage/quality risk engine.
 *
 * This is NOT a machine-learning model. Every point added to the score is
 * explained in `reasons`, and thresholds are plain constants that can be
 * reviewed and tuned. The engine identifier is returned with every result
 * so clients can display exactly what produced it.
 */

export const RISK_ENGINE_ID = "rules-v1";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RiskInput {
  now: Date;
  harvested: number;
  available: number;
  loss: number;
  qualityGrade: "A" | "B" | "C" | null;
  qualityRecordedAt: Date | null;
  harvestDate: Date | null;
  storage: {
    storageType: string;
    storageStart: Date;
    storageEnd: Date | null;
    temperatureC: number | null;
    humidityPct: number | null;
    storageCondition: string | null;
  } | null;
  spoilageEventsLast30d: number;
  /** Orders accepted but not progressed for a long time. */
  stalledOrders: number;
  weather: { temperatureC: number | null; humidityPct: number | null; observationTime: Date } | null;
}

export const RISK_THRESHOLDS = {
  ambientStorageDaysWarn: 30,
  ambientStorageDaysHigh: 60,
  coldStorageDaysWarn: 150,
  coldStorageDaysHigh: 240,
  coldStorageMaxTempC: 10,
  ambientMaxTempC: 30,
  humidityHighPct: 95,
  humidityLowPct: 70,
  qualityInspectionMaxDays: 45,
  lossRateWarnPct: 5,
  lossRateHighPct: 15,
  weatherHotC: 35,
  weatherMaxAgeHours: 24,
} as const;

const DAY = 86_400_000;

export interface RiskResult {
  level: RiskLevel;
  score: number;
  reasons: string[];
  evaluatedAt: string;
  engine: string;
}

export function levelForScore(score: number): RiskLevel {
  if (score >= 70) return "CRITICAL";
  if (score >= 45) return "HIGH";
  if (score >= 20) return "MEDIUM";
  return "LOW";
}

export function assessRisk(i: RiskInput): RiskResult {
  const T = RISK_THRESHOLDS;
  const reasons: string[] = [];
  let score = 0;
  const add = (points: number, reason: string) => {
    score += points;
    reasons.push(reason);
  };

  // Nothing physical to spoil yet.
  if (i.harvested <= 0 || i.available <= 0) {
    return {
      level: "LOW",
      score: 0,
      reasons: [i.harvested <= 0 ? "No harvested stock yet" : "No remaining available stock"],
      evaluatedAt: i.now.toISOString(),
      engine: RISK_ENGINE_ID,
    };
  }

  if (i.storage && !i.storage.storageEnd) {
    const days = Math.floor((i.now.getTime() - i.storage.storageStart.getTime()) / DAY);
    const cold = i.storage.storageType === "cold_storage";
    const warn = cold ? T.coldStorageDaysWarn : T.ambientStorageDaysWarn;
    const high = cold ? T.coldStorageDaysHigh : T.ambientStorageDaysHigh;
    if (days > high) add(35, `Storage duration ${days} days exceeds ${high}-day threshold for ${i.storage.storageType}`);
    else if (days > warn) add(15, `Storage duration ${days} days exceeds ${warn}-day advisory threshold for ${i.storage.storageType}`);

    const t = i.storage.temperatureC;
    if (t != null) {
      if (cold && t > T.coldStorageMaxTempC) add(25, `Recorded cold-storage temperature ${t}°C is above ${T.coldStorageMaxTempC}°C`);
      if (!cold && t > T.ambientMaxTempC) add(20, `Recorded storage temperature ${t}°C is above ${T.ambientMaxTempC}°C`);
    }
    const h = i.storage.humidityPct;
    if (h != null) {
      if (h > T.humidityHighPct) add(15, `Recorded storage humidity ${h}% is above ${T.humidityHighPct}% (rot risk)`);
      if (h < T.humidityLowPct) add(10, `Recorded storage humidity ${h}% is below ${T.humidityLowPct}% (shrinkage risk)`);
    }
    if (i.storage.storageCondition === "poor") add(20, "Farmer reported poor storage condition");
    else if (i.storage.storageCondition === "fair") add(5, "Farmer reported fair storage condition");
  } else if (!i.storage && i.harvestDate) {
    const days = Math.floor((i.now.getTime() - i.harvestDate.getTime()) / DAY);
    if (days > T.ambientStorageDaysWarn) add(15, `Harvested ${days} days ago with no storage information recorded`);
  }

  if (i.qualityGrade === "C") add(20, "Quality grade C");
  else if (i.qualityGrade === "B") add(8, "Quality grade B");
  else if (i.qualityGrade == null) add(10, "No quality grade recorded");

  if (i.qualityRecordedAt) {
    const days = Math.floor((i.now.getTime() - i.qualityRecordedAt.getTime()) / DAY);
    if (days > T.qualityInspectionMaxDays) add(10, `Last quality inspection ${days} days ago (overdue after ${T.qualityInspectionMaxDays})`);
  }

  const lossRate = (i.loss / i.harvested) * 100;
  if (lossRate >= T.lossRateHighPct) add(25, `Recorded loss ${lossRate.toFixed(1)}% of harvest (≥ ${T.lossRateHighPct}%)`);
  else if (lossRate >= T.lossRateWarnPct) add(10, `Recorded loss ${lossRate.toFixed(1)}% of harvest (≥ ${T.lossRateWarnPct}%)`);

  if (i.spoilageEventsLast30d > 0) add(15 * Math.min(i.spoilageEventsLast30d, 3), `${i.spoilageEventsLast30d} spoilage report(s) in the last 30 days`);

  if (i.stalledOrders > 0) add(5, `${i.stalledOrders} order(s) without progress for more than 3 days`);

  if (i.weather && i.now.getTime() - i.weather.observationTime.getTime() < T.weatherMaxAgeHours * 3_600_000) {
    const ambient = !i.storage || i.storage.storageType !== "cold_storage";
    if (ambient && i.weather.temperatureC != null && i.weather.temperatureC >= T.weatherHotC) {
      add(10, `Farm weather ${i.weather.temperatureC}°C (≥ ${T.weatherHotC}°C) with non-cold storage`);
    }
  }

  if (reasons.length === 0) reasons.push("No risk factors detected by the configured rules");
  const capped = Math.min(score, 100);
  return { level: levelForScore(capped), score: capped, reasons, evaluatedAt: i.now.toISOString(), engine: RISK_ENGINE_ID };
}
