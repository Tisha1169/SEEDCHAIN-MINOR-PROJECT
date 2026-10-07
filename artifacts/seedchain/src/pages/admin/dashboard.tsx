import { Link } from "wouter";
import { useGetAdminOverview } from "@workspace/api-client-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle } from "lucide-react";
import { BigNumber, Card, ErrorState, Loading, PageHeader } from "@/components/app/common";
import { CountUp, GlassCard, Reveal } from "@/components/motion";
import { qty } from "@/lib/format";
import { DataHealth } from "@/components/app/reference-data";

const COLORS = ["#86d6a0", "#4fa874", "#c8e6b0", "#7fb2d9", "#d9b86b", "#9a8fd1", "#6b7f74"];
const RISK_COLORS: Record<string, string> = { LOW: "#86d6a0", MEDIUM: "#e0c36a", HIGH: "#e89a5a", CRITICAL: "#e5736a" };
const axis = { tickLine: false, axisLine: false, tick: { fill: "rgba(233,238,232,0.42)", fontSize: 10 } } as const;
const tooltip = { contentStyle: { background: "rgba(8,16,11,0.92)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, color: "#e9eee8", fontSize: 12, backdropFilter: "blur(12px)" }, cursor: { stroke: "rgba(255,255,255,0.15)" }, itemStyle: { color: "#e9eee8" }, labelStyle: { color: "rgba(233,238,232,0.6)" } } as const;
const grid = <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />;

function Big({ label, value, hint, tone }: { label: string; value: number | string; hint?: string; tone?: "warn" }) {
  return (
    <GlassCard className="p-5 sm:p-6">
      <div className="eyebrow">{label}</div>
      <div className={`mt-3 text-[2.6rem] font-extralight leading-none tracking-tight ${tone === "warn" ? "text-amber-300" : ""}`}>{typeof value === "number" ? <CountUp value={value} /> : <BigNumber value={value} />}</div>
      {hint && <div className="mt-2 text-[11px] text-ink/40">{hint}</div>}
    </GlassCard>
  );
}

function Chart({ title, subtitle, children, empty }: { title: string; subtitle?: string; children: React.ReactElement; empty?: boolean }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-1 eyebrow">{title}</div>
      {subtitle && <div className="mb-3 text-[11px] text-ink/35">{subtitle}</div>}
      <div className="mt-3 h-56">{empty ? <div className="flex h-full items-center justify-center text-sm text-ink/35">No data yet</div> : <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>}</div>
    </Card>
  );
}

const areaChart = (data: Array<{ label: string; value: number }>, color: string, id: string) => (
  <AreaChart data={data} margin={{ left: -18, right: 6, top: 6 }}>
    <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.35} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
    {grid}<XAxis dataKey="label" {...axis} minTickGap={24} tickFormatter={(v: string) => v.slice(5)} /><YAxis {...axis} allowDecimals={false} /><Tooltip {...tooltip} />
    <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.8} fill={`url(#${id})`} isAnimationActive animationDuration={1200} />
  </AreaChart>
);

export default function AdminDashboard() {
  const q = useGetAdminOverview();
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const d = q.data;
  return (
    <>
      <PageHeader title="Command center" subtitle={`Live database values · generated ${new Date(d.generatedAt).toLocaleTimeString()}`} />
      {d.pendingFarmers > 0 && (
        <Link href="/admin/users"><Card className="mb-6 flex cursor-pointer items-center gap-3 !border-amber-400/25 p-4 text-sm text-amber-100"><AlertTriangle className="h-4 w-4" />{d.pendingFarmers} farmer application(s) waiting for approval →</Card></Link>
      )}
      <Reveal>
        <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Big label="Farmers" value={d.totalFarmers} hint={`${d.verifiedFarmers} verified`} />
          <Big label="Active lots" value={d.activeLots} />
          <Big label="QR scans today" value={d.qrScansToday} />
          <Big label="Orders today" value={d.ordersToday} hint={`${d.completedOrders} completed overall`} />
          <Big label="Available" value={qty(d.availableQuantity)} />
          <Big label="Reserved" value={qty(d.reservedQuantity)} />
          <Big label="Sold" value={qty(d.soldQuantity)} hint={`Loss rate ${d.lossRatePct}%`} />
          <Big label="Customers" value={d.totalCustomers} />
          <Big label="Trace events" value={d.traceEvents} />
          <Big label="Open alerts" value={d.openAlerts} tone={d.openAlerts ? "warn" : undefined} />
          <Big label="High-risk lots" value={d.highRiskLots} tone={d.highRiskLots ? "warn" : undefined} hint="Transparent rules, not AI" />
          <Big label="Pending farmers" value={d.pendingFarmers} tone={d.pendingFarmers ? "warn" : undefined} />
        </div>
      </Reveal>
      <div className="grid gap-5 lg:grid-cols-2">
        <Chart title="Orders" subtitle="Last 14 days" empty={!d.ordersOverTime.some((p) => p.value > 0)}>{areaChart(d.ordersOverTime, "#86d6a0", "ord")}</Chart>
        <Chart title="QR scans" subtitle="Last 14 days" empty={!d.scansOverTime.some((p) => p.value > 0)}>{areaChart(d.scansOverTime, "#7fb2d9", "scn")}</Chart>
        <Chart title="Inventory by farmer" subtitle="Top 10 · available / reserved / sold" empty={!d.inventoryByFarmer.length}>
          <BarChart data={d.inventoryByFarmer} margin={{ left: -10, right: 6 }}>{grid}<XAxis dataKey="farmer" {...axis} /><YAxis {...axis} /><Tooltip {...tooltip} />
            <Bar dataKey="available" stackId="a" fill="#86d6a0" radius={[0, 0, 0, 0]} /><Bar dataKey="reserved" stackId="a" fill="#e0c36a" /><Bar dataKey="sold" stackId="a" fill="#9a8fd1" radius={[6, 6, 0, 0]} /></BarChart>
        </Chart>
        <Chart title="Lots by status" empty={!d.lotsByStatus.length}>
          <PieChart><Pie data={d.lotsByStatus} dataKey="value" nameKey="label" innerRadius={52} outerRadius={82} paddingAngle={3} stroke="none" label={(e) => `${e.label} ${e.value}`}>{d.lotsByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip {...tooltip} /></PieChart>
        </Chart>
        <Chart title="Risk distribution" subtitle="Rule-based (rules-v1)" empty={d.riskDistribution.every((r) => r.value === 0)}>
          <BarChart data={d.riskDistribution} margin={{ left: -18 }}>{grid}<XAxis dataKey="label" {...axis} /><YAxis {...axis} allowDecimals={false} /><Tooltip {...tooltip} /><Bar dataKey="value" radius={[8, 8, 0, 0]}>{d.riskDistribution.map((r) => <Cell key={r.label} fill={RISK_COLORS[r.label]} />)}</Bar></BarChart>
        </Chart>
        <Chart title="Potato modal price" subtitle="INR / quintal · external, data.gov.in" empty={!d.marketTrend.length}>{areaChart(d.marketTrend, "#d9b86b", "mkt")}</Chart>
      </div>
      <div className="eyebrow mb-3 mt-8">Data health: every external source</div>
      <DataHealth />
    </>
  );
}
