/**
 * QR anomaly signals. These flag *potentially* suspicious scan patterns for a
 * human to look at. They never declare fraud and never act on their own.
 *
 * Positions are coarse (rounded to 0.1°, about 11 km) and shared only with
 * explicit consent, so every distance below is reduced by a tolerance before
 * it is compared with the thresholds.
 */

export interface ScanPoint {
  at: Date;
  lat: number;
  lon: number;
  sessionId?: string | null;
}

export const ANOMALY_THRESHOLDS = {
  /** Rounding to 0.1° on both scans can shift each point by ~8 km; use 30 km total as slack. */
  coordinateToleranceKm: 30,
  impossibleSpeedKmh: 900,
  impossibleMinKm: 100,
  /** Distant scans of one label in a short time: possible but unusual for a single physical product. */
  distantMinKm: 250,
  distantWithinHours: 2,
  lookbackHours: 24,
  burstSessions: 15,
  burstWindowMinutes: 10,
} as const;

const R = 6371;
export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const roundCoord = (v: number) => Math.round(v * 10) / 10;

export interface TravelSignal {
  kind: "IMPOSSIBLE_TRAVEL" | "DISTANT_SCANS";
  distanceKm: number;
  effectiveKm: number;
  hours: number;
  impliedSpeedKmh: number | null;
  fromAt: string;
  toAt: string;
}

/** Compares a new scan with the earlier scans of the same QR (newest first not required). */
export function detectTravelAnomaly(previous: ScanPoint[], current: ScanPoint): TravelSignal | null {
  const T = ANOMALY_THRESHOLDS;
  let best: TravelSignal | null = null;
  for (const p of previous) {
    const hours = (current.at.getTime() - p.at.getTime()) / 3_600_000;
    if (hours < 0 || hours > T.lookbackHours) continue;
    const distanceKm = haversineKm(p, current);
    const effectiveKm = Math.max(0, distanceKm - T.coordinateToleranceKm);
    const speed = hours > 0 ? effectiveKm / hours : effectiveKm > 0 ? Infinity : 0;
    let kind: TravelSignal["kind"] | null = null;
    if (effectiveKm >= T.impossibleMinKm && speed > T.impossibleSpeedKmh) kind = "IMPOSSIBLE_TRAVEL";
    else if (effectiveKm >= T.distantMinKm && hours <= T.distantWithinHours) kind = "DISTANT_SCANS";
    if (!kind) continue;
    const sig: TravelSignal = {
      kind,
      distanceKm: Math.round(distanceKm),
      effectiveKm: Math.round(effectiveKm),
      hours: Math.round(hours * 100) / 100,
      impliedSpeedKmh: Number.isFinite(speed) ? Math.round(speed) : null,
      fromAt: p.at.toISOString(),
      toAt: current.at.toISOString(),
    };
    if (!best || (kind === "IMPOSSIBLE_TRAVEL" && best.kind !== "IMPOSSIBLE_TRAVEL")) best = sig;
  }
  return best;
}

export function isSessionBurst(distinctSessionsInWindow: number): boolean {
  return distinctSessionsInWindow >= ANOMALY_THRESHOLDS.burstSessions;
}
