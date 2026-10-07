import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useGetInventory } from "@workspace/api-client-react";
import { Card, Empty, ErrorState, Loading, LotStatusPill, PageHeader, Stat, Table } from "@/components/app/common";
import { useAuth } from "@/hooks/use-auth";
import { qty } from "@/lib/format";

/** Live per-lot inventory (harvested − reserved − sold − loss = available). */
export default function InventoryPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const q = useGetInventory();
  const base = user?.role === "admin" ? "admin" : "farmer";
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const tot = q.data.totals;
  return (
    <>
      <PageHeader title={t("inventory.title")} subtitle={t("inventory.subtitle")} />
      <div className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label={t("inventory.harvested")} value={qty(tot.harvested)} /><Stat label={t("inventory.available")} value={qty(tot.available)} tone="ok" /><Stat label={t("inventory.reserved")} value={qty(tot.reserved)} /><Stat label={t("inventory.sold")} value={qty(tot.sold)} /><Stat label={t("inventory.loss")} value={qty(tot.loss)} />
      </div>
      {!q.data.lots.length ? <Empty title={t("inventory.noLots")} /> : (
        <Table head={[t("inventory.lot"), t("inventory.product"), ...(base === "admin" ? [t("inventory.farmer")] : []), t("inventory.status"), t("inventory.stock"), t("inventory.available"), t("inventory.reserved"), t("inventory.sold"), t("inventory.loss")]}>
          {q.data.lots.map((l) => {
            const i = l.inventory;
            const pct = (v: number) => `${i.harvested ? (v / i.harvested) * 100 : 0}%`;
            return (
              <tr key={l.lotId} className="hover:bg-white/[0.03]">
                <td className="px-4 py-3"><Link href={`/${base}/lots/${l.lotId}`} className="font-mono text-xs text-accent">{l.lotCode}</Link></td>
                <td className="px-4 py-3">{l.productName} · {l.variety}</td>
                {base === "admin" && <td className="px-4 py-3">{l.farmerName}</td>}
                <td className="px-4 py-3"><LotStatusPill status={l.status} /></td>
                <td className="w-40 px-4 py-3"><div className="flex h-1.5 overflow-hidden rounded-full bg-white/10" title={t("inventory.availableLabel", { qty: qty(i.available, i.unit) })}><div className="bg-accent" style={{ width: pct(i.available) }} /><div className="bg-amber-300" style={{ width: pct(i.reserved) }} /><div className="bg-indigo-300" style={{ width: pct(i.sold) }} /><div className="bg-rose-400" style={{ width: pct(i.loss) }} /></div></td>
                <td className="px-4 py-3 font-medium">{qty(i.available, i.unit)}</td><td className="px-4 py-3">{qty(i.reserved, i.unit)}</td><td className="px-4 py-3">{qty(i.sold, i.unit)}</td><td className="px-4 py-3">{qty(i.loss, i.unit)}</td>
              </tr>
            );
          })}
        </Table>
      )}
      <Card className="mt-6 p-4 text-xs text-ink/45">{t("inventory.footer")}</Card>
    </>
  );
}
