import { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetListing, useGetPublicFarmer, useListMarketplace, type FulfillmentMethod, type Listing, type Order } from "@workspace/api-client-react";
import { BadgeCheck, MapPin, QrCode, Search, Sprout } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { FieldScene, Frame, ProduceTile } from "@/components/art";
import { GlassCard } from "@/components/motion";
import { Card, Empty, ErrorState, Field, inputCls, Kv, Loading, textareaCls } from "@/components/app/common";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, errMsg, uuid } from "@/lib/api";
import { dateOnly, FULFILLMENT_LABEL, inr, qty } from "@/lib/format";

function ListingCard({ l }: { l: Listing }) {
  return (
    <Link href={`/marketplace/${l.lotId}`} className="group block h-full">
      <GlassCard className="flex h-full flex-col overflow-hidden !rounded-[28px]">
        <div className="relative aspect-[16/10] overflow-hidden">
          <ProduceTile name={l.productName} seed={l.lotCode} className="absolute inset-0 transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]" />
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full glass-strong px-3 py-1.5 text-[10px] tracking-[0.18em]">{l.farmer.verified ? <><BadgeCheck className="h-3.5 w-3.5 text-accent" />VERIFIED FARMER</> : "REGISTERED"}</div>
          <div className="absolute bottom-3 right-4 text-right"><div className="text-2xl font-extralight">{inr(l.pricePerUnit)}</div><div className="text-[10px] tracking-[0.18em] text-ink/55">PER {l.unit.toUpperCase()}</div></div>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div className="text-xl font-light tracking-tight">{l.productName} <span className="text-ink/50">· {l.variety}</span></div>
          <div className="mt-2 space-y-1 text-[13px] text-ink/60">
            <div className="flex items-center gap-1.5"><Sprout className="h-3.5 w-3.5" />{l.farmer.publicName}</div>
            <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{l.origin}</div>
          </div>
          <div className="mt-auto flex items-center justify-between border-t border-white/[0.07] pt-4 text-xs">
            <span>{qty(l.available, l.unit)} available{l.qualityGrade ? ` · Grade ${l.qualityGrade}` : ""}</span>
            <span className="font-mono text-ink/40">{l.lotCode}</span>
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}

export function MarketplacePage() {
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const list = useListMarketplace({ q: q || undefined, state: state || undefined });
  return (
    <div className="min-h-screen pb-16">
      <Navbar />
      <div className="relative z-[2] mx-auto max-w-[1200px] px-4 pt-32">
        <div className="eyebrow mb-4">Marketplace</div>
        <h1 className="text-[clamp(2.4rem,6vw,4.6rem)] font-extralight leading-none tracking-[-0.03em]">Buy direct <span className="text-gradient">from farmers.</span></h1>
        <p className="mb-8 mt-4 max-w-lg font-light text-ink/55">Every lot has its own QR identity. No middlemen: orders go straight to the farmer.</p>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1"><Search className="absolute left-4 top-3.5 h-4 w-4 text-ink/30" /><input className={`${inputCls} pl-10`} placeholder="Search variety, farmer or place" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <input className={`${inputCls} sm:w-56`} placeholder="State (e.g. Punjab)" value={state} onChange={(e) => setState(e.target.value)} />
        </div>
        {list.isLoading ? <Loading /> : list.error ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> : !list.data?.length ? (
          <Empty title="No produce is listed right now" hint="Farmers list produce after harvest. Check back soon." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.data.map((l) => <ListingCard key={l.lotId} l={l} />)}</div>
        )}
      </div>
    </div>
  );
}

