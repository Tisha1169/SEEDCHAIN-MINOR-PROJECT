import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useListLots } from "@workspace/api-client-react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, ErrorState, Loading, LotStatusPill, PageHeader, Table } from "@/components/app/common";
import { cropName, qty } from "@/lib/format";

export function LotsTable({ base }: { base: "farmer" | "admin" }) {
  const { t } = useTranslation();
  const q = useListLots();
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (!q.data?.length) return <Empty title={t("farmer.lots.none")} hint={base === "farmer" ? t("farmer.lots.noneHint") : undefined} action={base === "farmer" ? <Link href="/farmer/lots/new"><Button className="rounded-full">{t("farmer.lots.createLot")}</Button></Link> : undefined} />;
  return (
    <Table head={[t("farmer.lots.lot"), t("farmer.lots.product"), ...(base === "admin" ? [t("farmer.lots.farmer")] : []), t("farmer.lots.status"), t("farmer.lots.harvested"), t("farmer.lots.available"), t("farmer.lots.reserved"), t("farmer.lots.sold"), t("farmer.lots.listed"), t("farmer.lots.qr"), ""]}>
      {q.data.map((l) => (
        <tr key={l.id} className="hover:bg-white/[0.04]">
          <td className="px-4 py-3 font-mono text-xs">{l.lotCode}</td>
          <td className="px-4 py-3">{cropName(l.productName)} · {l.variety}</td>
          {base === "admin" && <td className="px-4 py-3">{l.farmerName}</td>}
          <td className="px-4 py-3"><LotStatusPill status={l.status} /></td>
          <td className="px-4 py-3">{qty(l.inventory.harvested, l.inventory.unit)}</td>
          <td className="px-4 py-3 font-medium">{qty(l.inventory.available, l.inventory.unit)}</td>
          <td className="px-4 py-3">{qty(l.inventory.reserved, l.inventory.unit)}</td>
          <td className="px-4 py-3">{qty(l.inventory.sold, l.inventory.unit)}</td>
          <td className="px-4 py-3">{l.listed ? t("farmer.lots.yes") : t("farmer.lots.no")}</td>
          <td className="px-4 py-3 text-xs">{l.activeQr ? t("farmer.lots.qrActive", { v: l.activeQr.version }) : t("farmer.lots.qrNone")}</td>
          <td className="px-4 py-3"><Link href={`/${base}/lots/${l.id}`} className="font-medium text-accent">{t("farmer.lots.open")}</Link></td>
        </tr>
      ))}
    </Table>
  );
}

export default function FarmerLots() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t("farmer.lots.title")} subtitle={t("farmer.lots.subtitle")} actions={<Link href="/farmer/lots/new"><Button className="rounded-full"><Plus className="mr-2 h-4 w-4" />{t("farmer.lots.newLot")}</Button></Link>} />
      <LotsTable base="farmer" />
    </>
  );
}
