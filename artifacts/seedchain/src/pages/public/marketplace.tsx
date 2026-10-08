import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetListing, useGetPaymentConfig, useGetPublicFarmer, useListMarketplace, type FulfillmentMethod, type Listing, type Order } from "@workspace/api-client-react";
import { BadgeCheck, MapPin, QrCode, Search, Sprout } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { FieldScene, Frame, ProduceTile } from "@/components/art";
import { GlassCard } from "@/components/motion";
import { Card, Empty, ErrorState, Field, inputCls, Kv, Loading, textareaCls } from "@/components/app/common";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, errMsg, uuid } from "@/lib/api";
import { cropName, dateOnly, enumLabel, inr, qty, unitLabel } from "@/lib/format";

function ListingCard({ l }: { l: Listing }) {
  const { t } = useTranslation();
  return (
    <Link href={`/marketplace/${l.lotId}`} className="group block h-full">
      <GlassCard className="flex h-full flex-col overflow-hidden !rounded-[28px]">
        <div className="relative aspect-[16/10] overflow-hidden">
          <ProduceTile name={l.productName} seed={l.lotCode} className="absolute inset-0 transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]" />
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full glass-strong px-3 py-1.5 text-[10px] tracking-[0.18em]">{l.farmer.verified ? <><BadgeCheck className="h-3.5 w-3.5 text-accent" />{t("market.verifiedFarmer")}</> : t("market.registered")}</div>
          <div className="absolute bottom-3 right-4 text-right"><div className="text-2xl font-extralight">{inr(l.pricePerUnit)}</div><div className="text-[10px] tracking-[0.18em] text-ink/55">{t("market.perUnit", { unit: unitLabel(l.unit).toUpperCase() })}</div></div>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div className="text-xl font-light tracking-tight">{cropName(l.productName)} <span className="text-ink/50">· {l.variety}</span></div>
          <div className="mt-2 space-y-1 text-[13px] text-ink/60">
            <div className="flex items-center gap-1.5"><Sprout className="h-3.5 w-3.5" />{l.farmer.publicName}</div>
            <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{l.origin}</div>
          </div>
          <div className="mt-auto flex items-center justify-between border-t border-white/[0.07] pt-4 text-xs">
            <span>{t("market.availableQty", { qty: qty(l.available, l.unit) })}{l.qualityGrade ? t("market.gradeSuffix", { g: l.qualityGrade }) : ""}</span>
            <span className="font-mono text-ink/40">{l.lotCode}</span>
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}

export function MarketplacePage() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const list = useListMarketplace({ q: q || undefined, state: state || undefined });
  return (
    <div className="min-h-screen pb-16">
      <Navbar />
      <div className="relative z-[2] mx-auto max-w-[1200px] px-4 pt-32">
        <div className="eyebrow mb-4">{t("market.eyebrow")}</div>
        <h1 className="text-[clamp(2.4rem,6vw,4.6rem)] font-extralight leading-none tracking-[-0.03em]">{t("market.h1a")} <span className="text-gradient">{t("market.h1b")}</span></h1>
        <p className="mb-8 mt-4 max-w-lg font-light text-ink/55">{t("market.lead")}</p>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1"><Search className="absolute left-4 top-3.5 h-4 w-4 text-ink/30" /><input className={`${inputCls} pl-10`} placeholder={t("market.searchPh")} value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <input className={`${inputCls} sm:w-56`} placeholder={t("market.statePh")} value={state} onChange={(e) => setState(e.target.value)} />
        </div>
        {list.isLoading ? <Loading /> : list.error ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> : !list.data?.length ? (
          <Empty title={t("market.noneTitle")} hint={t("market.noneHint")} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.data.map((l) => <ListingCard key={l.lotId} l={l} />)}</div>
        )}
      </div>
    </div>
  );
}

