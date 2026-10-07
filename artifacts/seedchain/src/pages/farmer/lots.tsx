import { Link } from "wouter";
import { useListLots } from "@workspace/api-client-react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, ErrorState, Loading, LotStatusPill, PageHeader, Table } from "@/components/app/common";
import { qty } from "@/lib/format";

export function LotsTable({ base }: { base: "farmer" | "admin" }) {
  const q = useListLots();
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (!q.data?.length) return <Empty title="No lots yet" hint={base === "farmer" ? "Create a lot to generate its permanent QR." : undefined} action={base === "farmer" ? <Link href="/farmer/lots/new"><Button className="rounded-full bg-glass-2 text-neutral-950">Create a lot</Button></Link> : undefined} />;
  return (
    <Table head={["Lot", "Product", ...(base === "admin" ? ["Farmer"] : []), "Status", "Harvested", "Available", "Reserved", "Sold", "Listed", "QR", ""]}>
      {q.data.map((l) => (
        <tr key={l.id} className="hover:bg-white/[0.04]">
          <td className="px-4 py-3 font-mono text-xs">{l.lotCode}</td>
          <td className="px-4 py-3">{l.productName} · {l.variety}</td>
          {base === "admin" && <td className="px-4 py-3">{l.farmerName}</td>}
          <td className="px-4 py-3"><LotStatusPill status={l.status} /></td>
          <td className="px-4 py-3">{qty(l.inventory.harvested, l.inventory.unit)}</td>
          <td className="px-4 py-3 font-medium">{qty(l.inventory.available, l.inventory.unit)}</td>
          <td className="px-4 py-3">{qty(l.inventory.reserved, l.inventory.unit)}</td>
          <td className="px-4 py-3">{qty(l.inventory.sold, l.inventory.unit)}</td>
          <td className="px-4 py-3">{l.listed ? "Yes" : "No"}</td>
          <td className="px-4 py-3 text-xs">{l.activeQr ? `v${l.activeQr.version} active` : "none"}</td>
          <td className="px-4 py-3"><Link href={`/${base}/lots/${l.id}`} className="font-medium text-accent">Open</Link></td>
        </tr>
      ))}
    </Table>
  );
}

export default function FarmerLots() {
  return (
    <>
      <PageHeader title="My lots" subtitle="Each lot has one permanent identity and QR." actions={<Link href="/farmer/lots/new"><Button className="rounded-full bg-glass-2 text-neutral-950"><Plus className="mr-2 h-4 w-4" />New lot</Button></Link>} />
      <LotsTable base="farmer" />
    </>
  );
}
