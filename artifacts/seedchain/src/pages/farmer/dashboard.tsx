import { Link } from "wouter";
import { useGetFarmerOverview, useGetMarketPrices, useGetWeather, useListFarms, useListLots } from "@workspace/api-client-react";
import { ArrowRight, Cloud, Landmark, Plus, QrCode } from "lucide-react";
import { BigNumber, Card, ErrorState, Loading, LotStatusPill, PageHeader, Pill } from "@/components/app/common";
import { CountUp, GlassCard, Reveal } from "@/components/motion";
import { Timeline } from "@/components/app/timeline";
import { useAuth } from "@/hooks/use-auth";
import { qty, timeAgo, titleCase } from "@/lib/format";

function Num({ label, value, tone, to }: { label: string; value: number | string; tone?: "warn" | "ok"; to?: string }) {
  const body = (
    <GlassCard className="p-5">
      <div className="eyebrow">{label}</div>
      <div className={`mt-2.5 text-[2.2rem] font-extralight leading-none tracking-tight ${tone === "warn" ? "text-amber-300" : tone === "ok" ? "text-accent" : ""}`}>{typeof value === "number" ? <CountUp value={value} /> : <BigNumber value={value} />}</div>
    </GlassCard>
  );
  return to ? <Link href={to}>{body}</Link> : body;
}

function Glance() {
  const farms = useListFarms();
  const gps = farms.data?.find((f) => f.latitude != null);
  const weather = useGetWeather({ farmId: gps?.id ?? "" }, { query: { queryKey: ["/api/weather", gps?.id], enabled: !!gps } });
  const prices = useGetMarketPrices({ days: 14 });
  const w = weather.data?.observation;
  const p = prices.data?.observations.find((o) => o.modalPrice != null);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Link href="/farmer/market"><GlassCard className="h-full p-5">
        <div className="flex items-center justify-between"><span className="eyebrow">Market</span><Landmark className="h-4 w-4 text-accent/80" strokeWidth={1.5} /></div>
        <div className="mt-3 text-3xl font-extralight">{p ? `₹${Math.round(((p.modalPrice ?? 0) / 100) * 100) / 100}/kg` : "—"}</div>
        <div className="mt-1 text-[11px] text-ink/40">{p ? `${p.market}, ${p.state} · modal price · external` : "No market data yet"}</div>
      </GlassCard></Link>
      <Link href="/farmer/market"><GlassCard className="h-full p-5">
        <div className="flex items-center justify-between"><span className="eyebrow">Weather</span><Cloud className="h-4 w-4 text-accent/80" strokeWidth={1.5} /></div>
        <div className="mt-3 text-3xl font-extralight">{w?.temperatureC != null ? `${Math.round(w.temperatureC)}°C` : "—"}</div>
        <div className="mt-1 text-[11px] text-ink/40">{w ? `${w.condition ?? ""} · ${timeAgo(w.observationTime)}` : gps ? "Weather data temporarily unavailable" : "Add GPS to a farm to see weather"}</div>
      </GlassCard></Link>
    </div>
  );
}

export default function FarmerDashboard() {
  const { user } = useAuth();
  const q = useGetFarmerOverview();
  const lots = useListLots();
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const d = q.data;
  const approved = user?.status === "active";
  return (
    <>
      <PageHeader title="Your farm, on the record" subtitle="Live figures from your lots and orders." />

      <Reveal>
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Link href={approved ? "/farmer/lots/new" : "/farmer"} aria-disabled={!approved}>
            <div className={`glass-strong lift group flex h-full items-center gap-5 rounded-[28px] p-7 ${approved ? "" : "opacity-50"}`}>
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-neutral-950 transition-transform group-hover:scale-105"><Plus className="h-7 w-7" strokeWidth={1.6} /></span>
              <div><div className="text-2xl font-light tracking-tight">Create new lot</div><div className="mt-1 text-sm text-ink/50">Record a harvest. Its QR is created automatically.</div></div>
              <ArrowRight className="ml-auto h-5 w-5 text-ink/30 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
          <Link href="/farmer/lots">
            <div className="glass-strong lift group flex h-full items-center gap-5 rounded-[28px] p-7">
              <span className="glass flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-accent"><QrCode className="h-7 w-7" strokeWidth={1.4} /></span>
              <div><div className="text-2xl font-light tracking-tight">Generate QR</div><div className="mt-1 text-sm text-ink/50">Print or replace the label of any lot.</div></div>
              <ArrowRight className="ml-auto h-5 w-5 text-ink/30 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>
      </Reveal>

      {d.pendingOrders > 0 && <Link href="/farmer/orders"><Card className="mb-6 cursor-pointer !border-amber-400/30 p-4 text-sm font-medium text-amber-100">{d.pendingOrders} order(s) waiting for your decision →</Card></Link>}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Num label="Available" value={qty(d.available)} tone="ok" to="/farmer/inventory" /><Num label="Reserved" value={qty(d.reserved)} to="/farmer/inventory" /><Num label="Sold" value={qty(d.sold)} to="/farmer/inventory" /><Num label="Active lots" value={d.activeLots} to="/farmer/lots" />
        <Num label="Pending orders" value={d.pendingOrders} tone={d.pendingOrders ? "warn" : undefined} to="/farmer/orders" /><Num label="In progress" value={d.activeOrders} to="/farmer/orders" /><Num label="Completed" value={d.completedOrders} to="/farmer/orders" /><Num label="Open alerts" value={d.openAlerts} tone={d.openAlerts ? "warn" : undefined} to="/farmer/alerts" />
      </div>

      <div className="mb-6"><Glance /></div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <Card className="p-6">
          <div className="eyebrow mb-5">Recent traceability</div>
          {d.recentEvents.length ? <Timeline items={d.recentEvents.slice(0, 8).map((e) => ({ key: e.id, label: titleCase(e.eventType), time: e.eventTime, detail: e.reason, meta: e.lotCode }))} /> : <p className="text-sm text-ink/45">No events yet. Create your first lot to begin.</p>}
        </Card>
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between"><span className="eyebrow">My lots · QR</span><Link href="/farmer/lots" className="text-xs text-accent">All lots</Link></div>
          {lots.data?.length ? (
            <ul className="space-y-2">{lots.data.slice(0, 6).map((l) => (
              <li key={l.id}><Link href={`/farmer/lots/${l.id}`} className="flex items-center gap-3 rounded-2xl bg-white/[0.035] px-4 py-3 transition-colors hover:bg-white/[0.07]">
                <QrCode className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.5} />
                <div className="min-w-0 flex-1"><div className="truncate text-sm">{l.productName} · {l.variety}</div><div className="font-mono text-[11px] text-ink/40">{l.lotCode}</div></div>
                <LotStatusPill status={l.status} />{l.activeQr && <Pill className="bg-accent/15 text-accent">QR v{l.activeQr.version}</Pill>}
              </Link></li>))}</ul>
          ) : <p className="text-sm text-ink/45">No lots yet.</p>}
        </Card>
      </div>
    </>
  );
}