export function ListingPage() {
  const [, params] = useRoute("/marketplace/:lotId");
  const lotId = params!.lotId;
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const q = useGetListing(lotId, { query: { queryKey: [`/api/marketplace/listings/${lotId}`], retry: false } });
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<FulfillmentMethod>("CUSTOMER_PICKUP");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(uuid); // one Idempotency-Key per submission attempt

  if (q.isLoading) return <Wrap><Loading /></Wrap>;
  if (q.error || !q.data) return <Wrap><ErrorState error={q.error} onRetry={() => void q.refetch()} /></Wrap>;
  const l = q.data;
  const n = Number(amount);
  const total = n > 0 && l.pricePerUnit != null ? n * l.pricePerUnit : null;

  async function order(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const o = await apiRequest<Order>({
        url: "/api/orders", method: "POST", headers: { "Idempotency-Key": key },
        body: { items: [{ lotId, quantity: n }], fulfillmentMethod: method, ...(method !== "CUSTOMER_PICKUP" && { deliveryAddress: address }), ...(notes && { customerNotes: notes }) },
      });
      toast({ title: "Order placed", description: `${o.orderCode}. Stock is reserved for you.` });
      setKey(uuid());
      await qc.invalidateQueries();
      navigate(`/customer/orders/${o.id}`);
    } catch (err) {
      toast({ title: "Could not place order", description: errMsg(err), variant: "destructive" });
      void qc.invalidateQueries({ queryKey: [`/api/marketplace/listings/${lotId}`] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Wrap>
      <Frame ratio="aspect-[16/7] sm:aspect-[21/7]" className="mb-5 !rounded-[28px]" art={<ProduceTile name={l.productName} seed={l.lotCode} className="h-full w-full" />}>
        <div className="absolute bottom-4 left-5 right-5 z-10 flex items-end justify-between gap-3">
          <div className="eyebrow !text-ink/70">{l.origin}</div>
          <div className="glass-strong rounded-full px-3.5 py-1.5 text-[11px] tracking-[0.18em]">{l.lotCode}</div>
        </div>
      </Frame>
      <div className="grid gap-5 md:grid-cols-5">
        <Card className="p-6 md:col-span-3">
          <div className="text-4xl font-extralight tracking-tight">{l.productName} <span className="text-ink/50">· {l.variety}</span></div>
          <div className="mt-1 text-3xl font-extralight text-accent">{inr(l.pricePerUnit)} <span className="text-sm font-normal text-ink/45">per {l.unit}</span></div>
          <div className="mt-4">
            <Kv k="Available" v={qty(l.available, l.unit)} />
            <Kv k="Quality" v={l.qualityGrade ? `Grade ${l.qualityGrade}` : "Not graded"} />
            <Kv k="Harvested" v={dateOnly(l.harvestDate)} />
            <Kv k="Origin" v={l.origin} />
            <Kv k="Farm" v={l.farmName} />
            <Kv k="Lot" v={<span className="font-mono">{l.lotCode}</span>} />
            <Kv k="Farmer" v={<Link href={`/farmers/${l.farmer.id}`} className="inline-flex items-center gap-1 text-accent">{l.farmer.publicName}{l.farmer.verified && <BadgeCheck className="h-4 w-4" />}</Link>} />
          </div>
          {l.publicNotes && <p className="mt-4 whitespace-pre-wrap text-sm text-ink/70">{l.publicNotes}</p>}
          {l.publicToken && <Link href={`/trace/${l.publicToken}`}><Button variant="outline" className="mt-5 rounded-full"><QrCode className="mr-2 h-4 w-4" />View traceability</Button></Link>}
        </Card>
        <Card className="p-6 md:col-span-2">
          <h2 className="eyebrow mb-5">Order from the farmer</h2>
          {!user ? (
            <div className="space-y-3 text-sm"><p>Sign in as a customer to order.</p><Link href="/login"><Button className="w-full rounded-2xl">Sign in</Button></Link><Link href="/register"><Button variant="outline" className="w-full rounded-2xl">Create account</Button></Link></div>
          ) : user.role !== "customer" ? (
            <p className="text-sm text-ink/60">Only customer accounts can place orders. You are signed in as a {user.role}.</p>
          ) : (
            <form onSubmit={order} className="space-y-4">
              <Field label={`Quantity (${l.unit})`}><input className={inputCls} type="number" required min="0.001" max={l.available} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
              <Field label="Fulfilment">
                <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value as FulfillmentMethod)}>
                  {Object.entries(FULFILLMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              {method !== "CUSTOMER_PICKUP" && <Field label="Delivery address"><textarea className={textareaCls} rows={2} required value={address} onChange={(e) => setAddress(e.target.value)} /></Field>}
              <Field label="Note for the farmer (optional)"><input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
              <div className="flex justify-between border-t pt-3 text-sm"><span>Total</span><b>{inr(total)}</b></div>
              <Button disabled={busy || !(n > 0)} className="h-11 w-full rounded-2xl">{busy ? "Placing order…" : "Place order"}</Button>
              <p className="text-[11px] text-ink/45">Stock is reserved for you immediately. The farmer then accepts or declines.</p>
            </form>
          )}
        </Card>
      </div>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen pb-16"><Navbar /><div className="relative z-[2] mx-auto max-w-[1100px] px-4 pt-28">{children}</div></div>;
}

export function FarmerPublicPage() {
  const [, params] = useRoute("/farmers/:id");
  const q = useGetPublicFarmer(params!.id, { query: { queryKey: [`/api/farmers/${params!.id}`], retry: false } });
  return (
    <Wrap>
      {q.isLoading ? <Loading /> : q.error || !q.data ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : (
        <>
          <Frame src="/media/farmer.webp" alt="Farmland at sunrise" art={<FieldScene />} ratio="aspect-[16/6] sm:aspect-[21/6]" position="40% 55%" className="mb-5 !rounded-[28px]" />
          <Card className="mb-6 p-6">
            <h1 className="flex items-center gap-2 text-4xl font-extralight tracking-tight">{q.data.publicName}{q.data.verified && <BadgeCheck className="h-6 w-6 text-accent" />}</h1>
            <div className="mt-1 text-sm text-ink/55">{[q.data.village, q.data.district, q.data.state].filter(Boolean).join(", ")} · member since {dateOnly(q.data.memberSince)}</div>
            {q.data.bio && <p className="mt-3 text-sm">{q.data.bio}</p>}
            {q.data.farms.length > 0 && <div className="mt-3 text-xs text-ink/50">Farms: {q.data.farms.map((f) => f.name).join(", ")}</div>}
            <div className="mt-2 text-xs text-ink/45">{q.data.verified ? "Identity reviewed by a SeedChain admin." : "Not yet verified by an admin."}</div>
          </Card>
          <h2 className="eyebrow mb-4">Available produce</h2>
          {q.data.listings.length ? <div className="grid gap-4 sm:grid-cols-2">{q.data.listings.map((l) => <ListingCard key={l.lotId} l={l} />)}</div> : <Empty title="Nothing listed at the moment" />}
        </>
      )}
    </Wrap>
  );
}
