import { Link } from "wouter";
import { useGetInventory } from "@workspace/api-client-react";
import { Card, Empty, ErrorState, Loading, LotStatusPill, PageHeader, Stat, Table } from "@/components/app/common";
import { useAuth } from "@/hooks/use-auth";
import { qty } from "@/lib/format";

/** Live per-lot inventory (harvested − reserved − sold − loss = available). */
export default function InventoryPage() {
  const { user } = useAuth();
  const q = useGetInventory();
  const base = user?.role === "admin" ? "admin" : "farmer";
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const t = q.data.totals;
  return (
    <>
      <PageHeader title="Inventory" subtitle="Computed from the database in real time. Reserved stock is held for open orders; sold stock is customer-confirmed." />
      <div className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Harvested" value={qty(t.harvested)} /><Stat label="Available" value={qty(t.available)} tone="ok" /><Stat label="Reserved" value={qty(t.reserved)} /><Stat label="Sold" value={qty(t.sold)} /><Stat label="Loss" value={qty(t.loss)} />
      </div>
      {!q.data.lots.length ? <Empty title="No lots yet" /> : (
        <Table head={["Lot", "Product", ...(base === "admin" ? ["Farmer"] : []), "Status", "Stock", "Available", "Reserved", "Sold", "Loss"]}>
          {q.data.lots.map((l) => {
            const i = l.inventory;
            const pct = (v: number) => `${i.harvested ? (v / i.harvested) * 100 : 0}%`;
            return (
              <tr key={l.lotId} className="hover:bg-white/[0.03]">
                <td className="px-4 py-3"><Link href={`/${base}/lots/${l.lotId}`} className="font-mono text-xs text-accent">{l.lotCode}</Link></td>
                <td className="px-4 py-3">{l.productName} · {l.variety}</td>
                {base === "admin" && <td className="px-4 py-3">{l.farmerName}</td>}
                <td className="px-4 py-3"><LotStatusPill status={l.status} /></td>
                <td className="w-40 px-4 py-3"><div className="flex h-1.5 overflow-hidden rounded-full bg-white/10" title={`${qty(i.available, i.unit)} available`}><div className="bg-accent" style={{ width: pct(i.available) }} /><div className="bg-amber-300" style={{ width: pct(i.reserved) }} /><div className="bg-indigo-300" style={{ width: pct(i.sold) }} /><div className="bg-rose-400" style={{ width: pct(i.loss) }} /></div></td>
                <td className="px-4 py-3 font-medium">{qty(i.available, i.unit)}</td><td className="px-4 py-3">{qty(i.reserved, i.unit)}</td><td className="px-4 py-3">{qty(i.sold, i.unit)}</td><td className="px-4 py-3">{qty(i.loss, i.unit)}</td>
              </tr>
            );
          })}
        </Table>
      )}
      <Card className="mt-6 p-4 text-xs text-ink/45">Every change to these numbers is a permanent event in the lot's history. Changing stock requires recording an event, never an edit.</Card>
    </>
  );
}
