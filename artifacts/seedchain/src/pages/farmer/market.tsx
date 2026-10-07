import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useGetMarketPrices, useGetWeather, useListFarms } from "@workspace/api-client-react";
import { Cloud, Droplets, Thermometer } from "lucide-react";
import { Card, Empty, ErrorState, Loading, PageHeader, Pill, Table } from "@/components/app/common";
import { dateOnly, dateTime, timeAgo } from "@/lib/format";
import type { IntegrationStatus } from "@workspace/api-client-react";
import { FaostatCard, PunjabPotatoCard } from "@/components/app/reference-data";

export function SourceFooter({ s }: { s: IntegrationStatus }) {
  const { t } = useTranslation();
  return (
    <div className="mt-3 text-xs text-ink/50">
      {t("farmer.market.source", { label: s.label })}{" "}
      {s.lastSuccess ? <>{t("farmer.market.lastUpdate")} <b>{dateTime(s.lastSuccess.finishedAt ?? s.lastSuccess.startedAt)}</b> ({timeAgo(s.lastSuccess.finishedAt ?? s.lastSuccess.startedAt)}).</> : <>{t("farmer.market.noUpdate")}</>}{" "}
      {s.lastRun && s.lastRun.status === "FAILED" && <span className="text-rose-300">{t("farmer.market.attemptFailed", { error: s.lastRun.error })}</span>}
      {!s.configured && <span className="text-amber-300"> {s.configurationHint}</span>}
    </div>
  );
}

function Weather({ farmId, name }: { farmId: string; name: string }) {
  const { t } = useTranslation();
  const q = useGetWeather({ farmId });
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorState error={q.error} />;
  const w = q.data.observation;
  return (
    <Card className="p-5">
      <div className="mb-2 font-medium">{name}</div>
      {!q.data.hasCoordinates ? <p className="text-sm text-ink/55">{t("farmer.market.addGpsFarm")}</p>
        : !w ? <p className="text-sm text-ink/55">{t("farmer.market.weatherUnavailable")}</p>
        : (<div className="grid grid-cols-3 gap-3 text-center">
            <div><Thermometer className="mx-auto h-5 w-5 text-orange-500" /><div className="text-xl font-medium">{w.temperatureC ?? "—"}°C</div><div className="text-xs text-ink/50">{w.condition ?? ""}</div></div>
            <div><Droplets className="mx-auto h-5 w-5 text-sky-500" /><div className="text-xl font-medium">{w.humidityPct ?? "—"}%</div><div className="text-xs text-ink/50">{t("farmer.market.humidityLabel")}</div></div>
            <div><Cloud className="mx-auto h-5 w-5 text-zinc-500" /><div className="text-xl font-medium">{w.precipitationMm ?? "—"} mm</div><div className="text-xs text-ink/50">{t("farmer.market.precipitation")}</div></div>
          </div>)}
      {w && <div className="mt-2 text-xs text-ink/45">{t("farmer.market.observed", { time: dateTime(w.observationTime), ago: timeAgo(w.retrievedAt) })}</div>}
      <SourceFooter s={q.data.status} />
    </Card>
  );
}

export default function MarketPage() {
  const { t } = useTranslation();
  const [state, setState] = useState("");
  const prices = useGetMarketPrices({ state: state || undefined, days: 14 });
  const farms = useListFarms();
  return (
    <>
      <PageHeader title={t("farmer.market.title")} subtitle={t("farmer.market.subtitle")} />
      <h3 className="mb-2 flex items-center gap-2 eyebrow !text-ink/75">{t("farmer.market.potatoPrices")} <Pill className="bg-sky-400/15 text-sky-300">{t("farmer.market.external")}</Pill></h3>
      <input className="mb-3 h-10 w-56 rounded-full border bg-glass-2 px-4 text-sm" placeholder={t("farmer.market.filterState")} value={state} onChange={(e) => setState(e.target.value)} />
      {prices.isLoading ? <Loading /> : prices.error || !prices.data ? <ErrorState error={prices.error} onRetry={() => void prices.refetch()} /> : (
        <>
          {prices.data.observations.length ? (
            <Table head={[t("farmer.market.date"), t("farmer.market.state"), t("farmer.market.market"), t("farmer.market.variety"), t("farmer.market.min"), t("farmer.market.max"), t("farmer.market.modalCol"), t("farmer.market.arrival")]}>
              {prices.data.observations.slice(0, 100).map((o) => (
                <tr key={o.id}><td className="px-4 py-2">{dateOnly(o.observationDate)}</td><td className="px-4 py-2">{o.state}</td><td className="px-4 py-2">{o.market}</td><td className="px-4 py-2">{o.variety ?? "—"}</td><td className="px-4 py-2">{o.minPrice ?? "—"}</td><td className="px-4 py-2">{o.maxPrice ?? "—"}</td><td className="px-4 py-2 font-medium">{o.modalPrice ?? "—"}</td><td className="px-4 py-2">{o.arrivalQuantityTonnes ?? "—"}</td></tr>
              ))}
            </Table>
          ) : <Empty title={t("farmer.market.noPrices")} hint={t("farmer.market.noPricesHint")} />}
          <SourceFooter s={prices.data.status} />
          <div className="mt-1 text-xs text-ink/45">{t("farmer.market.inrPerQuintal")}</div>
        </>
      )}
      <h3 className="mb-3 mt-10 eyebrow !text-ink/75">{t("farmer.market.punjabGrows")} <Pill className="ml-2 bg-white/10 text-ink/60">{t("farmer.market.annualRef")}</Pill></h3>
      <div className="grid gap-4 lg:grid-cols-2"><PunjabPotatoCard /><FaostatCard /></div>
      <h3 className="mb-3 mt-10 eyebrow !text-ink/75">{t("farmer.market.weatherAtFarms")}</h3>
      {farms.data?.length ? <div className="grid gap-4 md:grid-cols-2">{farms.data.map((f) => <Weather key={f.id} farmId={f.id} name={f.name} />)}</div> : <Empty title={t("farmer.market.addFarmWeather")} />}
    </>
  );
}
