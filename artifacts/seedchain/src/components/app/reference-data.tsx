import { ExternalLink } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useGetFaostatIndia, useGetPunjabPotato, useListDataSources } from "@workspace/api-client-react";
import type { SourceInfo } from "@workspace/api-client-react";
import { Card, Empty, ErrorState, Loading, Pill } from "@/components/app/common";
import { dateOnly, timeAgo } from "@/lib/format";

const FRESH: Record<string, { text: string; cls: string }> = {
  CURRENT: { text: "Current", cls: "bg-emerald-400/15 text-emerald-300" },
  CACHED: { text: "Cached, last sync failed", cls: "bg-amber-400/15 text-amber-300" },
  STALE: { text: "Stale", cls: "bg-amber-400/15 text-amber-300" },
  NO_DATA: { text: "No data yet", cls: "bg-white/10 text-ink/60" },
  NOT_INTEGRATED: { text: "Not integrated", cls: "bg-white/10 text-ink/50" },
};
const CLASS: Record<string, string> = { operational_external: "External, regularly synced", historical: "Historical", reference: "Reference only" };

export function FreshnessChip({ value }: { value: string }) {
  const f = FRESH[value] ?? FRESH.NO_DATA;
  return <Pill className={`whitespace-nowrap ${f.cls}`}>{f.text}</Pill>;
}

/** Source, observation date and last sync: shown with every external figure. */
export function SourceLine({ s }: { s: Pick<SourceInfo, "label" | "organization" | "url" | "frequency" | "freshness" | "observationDate" | "lastSyncAt" | "dataClass"> }) {
  return (
    <div className="mt-3 space-y-1 text-xs text-ink/50">
      <div className="flex flex-wrap items-center gap-2">
        <FreshnessChip value={s.freshness} />
        <Pill className="bg-white/10 text-ink/60">{CLASS[s.dataClass] ?? s.dataClass}</Pill>
        <a href={s.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-accent hover:underline">{s.organization}<ExternalLink className="h-3 w-3" /></a>
      </div>
      <div>
        {s.label}. Updates: {s.frequency}.{" "}
        {s.observationDate ? <>Data period: <b>{s.observationDate}</b>. </> : null}
        {s.lastSyncAt ? <>Last synced {timeAgo(s.lastSyncAt)}.</> : <>Never synced.</>}
      </div>
    </div>
  );
}

export function PunjabPotatoCard() {
  const q = useGetPunjabPotato();
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const d = q.data;
  const max = Math.max(1, ...d.districts.map((x) => x.productionT));
  return (
    <Card className="p-5">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium">Potato in Punjab by district{d.period ? ` (${d.period})` : ""}</h3>
        {d.state && <div className="text-xs text-ink/55">State: {d.state.productionT.toLocaleString("en-IN")} t on {d.state.areaHa.toLocaleString("en-IN")} ha</div>}
      </div>
      {!d.available || !d.districts.length ? (
        <Empty title="No district data yet" hint="This fills after the first successful sync from the PAU source. Nothing is estimated." />
      ) : (
        <div className="mt-3 space-y-2">
          {d.districts.map((x) => (
            <div key={x.name} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 text-xs">
              <span className={x.name === "Jalandhar" ? "font-medium text-accent" : "text-ink/70"}>{x.rank}. {x.name}</span>
              <span className="h-2 overflow-hidden rounded-full bg-white/[0.06]"><span className={`block h-full rounded-full ${x.name === "Jalandhar" ? "bg-accent" : "bg-accent/45"}`} style={{ width: `${(x.productionT / max) * 100}%` }} /></span>
              <span className="tabular-nums text-ink/55" title={`${x.areaHa.toLocaleString("en-IN")} ha · ${x.yieldQPerHa} q/ha`}>{x.productionT.toLocaleString("en-IN")} t · {x.sharePct}%</span>
            </div>
          ))}
        </div>
      )}
      <SourceLine s={d.source} />
      {d.citation && <div className="mt-2 text-[11px] text-ink/35">{d.citation} Table source: {d.attribution}</div>}
    </Card>
  );
}

export function FaostatCard() {
  const q = useGetFaostatIndia();
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const d = q.data;
  const rows = d.series.filter((r) => r.year >= 1990 && r.productionT != null).map((r) => ({ year: r.year, million: +(r.productionT! / 1e6).toFixed(2) }));
  return (
    <Card className="p-5">
      <h3 className="font-medium">India potato production, historical</h3>
      <p className="text-xs text-ink/50">{d.geography} Annual national figures, not live and not for Punjab.</p>
      {rows.length ? (
        <div className="mt-3 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ left: -12, right: 8, top: 4 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: "rgba(233,238,232,0.42)", fontSize: 10 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: "rgba(233,238,232,0.42)", fontSize: 10 }} unit=" Mt" />
              <Tooltip formatter={(v) => [`${v} million tonnes`, "Production"]} contentStyle={{ background: "rgba(8,16,11,0.92)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, color: "#e9eee8", fontSize: 12 }} />
              <Area dataKey="million" stroke="#86d6a0" fill="#86d6a0" fillOpacity={0.15} strokeWidth={1.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : <Empty title="No FAOSTAT data yet" />}
      <SourceLine s={d.source} />
      {d.citation && <div className="mt-2 text-[11px] text-ink/35">{d.citation}</div>}
    </Card>
  );
}

/** Admin: every source with freshness, last run and the reason for any problem. */
export function DataHealth() {
  const q = useListDataSources();
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {q.data.map((s) => (
        <Card key={s.source} className="p-4">
          <div className="flex items-start justify-between gap-2"><div className="text-sm font-medium">{s.label}</div><FreshnessChip value={s.freshness} /></div>
          <div className="mt-1 text-xs text-ink/50">{s.organization} · {s.frequency}</div>
          {s.integration === "automated" ? (
            <div className="mt-2 text-xs text-ink/55">
              {s.lastSuccess ? <>Last success {timeAgo(s.lastSuccess.finishedAt ?? s.lastSuccess.startedAt)} ({s.lastSuccess.recordCount} records{s.observationDate ? `, period ${s.observationDate}` : ""}).</> : "No successful sync yet."}
              {s.lastRun?.status === "FAILED" && <div className="mt-1 text-rose-300">Latest attempt failed: {s.lastRun.error}</div>}
              {!s.configured && <div className="mt-1 text-amber-300">{s.configurationHint}</div>}
            </div>
          ) : <div className="mt-2 text-xs text-ink/45">{s.integrationNote ?? "Reference only; nothing is ingested."}</div>}
        </Card>
      ))}
    </div>
  );
}
export { dateOnly };