export function ListingPage() {
  const { t } = useTranslation();
  const [, params] = useRoute("/marketplace/:lotId");
  const lotId = params!.lotId;
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const q = useGetListing(lotId, { query: { queryKey: [`/api/marketplace/listings/${lotId}`], retry: false } });
  const cfg = useGetPaymentConfig({ query: { queryKey: ["/api/payments/config"], staleTime: 60_000 } });
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
    // With online payment on, "Buy now" goes to the checkout page; the order is created there, after review, with the total computed on the server.
    if (cfg.data?.enabled) {
      navigate(`/checkout?lot=${encodeURIComponent(lotId)}&qty=${encodeURIComponent(amount)}&m=${method}`);
      return;
    }
    setBusy(true);
    try {
      const o = await apiRequest<Order>({
        url: "/api/orders", method: "POST", headers: { "Idempotency-Key": key },
        body: { items: [{ lotId, quantity: n }], fulfillmentMethod: method, ...(method !== "CUSTOMER_PICKUP" && { deliveryAddress: address }), ...(notes && { customerNotes: notes }) },
      });
      toast({ title: t("market.placed"), description: t("market.placedBody", { code: o.orderCode }) });
      setKey(uuid());
      await qc.invalidateQueries();
      navigate(`/customer/orders/${o.id}`);
    } catch (err) {
      toast({ title: t("market.couldNotPlace"), description: errMsg(err), variant: "destructive" });
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
          <div className="text-4xl font-extralight tracking-tight">{cropName(l.productName)} <span className="text-ink/50">· {l.variety}</span></div>
          <div className="mt-1 text-3xl font-extralight text-accent">{inr(l.pricePerUnit)} <span className="text-sm font-normal text-ink/45">{t("market.perUnitLine", { unit: unitLabel(l.unit) })}</span></div>
          <div className="mt-4">
            <Kv k={t("market.available")} v={qty(l.available, l.unit)} />
            <Kv k={t("market.quality")} v={l.qualityGrade ? t("market.grade", { g: l.qualityGrade }) : t("market.notGraded")} />
            <Kv k={t("market.harvested")} v={dateOnly(l.harvestDate)} />
            <Kv k={t("market.origin")} v={l.origin} />
            <Kv k={t("market.farm")} v={l.farmName} />
            <Kv k={t("market.lot")} v={<span className="font-mono">{l.lotCode}</span>} />
            <Kv k={t("market.farmer")} v={<Link href={`/farmers/${l.farmer.id}`} className="inline-flex items-center gap-1 text-accent">{l.farmer.publicName}{l.farmer.verified && <BadgeCheck className="h-4 w-4" />}</Link>} />
          </div>
          {l.publicNotes && <p className="mt-4 whitespace-pre-wrap text-sm text-ink/70">{l.publicNotes}</p>}
          {l.publicToken && <Link href={`/trace/${l.publicToken}`}><Button variant="outline" className="mt-5 rounded-full"><QrCode className="mr-2 h-4 w-4" />{t("market.viewTrace")}</Button></Link>}
        </Card>
        <Card className="p-6 md:col-span-2">
          <h2 className="eyebrow mb-5">{t("market.orderFrom")}</h2>
          {!user ? (
            <div className="space-y-3 text-sm"><p>{t("market.signInToOrder")}</p><Link href="/login"><Button className="w-full rounded-2xl">{t("market.signIn")}</Button></Link><Link href="/register"><Button variant="outline" className="w-full rounded-2xl">{t("market.createAccount")}</Button></Link></div>
          ) : user.role !== "customer" ? (
            <p className="text-sm text-ink/60">{t("market.onlyCustomers", { role: enumLabel("role", user.role) })}</p>
          ) : (
            <form onSubmit={order} className="space-y-4">
              <Field label={t("market.quantityUnit", { unit: unitLabel(l.unit) })}><input className={inputCls} type="number" required min="0.001" max={l.available} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
              <Field label={t("market.fulfilment")}>
                <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value as FulfillmentMethod)}>
                  {["CUSTOMER_PICKUP", "FARMER_DELIVERY", "THIRD_PARTY_DELIVERY"].map((k) => <option key={k} value={k}>{enumLabel("fulfillment", k)}</option>)}
                </select>
              </Field>
              {method !== "CUSTOMER_PICKUP" && <Field label={t("market.deliveryAddress")}><textarea className={textareaCls} rows={2} required value={address} onChange={(e) => setAddress(e.target.value)} /></Field>}
              <Field label={t("market.noteFarmer")}><input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
              <div className="flex justify-between border-t pt-3 text-sm"><span>{t("market.total")}</span><b>{inr(total)}</b></div>
              <Button disabled={busy || !(n > 0)} className="h-11 w-full rounded-2xl">{busy ? t("market.placing") : cfg.data?.enabled ? t("pay.buyNow") : t("market.placeOrder")}</Button>
              <p className="text-[11px] text-ink/45">{t("market.reservedNote")}</p>
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
  const { t } = useTranslation();
  const [, params] = useRoute("/farmers/:id");
  const q = useGetPublicFarmer(params!.id, { query: { queryKey: [`/api/farmers/${params!.id}`], retry: false } });
  return (
    <Wrap>
      {q.isLoading ? <Loading /> : q.error || !q.data ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : (
        <>
          <Frame src="/media/farmer.webp" alt={t("market.farmerAlt")} art={<FieldScene />} ratio="aspect-[16/6] sm:aspect-[21/6]" position="40% 55%" className="mb-5 !rounded-[28px]" />
          <Card className="mb-6 p-6">
            <h1 className="flex items-center gap-2 text-4xl font-extralight tracking-tight">{q.data.publicName}{q.data.verified && <BadgeCheck className="h-6 w-6 text-accent" />}</h1>
            <div className="mt-1 text-sm text-ink/55">{[q.data.village, q.data.district, q.data.state].filter(Boolean).join(", ")} · {t("market.memberSince", { date: dateOnly(q.data.memberSince) })}</div>
            {q.data.bio && <p className="mt-3 text-sm">{q.data.bio}</p>}
            {q.data.farms.length > 0 && <div className="mt-3 text-xs text-ink/50">{t("market.farms", { names: q.data.farms.map((f) => f.name).join(", ") })}</div>}
            <div className="mt-2 text-xs text-ink/45">{q.data.verified ? t("market.identityReviewed") : t("market.notVerified")}</div>
          </Card>
          <h2 className="eyebrow mb-4">{t("market.availableProduce")}</h2>
          {q.data.listings.length ? <div className="grid gap-4 sm:grid-cols-2">{q.data.listings.map((l) => <ListingCard key={l.lotId} l={l} />)}</div> : <Empty title={t("market.nothingListed")} />}
        </>
      )}
    </Wrap>
  );
}
