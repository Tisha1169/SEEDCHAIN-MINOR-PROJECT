import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useGetCustomerOverview } from "@workspace/api-client-react";
import { ScanLine, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Empty, ErrorState, Loading, OrderStatusPill, PageHeader, Stat } from "@/components/app/common";
import { cropName, dateTime, inr } from "@/lib/format";

export default function CustomerDashboard() {
  const { t } = useTranslation();
  const q = useGetCustomerOverview();
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const d = q.data;
  return (
    <>
      <PageHeader title={t("customer.title")} actions={<><Link href="/scan"><Button className="rounded-full"><ScanLine className="mr-2 h-4 w-4" />{t("customer.scan")}</Button></Link><Link href="/marketplace"><Button variant="outline" className="rounded-full"><ShoppingBag className="mr-2 h-4 w-4" />{t("customer.browse")}</Button></Link></>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3"><Stat label={t("customer.active")} value={d.activeOrders} /><Stat label={t("customer.completed")} value={d.completedOrders} /><Stat label={t("customer.spent")} value={inr(d.totalSpent)} hint={t("customer.spentHint")} /></div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div><h3 className="mb-3 eyebrow !text-ink/75">{t("customer.recentOrders")}</h3>
          {d.recentOrders.length ? <div className="space-y-2">{d.recentOrders.map((o) => <Link key={o.id} href={`/customer/orders/${o.id}`}><Card className="flex cursor-pointer items-center justify-between p-4 hover:shadow-md"><div><div className="font-mono text-xs">{o.orderCode}</div><div className="text-sm">{o.items.map((i) => i.variety).join(", ")} · {inr(o.totalAmount)}</div></div><OrderStatusPill status={o.status} /></Card></Link>)}</div> : <Empty title={t("customer.noOrders")} />}
        </div>
        <div><h3 className="mb-3 eyebrow !text-ink/75">{t("customer.recentLots")}</h3>
          {d.recentScans.length ? <div className="space-y-2">{d.recentScans.map((s) => <Link key={s.publicToken} href={`/trace/${s.publicToken}`}><Card className="cursor-pointer p-4 hover:shadow-md"><div className="font-medium">{cropName(s.productName)} · {s.variety}</div><div className="text-xs text-ink/50"><span className="font-mono">{s.lotCode}</span> · {t("customer.scanned", { time: dateTime(s.scannedAt) })}</div></Card></Link>)}</div> : <Empty title={t("customer.noScans")} hint={t("customer.noScansHint")} />}
        </div>
      </div>
    </>
  );
}
