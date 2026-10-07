import { useState } from "react";
import { useGetMarketPrices, useGetWeather, useListFarms } from "@workspace/api-client-react";
import { Cloud, Droplets, Thermometer } from "lucide-react";
import { Card, Empty, ErrorState, Loading, PageHeader, Pill, Table } from "@/components/app/common";
import { dateOnly, dateTime, timeAgo } from "@/lib/format";
import type { IntegrationStatus } from "@workspace/api-client-react";

export function SourceFooter({ s }: { s: IntegrationStatus }) {
  return (
    <div className="mt-3 text-xs text-ink/50">
      Source: {s.label}.{" "}
      {s.lastSuccess ? <>Last successful update <b>{dateTime(s.lastSuccess.finishedAt ?? s.lastSuccess.startedAt)}</b> ({timeAgo(s.lastSuccess.finishedAt ?? s.lastSuccess.startedAt)}).</> : <>No successful update yet.</>}{" "}
      {s.lastRun && s.lastRun.status === "FAILED" && <span className="text-rose-300">Latest attempt failed: {s.lastRun.error}</span>}
      {!s.configured && <span className="text-amber-300"> {s.configurationHint}</span>}
    </div>
  );
}

function Weather({ farmId, name }: { farmId: string; name: string }) {
  const q = useGetWeather({ farmId });
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorState error={q.error} />;
  const w = q.data.observation;
  return (
    <Card className="p-5">
      <div className="mb-2 font-medium">{name}</div>
      {!q.data.hasCoordinates ? <p className="text-sm text-ink/55">Add GPS coordinates to this farm to see its weather.</p>
        : !w ? <p className="text-sm text-ink/55">Weather data temporarily unavailable.</p>
        : (<div className="grid grid-cols-3 gap-3 text-center">
            <div><Thermometer className="mx-auto h-5 w-5 text-orange-500" /><div className="text-xl font-medium">{w.temperatureC ?? "—"}°C</div><div className="text-xs text-ink/50">{w.condition ?? ""}</div></div>
            <div><Droplets className="mx-auto h-5 w-5 text-sky-500" /><div className="text-xl font-medium">{w.humidityPct ?? "—"}%</div><div className="text-xs text-ink/50">humidity</div></div>
            <div><Cloud className="mx-auto h-5 w-5 text-zinc-500" /><div className="text-xl font-medium">{w.precipitationMm ?? "—"} mm</div><div className="text-xs text-ink/50">precipitation</div></div>
          </div>)}
      {w && <div className="mt-2 text-xs text-ink/45">Observed {dateTime(w.observationTime)} · retrieved {timeAgo(w.retrievedAt)}</div>}
      <SourceFooter s={q.data.status} />
    </Card>
  );
}

export default function MarketPage() {
  const [state, setState] = useState("");
  const prices = useGetMarketPrices({ state: state || undefined, days: 14 });
  const farms = useListFarms();
  return (
    <>
      <PageHeader title="Market & weather" subtitle="External information from official sources. Not SeedChain transaction prices." />
      <h3 className="mb-2 flex items-center gap-2 eyebrow !text-ink/75">Potato market prices <Pill className="bg-sky-400/15 text-sky-300">External market information</Pill></h3>
      <input className="mb-3 h-10 w-56 rounded-full border bg-glass-2 px-4 text-sm" placeholder="Filter by state" value={state} onChange={(e) => setState(e.target.value)} />
      {prices.isLoading ? <Loading /> : prices.error || !prices.data ? <ErrorState error={prices.error} onRetry={() => void prices.refetch()} /> : (
        <>
          {prices.data.observations.length ? (
            <Table head={["Date", "State", "Market", "Variety", "Min", "Max", "Modal", "Arrival (t)"]}>
              {prices.data.observations.slice(0, 100).map((o) => (
                <tr key={o.id}><td className="px-4 py-2">{dateOnly(o.observationDate)}</td><td className="px-4 py-2">{o.state}</td><td className="px-4 py-2">{o.market}</td><td className="px-4 py-2">{o.variety ?? "—"}</td><td className="px-4 py-2">{o.minPrice ?? "—"}</td><td className="px-4 py-2">{o.maxPrice ?? "—"}</td><td className="px-4 py-2 font-medium">{o.modalPrice ?? "—"}</td><td className="px-4 py-2">{o.arrivalQuantityTonnes ?? "—"}</td></tr>
              ))}
            </Table>
          ) : <Empty title="No market prices stored yet" hint="Prices appear after the first successful pull from the government data source. We never show placeholder prices." />}
          <SourceFooter s={prices.data.status} />
          <div className="mt-1 text-xs text-ink/45">Prices in INR per quintal as published by the source.</div>
        </>
      )}
      <h3 className="mb-3 mt-10 eyebrow !text-ink/75">Weather at my farms</h3>
      {farms.data?.length ? <div className="grid gap-4 md:grid-cols-2">{farms.data.map((f) => <Weather key={f.id} farmId={f.id} name={f.name} />)}</div> : <Empty title="Add a farm to see weather" />}
    </>
  );
}
