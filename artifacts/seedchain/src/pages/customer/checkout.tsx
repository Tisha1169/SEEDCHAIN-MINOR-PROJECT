import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getCheckoutSession, previewCheckout, useGetPaymentConfig, type CheckoutSession, type CheckoutStarted, type CheckoutVerified, type FulfillmentMethod, type Order } from "@workspace/api-client-react";
import { AlertTriangle, BadgeCheck, Check, Clock, Lock, QrCode, RefreshCw, ShieldCheck, Sprout } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { ProduceTile } from "@/components/art";
import { Card, ErrorState, Field, inputCls, Kv, Loading, Pill, textareaCls } from "@/components/app/common";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@workspace/api-client-react";
import { apiRequest, errMsg, uuid } from "@/lib/api";
import { cropName, dateTime, enumLabel, inr, qty, unitLabel } from "@/lib/format";
import { refreshCart } from "@/hooks/use-cart";
import { openRazorpayCheckout, type RazorpayFailure, type RazorpaySuccess } from "@/lib/razorpay";

type Phase = "form" | "creating" | "paying" | "verifying" | "success" | "failed" | "dismissed" | "expired" | "unverified";

const STEPS = ["review", "delivery", "pay"] as const;

function Steps({ active }: { active: number }) {
  const { t } = useTranslation();
  return (
    <ol className="mb-6 flex items-center gap-2 text-[11px] tracking-[0.2em]" aria-label={t("pay.checkout.title")}>
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${i < active ? "border-accent bg-accent text-[#07130c]" : i === active ? "border-accent text-accent" : "border-white/15 text-ink/40"}`}>{i < active ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
          <span className={i <= active ? "text-ink/80" : "text-ink/35"}>{t(`pay.checkout.steps.${s}`).toUpperCase()}</span>
          {i < STEPS.length - 1 && <span className="mx-1 h-px w-8 bg-white/15" />}
        </li>
      ))}
    </ol>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-20">
      <Navbar />
      <div className="relative z-[2] mx-auto max-w-[1060px] px-4 pt-28">{children}</div>
    </div>
  );
}

export default function CheckoutPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  // ?lots=<lotId>:<qty>,<lotId>:<qty>  (from the cart)   or   ?lot=<id>&qty=<n>  (from "Buy now")
  const initialItems = useMemo(() => {
    const multi = params.get("lots");
    if (multi) return multi.split(",").map((p) => ({ lotId: p.split(":")[0], quantity: Number(p.split(":")[1]) })).filter((i) => i.lotId && i.quantity > 0);
    const lot = params.get("lot");
    return lot ? [{ lotId: lot, quantity: Number(params.get("qty")) || 0 }] : [];
  }, [params]);
  const initialMethod = (params.get("m") as FulfillmentMethod | null) ?? "CUSTOMER_PICKUP";

  const [items, setItems] = useState(initialItems);
  const single = items.length === 1;
  const cfg = useGetPaymentConfig({ query: { queryKey: ["/api/payments/config"], staleTime: 60_000 } });
  // The server prices the order: current prices, live stock, and the one-farmer rule. Nothing below trusts the browser.
  const preview = useQuery({
    queryKey: ["checkout-preview", items],
    queryFn: () => previewCheckout({ items: items.filter((i) => i.quantity > 0), fulfillmentMethod: "CUSTOMER_PICKUP" }),
    enabled: items.some((i) => i.quantity > 0),
    retry: false,
    placeholderData: (prev) => prev,
  });

  const [method, setMethod] = useState<FulfillmentMethod>(["CUSTOMER_PICKUP", "FARMER_DELIVERY", "THIRD_PARTY_DELIVERY"].includes(initialMethod) ? initialMethod : "CUSTOMER_PICKUP");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [key, setKey] = useState(uuid); // one Idempotency-Key per checkout attempt; a double click returns the same order
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [paid, setPaid] = useState<Order | null>(null);
  const [failMsg, setFailMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const pv = preview.data;
  const first = pv?.lines[0];
  const subtotal = pv && pv.singleFarmer ? pv.subtotal : null;
  const hasIssues = !!pv?.lines.some((x) => x.issues.length > 0);
  const ready = !!pv && pv.canCheckout && !hasIssues && items.every((i) => i.quantity > 0);
  const enabled = cfg.data?.enabled === true;

  useEffect(() => {
    // Leaving mid-payment would orphan the hold; the server releases it after the window, but warn anyway.
    if (phase !== "paying" && phase !== "verifying") return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [phase]);

  if (!items.length) return <Shell><ErrorState error={new Error(t("pay.checkout.unavailable"))} /></Shell>;
  if (cfg.isLoading || (preview.isLoading && !pv)) return <Shell><Loading /></Shell>;
  if (preview.error && !pv) return <Shell><ErrorState error={preview.error} onRetry={() => void preview.refetch()} /></Shell>;
  if (!user) return <Shell><Card className="p-8 text-center"><p className="mb-4">{t("pay.checkout.signIn")}</p><Link href="/login"><Button className="rounded-full">{t("market.signIn")}</Button></Link></Card></Shell>;
  if (user.role !== "customer") return <Shell><Card className="p-8 text-center text-sm text-ink/60">{t("pay.checkout.onlyCustomers")}</Card></Shell>;

  const hold = (s: CheckoutSession | null) => (s ? dateTime(s.expiresAt) : "");

  async function verify(order: string, r: RazorpaySuccess) {
    setPhase("verifying");
    try {
      const res = await apiRequest<CheckoutVerified>({ url: "/api/checkout/verify", method: "POST", body: { orderId: order, ...r } });
      setPaid(res.order);
      setPhase(res.outcome === "LATE_PAYMENT" ? "expired" : "success");
      void qc.invalidateQueries();
      void refreshCart(qc);
    } catch (err) {
      setError(errMsg(err));
      setPhase("unverified");
    }
  }

  async function open(s: CheckoutSession) {
    setSession(s);
    setPhase("paying");
    try {
      await openRazorpayCheckout({
        keyId: s.keyId,
        amountPaise: s.amountPaise,
        currency: s.currency,
        razorpayOrderId: s.razorpayOrderId,
        merchantName: s.merchantName,
        description: s.description,
        prefill: s.prefill,
        onSuccess: (r) => void verify(s.orderId, r),
        onFailure: (r: RazorpayFailure) => {
          setFailMsg(r.error?.description ?? null);
          setPhase("failed");
        },
        onDismiss: () => setPhase((p) => (p === "paying" ? "dismissed" : p)),
      });
    } catch (err) {
      setError(errMsg(err));
      setPhase("failed");
    }
  }

  async function proceed(e: React.FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPhase("creating");
    setError(null);
    try {
      const res = await apiRequest<CheckoutStarted>({
        url: "/api/checkout", method: "POST", headers: { "Idempotency-Key": key },
        body: { items: items.map((i) => ({ lotId: i.lotId, quantity: i.quantity })), fulfillmentMethod: method, ...(method !== "CUSTOMER_PICKUP" && { deliveryAddress: address }), ...(notes && { customerNotes: notes }) },
      });
      if (res.alreadyPaid || !res.session) {
        setPaid(res.order);
        setPhase("success");
        return;
      }
      await open(res.session);
    } catch (err) {
      setPhase("form");
      setError(errMsg(err));
      void preview.refetch();
    } finally {
      busy.current = false;
    }
  }

  async function resume() {
    if (!session) return;
    setPhase("creating");
    try {
      await open(await getCheckoutSession(session.orderId));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setPhase("expired");
      else {
        setError(errMsg(err));
        setPhase("failed");
      }
    }
  }

  async function cancel() {
    if (!session) return;
    try {
      await apiRequest({ url: `/api/orders/${session.orderId}/cancel`, method: "POST", body: { reason: "Cancelled during checkout" } });
      toast({ title: t("pay.state.cancelled") });
      void qc.invalidateQueries();
      navigate("/cart");
    } catch (err) {
      toast({ title: errMsg(err), variant: "destructive" });
    }
  }

  async function placeDirect(e: React.FormEvent) {
    e.preventDefault();
    setPhase("creating");
    try {
      const o = await apiRequest<Order>({
        url: "/api/orders", method: "POST", headers: { "Idempotency-Key": key },
        body: { items: items.map((i) => ({ lotId: i.lotId, quantity: i.quantity })), fulfillmentMethod: method, ...(method !== "CUSTOMER_PICKUP" && { deliveryAddress: address }), ...(notes && { customerNotes: notes }) },
      });
      void qc.invalidateQueries();
      navigate(`/customer/orders/${o.id}`);
    } catch (err) {
      setPhase("form");
      setError(errMsg(err));
    }
  }

  // ------------------------------------------------------------------ result screens
  if (phase === "success" && paid) {
    return (
      <Shell>
        <Card className="mx-auto max-w-xl p-8 text-center sm:p-10">
          <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-accent/50 bg-accent/15 text-accent"><Check className="h-8 w-8" strokeWidth={1.6} /></span>
          <h1 className="text-3xl font-extralight tracking-tight">✓ {t("pay.state.successTitle")}</h1>
          <p className="mt-1 text-accent">✓ {t("pay.state.confirmed")}</p>
          <div className="mx-auto mt-6 max-w-sm text-left text-sm">
            <Kv k={t("pay.state.orderId")} v={<span className="font-mono">{paid.orderCode}</span>} />
            <Kv k={t("pay.state.paymentId")} v={<span className="break-all font-mono text-xs">{paid.payment?.razorpayPaymentId ?? "—"}</span>} />
            <Kv k={t("pay.state.amountPaid")} v={inr(paid.totalAmount)} />
            {paid.payment?.method && <Kv k={t("pay.state.method")} v={paid.payment.method.toUpperCase()} />}
          </div>
          <p className="mt-5 text-xs text-ink/55">{t("pay.state.successNote")}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href={`/customer/orders/${paid.id}`}><Button className="rounded-full">{t("pay.state.track")}</Button></Link>
            {paid.items[0]?.publicToken && <Link href={`/trace/${paid.items[0].publicToken}`}><Button variant="outline" className="rounded-full"><QrCode className="mr-2 h-4 w-4" />{t("pay.state.viewTrace")}</Button></Link>}
          </div>
        </Card>
      </Shell>
    );
  }
  if (phase === "verifying") {
    return <Shell><Card className="mx-auto max-w-md p-10 text-center"><Loading label={t("pay.state.verifying")} /><p className="mt-3 text-xs text-ink/50">{t("pay.state.verifyingBody")}</p></Card></Shell>;
  }
  if (phase === "failed" || phase === "dismissed" || phase === "expired" || phase === "unverified") {
    const m = {
      failed: { icon: AlertTriangle, tone: "text-rose-300", title: t("pay.state.failedTitle"), body: failMsg ?? error ?? t("pay.state.failedBody", { time: hold(session) }) },
      dismissed: { icon: Clock, tone: "text-amber-300", title: t("pay.state.dismissedTitle"), body: t("pay.state.dismissedBody", { time: hold(session) }) },
      expired: { icon: Clock, tone: "text-amber-300", title: t("pay.state.expiredTitle"), body: t("pay.state.expiredBody") },
      unverified: { icon: AlertTriangle, tone: "text-amber-300", title: t("pay.state.unverifiedTitle"), body: t("pay.state.unverifiedBody", { code: session?.orderCode ?? "" }) },
    }[phase];
    const Icon = m.icon;
    return (
      <Shell>
        <Card className="mx-auto max-w-lg p-8 text-center">
          <Icon className={`mx-auto mb-4 h-12 w-12 ${m.tone}`} strokeWidth={1.3} />
          <h1 className="text-2xl font-light">{m.title}</h1>
          <p className="mt-2 text-sm text-ink/60">{m.body}</p>
          {phase === "failed" && failMsg && <p className="mt-2 text-xs text-ink/45">{t("pay.state.failedBody", { time: hold(session) })}</p>}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {(phase === "failed" || phase === "dismissed") && <Button className="rounded-full" onClick={() => void resume()}><RefreshCw className="mr-2 h-4 w-4" />{phase === "failed" ? t("pay.state.retry") : t("pay.state.resume")}</Button>}
            {(phase === "failed" || phase === "dismissed") && <Button variant="outline" className="rounded-full" onClick={() => void cancel()}>{t("pay.state.cancelOrder")}</Button>}
            {phase === "expired" && <Button className="rounded-full" onClick={() => { setKey(uuid()); setSession(null); setPhase("form"); }}>{t("pay.state.again")}</Button>}
            {phase === "unverified" && session && <Link href={`/customer/orders/${session.orderId}`}><Button className="rounded-full">{t("pay.state.track")}</Button></Link>}
          </div>
        </Card>
      </Shell>
    );
  }

  // ------------------------------------------------------------------ the checkout itself
  const working = phase === "creating" || phase === "paying";
  const mixed = !!pv && !pv.singleFarmer;
  const canPay = ready && !working && (method === "CUSTOMER_PICKUP" || address.trim().length > 0);
  const setQty = (lotId: string, v: string) => setItems((cur) => cur.map((i) => (i.lotId === lotId ? { ...i, quantity: Number(v) || 0 } : i)));
  return (
    <Shell>
      <div className="mb-2 eyebrow">{t("pay.checkout.title").toUpperCase()}</div>
      <h1 className="mb-1 text-4xl font-extralight tracking-tight">{t("pay.checkout.title")}</h1>
      <p className="mb-6 max-w-xl text-sm text-ink/55">{t("pay.checkout.subtitle")}</p>
      <Steps active={working ? 2 : ready ? 1 : 0} />
      <div className="grid gap-5 lg:grid-cols-5">
        <form onSubmit={enabled ? proceed : placeDirect} className="space-y-5 lg:col-span-3">
          <Card className="space-y-4 p-6">
            <h2 className="eyebrow">{t("checkout.itemsTitle").toUpperCase()}</h2>
            <ul className="divide-y divide-white/10">
              {(pv?.lines ?? []).map((l) => (
                <li key={l.lotId} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-light">{cropName(l.productName)} <span className="text-ink/50">· {l.variety}</span></div>
                      <div className="font-mono text-[11px] text-ink/45">{l.lotCode}</div>
                    </div>
                    <div className="text-right text-sm"><div>{qty(l.quantity, l.unit)} × {inr(l.unitPrice)}</div><div className="font-medium">{inr(l.lineTotal)}</div></div>
                  </div>
                  {single && (
                    <Field label={t("market.quantityUnit", { unit: unitLabel(l.unit) })}>
                      <input className={inputCls} type="number" required min="0.001" max={l.available} step="any" value={items[0].quantity || ""} onChange={(e) => setQty(l.lotId, e.target.value)} disabled={working} />
                    </Field>
                  )}
                  {l.issues.map((i) => <p key={i} role="alert" className="mt-1.5 text-xs text-rose-300">{t(`cart.issue.${i}`, { n: l.available, unit: unitLabel(l.unit) })}</p>)}
                </li>
              ))}
            </ul>
            {!single && <Link href="/cart" className="inline-block text-xs text-accent hover:underline">{t("checkout.editInCart")}</Link>}
            {mixed && <p role="alert" className="text-sm text-rose-300">{t("checkout.mixed")}</p>}
            {preview.error && <p role="alert" className="text-sm text-rose-300">{t("checkout.previewFailed")}</p>}
          </Card>
          <Card className="space-y-4 p-6">
            <h2 className="eyebrow">{t("pay.checkout.fulfilment").toUpperCase()}</h2>
            <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value as FulfillmentMethod)} disabled={working} aria-label={t("pay.checkout.fulfilment")}>
              {["CUSTOMER_PICKUP", "FARMER_DELIVERY", "THIRD_PARTY_DELIVERY"].map((k) => <option key={k} value={k}>{enumLabel("fulfillment", k)}</option>)}
            </select>
            {method !== "CUSTOMER_PICKUP" && (
              <Field label={t("pay.checkout.address")} hint={t("pay.checkout.addressHint")}>
                <textarea className={textareaCls} rows={3} required value={address} onChange={(e) => setAddress(e.target.value)} disabled={working} />
              </Field>
            )}
            <Field label={t("pay.checkout.note")}><input className={inputCls} value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} disabled={working} /></Field>
          </Card>

          {error && <div role="alert" className="rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-200">{error}</div>}
          {hasIssues && <p role="alert" className="text-sm text-rose-300">{t("checkout.issues")}</p>}

          {enabled ? (
            <div className="space-y-3">
              <Button disabled={!canPay} className="h-14 w-full rounded-full text-[15px]">
                <Lock className="mr-2 h-4 w-4" />{phase === "creating" ? t("pay.checkout.preparing") : phase === "paying" ? t("pay.state.waiting") : `${t("pay.checkout.proceed")}${subtotal != null ? ` · ${inr(subtotal)}` : ""}`}
              </Button>
              <p className="flex items-start gap-2 text-[12px] leading-relaxed text-ink/50"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{t("pay.checkout.secure")}</p>
              <p className="flex items-start gap-2 text-[12px] leading-relaxed text-ink/45"><Clock className="mt-0.5 h-4 w-4 shrink-0" />{t("pay.checkout.hold", { n: cfg.data?.holdMinutes ?? 20 })}</p>
              {cfg.data?.mode === "test" && <Pill className="bg-amber-400/15 text-amber-300">{t("pay.checkout.testMode")}</Pill>}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-ink/70">{t("pay.checkout.notEnabled")}</p>
              <Button disabled={!canPay} className="h-12 w-full rounded-full">{t("pay.checkout.placeDirect")}</Button>
            </div>
          )}
        </form>

        <aside className="lg:col-span-2">
          <Card className="sticky top-28 overflow-hidden">
            {first && (
              <div className="relative aspect-[16/8]">
                <ProduceTile name={first.productName} seed={first.lotCode} className="absolute inset-0" />
                <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full glass-strong px-3 py-1.5 text-[10px] tracking-[0.18em]">
                  {pv.farmer.verified ? <><BadgeCheck className="h-3.5 w-3.5 text-accent" />{t("pay.checkout.verified").toUpperCase()}</> : t("pay.checkout.unverified").toUpperCase()}
                </div>
              </div>
            )}
            <div className="p-6">
              <h2 className="eyebrow mb-4">{t("pay.checkout.summary").toUpperCase()}</h2>
              {pv && <Kv k={t("pay.checkout.farmer")} v={<span className="inline-flex items-center gap-1"><Sprout className="h-3.5 w-3.5 text-ink/40" />{pv.farmer.publicName}{pv.farmer.verified && <BadgeCheck className="h-4 w-4 text-accent" />}</span>} />}
              {(pv?.lines ?? []).map((l) => (
                <Kv key={l.lotId} k={`${cropName(l.productName)} · ${qty(l.quantity, l.unit)}`} v={inr(l.lineTotal)} />
              ))}
              <div className="my-3 h-px bg-white/10" />
              <Kv k={t("pay.checkout.subtotal")} v={subtotal != null ? inr(subtotal) : "—"} />
              <Kv k={t("pay.checkout.delivery")} v={<span className="text-ink/60">{t("pay.checkout.deliveryFree")}</span>} />
              <p className="-mt-1 mb-2 text-[11px] text-ink/40">{t("pay.checkout.deliveryNote")}</p>
              <div className="mt-2 flex items-baseline justify-between border-t border-white/10 pt-4"><span className="eyebrow">{t("pay.checkout.total").toUpperCase()}</span><span className="text-3xl font-extralight text-accent">{subtotal != null ? inr(subtotal) : "—"}</span></div>
            </div>
          </Card>
          <Link href={single ? `/marketplace/${items[0].lotId}` : "/cart"} className="mt-3 block text-center text-xs text-ink/45 hover:text-ink/70">← {single ? t("pay.checkout.back") : t("cart.view")}</Link>
        </aside>
      </div>
    </Shell>
  );
}
