import { PaymentPanel, PaymentPill } from "@/components/app/payment-panel";
import { IntegrityChip } from "@/components/app/integrity";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Link, useRoute } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetOrder, useListOrders, type Order } from "@workspace/api-client-react";
import { Card, Empty, ErrorState, Kv, Loading, OrderStatusPill, PageHeader, Table, textareaCls } from "@/components/app/common";
import { OrderActions } from "@/components/app/order-actions";
import { Timeline } from "@/components/app/timeline";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, errMsg } from "@/lib/api";
import { serverText } from "@/lib/server-text";
import { cropName, dateTime, enumLabel, inr, qty, unitLabel } from "@/lib/format";

export function OrdersList({ base }: { base: "farmer" | "customer" | "admin" }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [status, setStatus] = useState<string>("");
  const q = useListOrders(status ? { status: status as never } : undefined);
  const href = (o: Order) => `/${base}/orders/${o.id}`;
  return (
    <>
      <PageHeader title={base === "customer" ? t("orders.titleCustomer") : base === "farmer" ? t("orders.titleFarmer") : t("orders.titleAdmin")} subtitle={t("orders.subtitle")}
        actions={<select className="h-10 rounded-full border bg-glass-2 px-4 text-sm" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t("orders.filterStatus")}><option value="">{t("orders.allStatuses")}</option>{["PENDING", "ACCEPTED", "PREPARING", "READY", "DISPATCHED", "DELIVERED", "CUSTOMER_CONFIRMED", "REJECTED", "CANCELLED"].map((s) => <option key={s} value={s}>{enumLabel("orderStatus", s)}</option>)}</select>} />
      {q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : !q.data?.length ? (
        <Empty title={t("orders.none")} hint={user?.role === "customer" ? t("orders.noneCustomer") : t("orders.noneOther")} action={user?.role === "customer" ? <Link href="/marketplace"><Button className="rounded-full">{t("orders.browse")}</Button></Link> : undefined} />
      ) : (
        <Table head={[t("orders.cols.order"), base === "customer" ? t("orders.cols.farmer") : t("orders.cols.customer"), t("orders.cols.items"), t("orders.cols.total"), t("orders.cols.fulfilment"), t("orders.cols.status"), t("orders.cols.placed"), ""]}>
          {q.data.map((o) => (
            <tr key={o.id} className="hover:bg-white/[0.04]">
              <td className="px-4 py-3 font-mono text-xs">{o.orderCode}</td>
              <td className="px-4 py-3">{base === "customer" ? o.farmer.publicName : o.customer.name}</td>
              <td className="px-4 py-3">{o.items.map((i) => `${i.quantity} ${unitLabel(i.unit)} ${i.variety}`).join(", ")}</td>
              <td className="px-4 py-3">{inr(o.totalAmount)}</td>
              <td className="px-4 py-3 text-xs">{enumLabel("fulfillment", o.fulfillmentMethod)}</td>
              <td className="px-4 py-3"><OrderStatusPill status={o.status} /></td>
              <td className="px-4 py-3 text-xs">{dateTime(o.createdAt)}</td>
              <td className="px-4 py-3"><Link href={href(o)} className="font-medium text-accent">{o.allowedActions.length ? t("orders.openActions", { n: o.allowedActions.length }) : t("orders.open")}</Link></td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}

function FeedbackForm({ order }: { order: Order }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  return (
    <Card className="p-5">
      <h3 className="mb-3 eyebrow !text-ink/75">{t("orders.feedback.title")}</h3>
      <div className="mb-3 flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => setRating(n)} className={`text-2xl ${n <= rating ? "text-amber-400" : "text-zinc-300"}`} aria-label={t("orders.feedback.stars", { n })}>★</button>)}</div>
      <textarea className={textareaCls} rows={2} placeholder={t("orders.feedback.placeholder")} value={comment} onChange={(e) => setComment(e.target.value)} />
      <Button className="mt-3 rounded-full" onClick={async () => {
        try {
          await apiRequest({ url: `/api/orders/${order.id}/feedback`, method: "POST", body: { rating, ...(comment && { comment }) } });
          toast({ title: t("orders.feedback.thanks") });
          await qc.invalidateQueries();
        } catch (err) { toast({ title: t("orders.feedback.fail"), description: errMsg(err), variant: "destructive" }); }
      }}>{t("orders.feedback.send")}</Button>
    </Card>
  );
}

export function OrderDetail({ base }: { base: "farmer" | "customer" | "admin" }) {
  const { t } = useTranslation();
  const [, params] = useRoute(`/${base}/orders/:id`);
  const id = params!.id;
  const { user } = useAuth();
  const q = useGetOrder(id, { query: { queryKey: [`/api/orders/${id}`], retry: false } });
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const o = q.data;
  return (
    <>
      <PageHeader title={t("orders.detail.title", { code: o.orderCode })} subtitle={<span className="inline-flex items-center gap-2"><OrderStatusPill status={o.status} />{o.paymentStatus !== "UNPAID" && <PaymentPill status={o.paymentStatus} />}{t("orders.detail.placed", { time: dateTime(o.createdAt) })}</span>} actions={<Link href={`/${base}/orders`}><Button variant="outline" className="rounded-full">{t("orders.detail.allOrders")}</Button></Link>} />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-5">
            <h3 className="mb-3 eyebrow !text-ink/75">{t("orders.detail.items")}</h3>
            {o.items.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-3 last:border-0">
                <div><div className="font-medium">{cropName(i.productName)} · {i.variety}</div><div className="font-mono text-xs text-ink/50">{i.lotCode}</div></div>
                <div className="text-right text-sm"><div>{qty(i.quantity, i.unit)} × {inr(i.unitPrice)}</div><div className="font-medium">{inr(i.lineTotal)}</div></div>
                {i.publicToken && <Link href={`/trace/${i.publicToken}`} className="text-xs font-medium text-accent">{t("orders.detail.viewTrace")}</Link>}
              </div>
            ))}
            <div className="mt-3 flex justify-between text-lg font-medium"><span>{t("orders.detail.total")}</span><span>{inr(o.totalAmount)}</span></div>
          </Card>
          {o.allowedActions.length > 0 && <Card className="p-5"><h3 className="mb-3 eyebrow !text-ink/75">{t("orders.detail.next")}</h3><OrderActions order={o} /></Card>}
          <Card className="p-5">
            <h3 className="mb-4 eyebrow !text-ink/75">{t("orders.detail.history")}</h3>
            <Timeline items={(o.events ?? []).map((e) => ({ key: e.id, label: enumLabel("orderEvent", e.eventType), time: e.eventTime, detail: serverText(e.reason), meta: `${e.actorName ?? t("orders.detail.system")}${e.actorRole ? ` (${enumLabel("role", e.actorRole)})` : ""}` }))} />
          </Card>
          {user?.role === "customer" && o.status === "CUSTOMER_CONFIRMED" && !o.feedback && <FeedbackForm order={o} />}
          {o.feedback && <Card className="p-5"><h3 className="eyebrow !text-ink/75">{t("orders.feedback.customerFeedback")}</h3><div className="text-amber-400">{"★".repeat(o.feedback.rating)}</div>{o.feedback.comment && <p className="text-sm">{o.feedback.comment}</p>}</Card>}
        </div>
        <div className="space-y-5">
          {o.paymentStatus !== "UNPAID" && <PaymentPanel order={o} />}
          {o.items[0]?.publicToken && (
            <Card className="p-5">
              <h3 className="mb-2 eyebrow !text-ink/75">{t("pay.order.identity")}</h3>
              <div className="font-mono text-sm">{o.items[0].lotCode}</div>
              <p className="mt-1 text-[11px] text-ink/45">{t("pay.order.identityHint")}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2"><IntegrityChip token={o.items[0].publicToken} /><Link href={`/trace/${o.items[0].publicToken}`} className="text-xs font-medium text-accent">{t("orders.detail.viewTrace")}</Link></div>
            </Card>
          )}
          <Card className="p-5">
            <h3 className="mb-2 eyebrow !text-ink/75">{t("orders.detail.fulfilment")}</h3>
            <Kv k={t("orders.detail.method")} v={enumLabel("fulfillment", o.fulfillmentMethod)} />
            {o.deliveryAddress && <Kv k={t("orders.detail.deliverTo")} v={o.deliveryAddress} />}
            {o.thirdPartyName && <Kv k={t("orders.detail.courier")} v={`${o.thirdPartyName}${o.thirdPartyReference ? ` · ${o.thirdPartyReference}` : ""}`} />}
            {o.deliveryLocation && <Kv k={t("orders.detail.handover")} v={o.deliveryLocation} />}
            {o.deliveryNotes && <Kv k={t("orders.detail.notes")} v={o.deliveryNotes} />}
            {o.customerNotes && <Kv k={t("orders.detail.customerNote")} v={o.customerNotes} />}
            {o.rejectionReason && <Kv k={t("orders.detail.rejection")} v={o.rejectionReason} />}
            {o.cancelReason && <Kv k={t("orders.detail.cancel")} v={o.cancelReason} />}
          </Card>
          <Card className="p-5">
            <h3 className="mb-2 eyebrow !text-ink/75">{t("orders.detail.people")}</h3>
            <Kv k={t("orders.detail.farmer")} v={<Link href={`/farmers/${o.farmer.id}`} className="text-accent">{o.farmer.publicName}</Link>} />
            <Kv k={t("orders.detail.customer")} v={o.customer.name} />
            {o.customer.phone && <Kv k={t("orders.detail.customerPhone")} v={o.customer.phone} />}
          </Card>
        </div>
      </div>
    </>
  );
}
