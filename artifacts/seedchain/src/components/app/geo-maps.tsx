import { lazy, Suspense, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Farm, TraceEvent } from "@workspace/api-client-react";
import { Card, Empty, Loading, Pill } from "@/components/app/common";
import { dateTime, enumLabel, timeAgo } from "@/lib/format";
import type { MapArea, MapPin } from "./map-view";

const MapView = lazy(() => import("./map-view"));

function Mapped({ pins, areas, path, height }: { pins?: MapPin[]; areas?: MapArea[]; path?: [number, number][]; height?: number }) {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<div className="grid place-items-center rounded-[20px] border border-white/10" style={{ height: height ?? 360 }}><Loading /></div>}>
      <MapView pins={pins} areas={areas} path={path} height={height} attribution={t("map.attribution")} />
    </Suspense>
  );
}

const hasGps = (f: Farm): f is Farm & { latitude: number; longitude: number } => f.latitude != null && f.longitude != null;

/** Farms with GPS. Admin sees everyone's; a farmer only their own (the API already scopes /farms). */
export function FarmMap({ farms, showFarmer }: { farms: Farm[]; showFarmer?: boolean }) {
  const { t } = useTranslation();
  const located = farms.filter(hasGps);
  const pins = useMemo<MapPin[]>(
    () =>
      located.map((f) => ({
        id: f.id,
        lat: f.latitude,
        lon: f.longitude,
        title: f.name,
        lines: [[f.village, f.district, f.state].filter(Boolean).join(", "), f.sizeHectares ? t("map.farms.size", { n: f.sizeHectares }) : "", showFarmer && f.farmerName ? t("map.farms.farmer", { name: f.farmerName }) : ""].filter(Boolean),
      })),
    [located, showFarmer, t],
  );
  const missing = farms.length - located.length;
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-medium">{t("map.farms.title")}</h3>
          <p className="text-xs text-ink/50">{t("map.farms.subtitle")}</p>
        </div>
        <Pill className="bg-white/10 text-ink/60">{t("map.live")}</Pill>
      </div>
      {located.length ? <Mapped pins={pins} /> : <Empty title={t("map.farms.none")} hint={t("map.farms.noneHint")} />}
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-ink/50">
        {located.length > 0 && <span>{t("map.farms.verifiedCount", { n: located.length })}</span>}
        {missing > 0 && <span className="text-amber-300">{t("map.farms.missing", { n: missing })}</span>}
      </div>
    </Card>
  );
}

/** Recorded locations of one lot's steps. Only steps that really carry coordinates are drawn. */
export function JourneyMap({ events }: { events: TraceEvent[] }) {
  const { t } = useTranslation();
  const ordered = useMemo(() => [...events].sort((a, b) => +new Date(a.eventTime) - +new Date(b.eventTime)), [events]);
  const located = ordered.filter((e) => e.latitude != null && e.longitude != null);
  const { pins, path } = useMemo(() => {
    const byPoint = new Map<string, { lat: number; lon: number; steps: { n: number; e: TraceEvent }[] }>();
    ordered.forEach((e, i) => {
      if (e.latitude == null || e.longitude == null) return;
      const k = `${e.latitude.toFixed(5)},${e.longitude.toFixed(5)}`;
      const g = byPoint.get(k) ?? { lat: e.latitude, lon: e.longitude, steps: [] };
      g.steps.push({ n: i + 1, e });
      byPoint.set(k, g);
    });
    const groups = [...byPoint.values()];
    return {
      pins: groups.map<MapPin>((g, gi) => ({
        id: `g${gi}`,
        lat: g.lat,
        lon: g.lon,
        badge: String(g.steps[0].n),
        title: g.steps[0].e.location || t("map.journey.stepsHere", { n: g.steps.length }),
        lines: g.steps.map((s) => `${s.n}. ${enumLabel("event", s.e.eventType)} · ${dateTime(s.e.eventTime)}`),
      })),
      path: groups.map<[number, number]>((g) => [g.lat, g.lon]),
    };
  }, [ordered, t]);
  const unlocated = ordered.length - located.length;
  return (
    <Card className="p-4 sm:p-5">
      <h3 className="font-medium">{t("map.journey.title")}</h3>
      <p className="mb-3 text-xs text-ink/50">{t("map.journey.subtitle")}</p>
      {located.length ? (
        <>
          <Mapped pins={pins} path={path} height={300} />
          <ol className="mt-3 space-y-1 text-xs text-ink/65" aria-label={t("map.journey.order")}>
            {ordered.map((e, i) => (
              <li key={e.id} className="flex gap-2">
                <span className="w-5 shrink-0 text-ink/40">{i + 1}.</span>
                <span>
                  {enumLabel("event", e.eventType)} · {dateTime(e.eventTime)}
                  {e.location ? ` · ${e.location}` : ""}
                  {e.latitude == null && <span className="text-ink/35"> · {"—"}</span>}
                </span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <Empty title={t("map.journey.none")} hint={t("map.journey.noneHint")} />
      )}
      <div className="mt-2 space-y-1 text-[11px] text-ink/40">
        {unlocated > 0 && located.length > 0 && <div>{t("map.journey.unlocated", { n: unlocated })}</div>}
        <div>{t("map.journey.privateNote")}</div>
      </div>
    </Card>
  );
}

export interface ScanCell { lat: number; lon: number; scans: number; scanners: number; lots: number; lastScanAt: string; label?: string | null }

/** Admin-only approximate scan areas: circles of the real cell size, never points. */
export function ScanAreasMap({ cells, approxCellKm, height = 380 }: { cells: ScanCell[]; approxCellKm: number; height?: number }) {
  const { t } = useTranslation();
  const max = Math.max(1, ...cells.map((c) => c.scans));
  const areas = useMemo<MapArea[]>(
    () =>
      cells.map((c, i) => ({
        id: `a${i}`,
        lat: c.lat,
        lon: c.lon,
        radiusKm: approxCellKm / 2,
        intensity: c.scans / max,
        title: c.label ? t("map.scans.area", { label: c.label }) : t("map.scans.areaUnnamed"),
        lines: [t("map.scans.scans", { n: c.scans }), t("map.scans.scanners", { n: c.scanners }), t("map.scans.lots", { n: c.lots }), t("map.scans.last", { when: timeAgo(c.lastScanAt) })],
      })),
    [cells, approxCellKm, max, t],
  );
  return <Mapped areas={areas} height={height} />;
}

