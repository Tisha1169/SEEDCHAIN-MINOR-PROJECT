import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCartQueryKey, useGetCart, type CartGroup, type PricedLine } from "@workspace/api-client-react";
import { AlertTriangle, BadgeCheck, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProduceTile } from "@/components/art";
import { Card, Empty, ErrorState, Loading, PageHeader, Pill } from "@/components/app/common";
import { useToast } from "@/hooks/use-toast";
import { refreshCart } from "@/hooks/use-cart";
import { apiRequest, errMsg } from "@/lib/api";
import { cropName, inr, unitLabel } from "@/lib/format";

function CartLine({ line, onChange, onRemove, busy }: { line: PricedLine; onChange: (q: number) => void; onRemove: () => void; busy: boolean }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<string>(String(line.quantity));
  const step = line.unit === "kg" ? 1 : 1;
  const commit = (v: number) => {
    if (!(v > 0)) return setDraft(String(line.quantity));
    if (v !== line.quantity) onChange(v);
  };
  const bad = line.issues.length > 0;
  return (
    <li className={`rounded-2xl border p-4 ${bad ? "border-rose-400/30 bg-rose-400/[0.05]" : "border-white/10 bg-white/[0.03]"}`}>
      <div className="flex gap-4">
        <Link href={`/marketplace/${line.lotId}`} className="hidden h-20 w-24 shrink-0 overflow-hidden rounded-xl sm:block" aria-hidden tabIndex={-1}>
          <ProduceTile name={line.productName} seed={line.lotCode} className="h-full w-full" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <Link href={`/marketplace/${line.lotId}`} className="text-lg font-light tracking-tight hover:underline">{cropName(line.productName)} <span className="text-ink/50">· {line.variety}</span></Link>
              <div className="font-mono text-[11px] text-ink/45">{line.lotCode}{line.qualityGrade ? ` · Grade ${line.qualityGrade}` : ""}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-medium">{line.lineTotal != null ? inr(line.lineTotal) : "—"}</div>
              {line.unitPrice != null && <div className="text-[11px] text-ink/50">{t("cart.perUnit", { price: inr(line.unitPrice), unit: unitLabel(line.unit) })}</div>}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center rounded-full border border-white/15" role="group" aria-label={t("cart.quantity")}>
              <button type="button" className="px-3 py-2 disabled:opacity-40" disabled={busy || line.quantity - step <= 0} onClick={() => onChange(Math.max(step, line.quantity - step))} aria-label="−"><Minus className="h-3.5 w-3.5" /></button>
              <input
                className="w-20 bg-transparent text-center text-sm outline-none"
                type="number" min="0.001" step="any" inputMode="decimal" value={draft} aria-label={t("cart.quantity")}
                onChange={(e) => setDraft(e.target.value)} onBlur={() => commit(Number(draft))} onKeyDown={(e) => e.key === "Enter" && commit(Number(draft))}
              />
              <button type="button" className="px-3 py-2 disabled:opacity-40" disabled={busy || line.quantity + step > line.available} onClick={() => onChange(line.quantity + step)} aria-label="+"><Plus className="h-3.5 w-3.5" /></button>
            </div>
            <span className="text-xs text-ink/50">{unitLabel(line.unit)} · {t("cart.available", { n: line.available, unit: unitLabel(line.unit) })}</span>
            <Button variant="ghost" size="sm" className="ml-auto rounded-full text-ink/60" disabled={busy} onClick={onRemove}><Trash2 className="mr-1.5 h-3.5 w-3.5" />{t("cart.remove")}</Button>
          </div>

          {line.issues.map((i) => (
            <p key={i} role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-rose-300"><AlertTriangle className="h-3.5 w-3.5" />{t(`cart.issue.${i}`, { n: line.available, unit: unitLabel(line.unit) })}</p>
          ))}
          {line.priceChanged && line.priceAtAdd != null && line.unitPrice != null && (
            <p className="mt-2 text-xs text-amber-300">{t("cart.priceChanged", { old: inr(line.priceAtAdd), new: inr(line.unitPrice) })}</p>
          )}
        </div>
      </div>
    </li>
  );
}

function Group({ g, busy, onChange, onRemove }: { g: CartGroup; busy: boolean; onChange: (l: PricedLine, q: number) => void; onRemove: (l: PricedLine) => void }) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const go = () => navigate(`/checkout?lots=${g.lines.map((l) => `${l.lotId}:${l.quantity}`).join(",")}`);
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm tracking-wide text-ink/80">{t("cart.fromFarmer", { farmer: g.farmer.publicName })}{g.farmer.verified && <BadgeCheck className="h-4 w-4 text-accent" />}</h2>
        <Pill className="bg-white/10 text-ink/60">{t("cart.items", { count: g.lines.length })}</Pill>
      </div>
      <ul className="space-y-3">{g.lines.map((l) => <CartLine key={l.lotId} line={l} busy={busy} onChange={(q) => onChange(l, q)} onRemove={() => onRemove(l)} />)}</ul>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <div>
          <div className="eyebrow">{t("cart.subtotal").toUpperCase()}</div>
          <div className="text-2xl font-extralight text-accent">{inr(g.subtotal)}</div>
        </div>
        <div className="text-right">
          <Button className="rounded-full" disabled={!g.canCheckout || busy} onClick={go}><ShoppingBag className="mr-2 h-4 w-4" />{t("cart.checkoutFarmer", { farmer: g.farmer.publicName })}</Button>
          {!g.canCheckout && <p className="mt-1.5 text-[11px] text-rose-300">{t("cart.checkoutBlocked")}</p>}
        </div>
      </div>
    </Card>
  );
}

export default function CartPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const q = useGetCart({ query: { queryKey: getGetCartQueryKey(), refetchOnWindowFocus: true } });
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await refreshCart(qc);
    } catch (err) {
      toast({ title: t("cart.updateFailed"), description: errMsg(err), variant: "destructive" });
      await refreshCart(qc);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title={t("cart.title")} subtitle={t("cart.subtitle")} actions={q.data && q.data.itemCount > 0 ? <Button variant="outline" size="sm" className="rounded-full" disabled={busy} onClick={() => void run(() => apiRequest({ url: "/api/cart", method: "DELETE" }))}>{t("cart.clear")}</Button> : undefined} />
      {q.isLoading ? <Loading /> : q.error || !q.data ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : q.data.itemCount === 0 ? (
        <Empty title={t("cart.empty")} hint={t("cart.emptyHint")} action={<Link href="/marketplace"><Button className="rounded-full">{t("cart.browse")}</Button></Link>} />
      ) : (
        <div className="space-y-5">
          <p className="text-xs text-ink/50">{t("cart.separate")}</p>
          {q.data.groups.map((g) => (
            <Group
              key={g.farmer.id} g={g} busy={busy}
              onChange={(l, quantity) => void run(() => apiRequest({ url: `/api/cart/items/${l.lotId}`, method: "PATCH", body: { quantity } }))}
              onRemove={(l) => void run(() => apiRequest({ url: `/api/cart/items/${l.lotId}`, method: "DELETE" }))}
            />
          ))}
          <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div><div className="eyebrow">{t("cart.total").toUpperCase()}</div><div className="text-xs text-ink/45">{t("cart.totalNote")}</div></div>
            <div className="text-3xl font-extralight">{inr(q.data.total)}</div>
          </Card>
          <Link href="/marketplace" className="inline-block text-sm text-accent hover:underline">← {t("cart.continue")}</Link>
        </div>
      )}
    </>
  );
}
