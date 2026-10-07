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
import { dateTime, FULFILLMENT_LABEL, inr, qty, titleCase } from "@/lib/format";

const EVENT_LABEL: Record<string, string> = {
  ORDER_CREATED: "Order placed; stock reserved", ORDER_ACCEPTED: "Accepted by farmer", ORDER_REJECTED: "Rejected by farmer", ORDER_PREPARED: "Being prepared",
  ORDER_READY: "Ready", ORDER_DISPATCHED: "Dispatched", DELIVERY_COMPLETED: "Delivery completed", CUSTOMER_PICKUP: "Handed over at pickup",
  CUSTOMER_RECEIVED: "Customer confirmed receipt", ORDER_CANCELLED: "Cancelled; stock released",
};

export function OrdersList({ base }: { base: "farmer" | "customer" | "admin" }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<string>("");
  const q = useListOrders(status ? { status: status as never } : undefined);
  const href = (o: Order) => `/${base}/orders/${o.id}`;
  return (
    <>
      <PageHeader title={base === "customer" ? "My orders" : base === "farmer" ? "Customer orders" : "All orders"} subtitle="Statuses update live as the farmer progresses each order."
        actions={<select className="h-10 rounded-full border bg-glass-2 px-4 text-sm" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{["PENDING", "ACCEPTED", "PREPARING", "READY", "DISPATCHED", "DELIVERED", "CUSTOMER_CONFIRMED", "REJECTED", "CANCELLED"].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</select>} />
      {q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : !q.data?.length ? (
        <Empty title="No orders yet" hint={user?.role === "customer" ? "Browse produce and order directly from a farmer." : "Orders from customers appear here instantly."} action={user?.role === "customer" ? <Link href="/marketplace"><Button className="rounded-full bg-glass-2 text-neutral-950">Browse produce</Button></Link> : undefined} />
      ) : (
        <Table head={["Order", base === "customer" ? "Farmer" : "Customer", "Items", "Total", "Fulfilment", "Status", "Placed", ""]}>
          {q.data.map((o) => (
            <tr key={o.id} className="hover:bg-white/[0.04]">
              <td className="px-4 py-3 font-mono text-xs">{o.orderCode}</td>
              <td className="px-4 py-3">{base === "customer" ? o.farmer.publicName : o.customer.name}</td>
              <td className="px-4 py-3">{o.items.map((i) => `${i.quantity} ${i.unit} ${i.variety}`).join(", ")}</td>
              <td className="px-4 py-3">{inr(o.totalAmount)}</td>
              <td className="px-4 py-3 text-xs">{FULFILLMENT_LABEL[o.fulfillmentMethod]}</td>
              <td className="px-4 py-3"><OrderStatusPill status={o.status} /></td>
              <td className="px-4 py-3 text-xs">{dateTime(o.createdAt)}</td>
              <td className="px-4 py-3"><Link href={href(o)} className="font-medium text-accent">Open{o.allowedActions.length ? ` · ${o.allowedActions.length} action` : ""}</Link></td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}

function FeedbackForm({ order }: { order: Order }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  return (
    <Card className="p-5">
      <h3 className="mb-3 eyebrow !text-ink/75">How was it?</h3>
      <div className="mb-3 flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => setRating(n)} className={`text-2xl ${n <= rating ? "text-amber-400" : "text-zinc-300"}`} aria-label={`${n} stars`}>★</button>)}</div>
      <textarea className={textareaCls} rows={2} placeholder="Optional comment" value={comment} onChange={(e) => setComment(e.target.value)} />
      <Button className="mt-3 rounded-full bg-glass-2 text-neutral-950" onClick={async () => {
        try {
          await apiRequest({ url: `/api/orders/${order.id}/feedback`, method: "POST", body: { rating, ...(comment && { comment }) } });
          toast({ title: "Thanks for your feedback" });
          await qc.invalidateQueries();
        } catch (err) { toast({ title: "Could not save feedback", description: errMsg(err), variant: "destructive" }); }
      }}>Send feedback</Button>
    </Card>
  );
}

export function OrderDetail({ base }: { base: "farmer" | "customer" | "admin" }) {
  const [, params] = useRoute(`/${base}/orders/:id`);
  const id = params!.id;
  const { user } = useAuth();
  const q = useGetOrder(id, { query: { queryKey: [`/api/orders/${id}`], retry: false } });
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const o = q.data;
  return (
    <>
      <PageHeader title={`Order ${o.orderCode}`} subtitle={<span className="inline-flex items-center gap-2"><OrderStatusPill status={o.status} />Placed {dateTime(o.createdAt)}</span>} actions={<Link href={`/${base}/orders`}><Button variant="outline" className="rounded-full">All orders</Button></Link>} />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-5">
            <h3 className="mb-3 eyebrow !text-ink/75">Items</h3>
            {o.items.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-3 last:border-0">
                <div><div className="font-medium">{i.productName} · {i.variety}</div><div className="font-mono text-xs text-ink/50">{i.lotCode}</div></div>
                <div className="text-right text-sm"><div>{qty(i.quantity, i.unit)} × {inr(i.unitPrice)}</div><div className="font-medium">{inr(i.lineTotal)}</div></div>
                {i.publicToken && <Link href={`/trace/${i.publicToken}`} className="text-xs font-medium text-accent">View lot trace</Link>}
              </div>
            ))}
            <div className="mt-3 flex justify-between text-lg font-medium"><span>Total</span><span>{inr(o.totalAmount)}</span></div>
          </Card>
          {o.allowedActions.length > 0 && <Card className="p-5"><h3 className="mb-3 eyebrow !text-ink/75">Next step</h3><OrderActions order={o} /></Card>}
          <Card className="p-5">
            <h3 className="mb-4 eyebrow !text-ink/75">Order history</h3>
            <Timeline items={(o.events ?? []).map((e) => ({ key: e.id, label: EVENT_LABEL[e.eventType] ?? titleCase(e.eventType), time: e.eventTime, detail: e.reason, meta: `${e.actorName ?? "System"}${e.actorRole ? ` (${e.actorRole})` : ""}` }))} />
          </Card>
          {user?.role === "customer" && o.status === "CUSTOMER_CONFIRMED" && !o.feedback && <FeedbackForm order={o} />}
          {o.feedback && <Card className="p-5"><h3 className="eyebrow !text-ink/75">Customer feedback</h3><div className="text-amber-400">{"★".repeat(o.feedback.rating)}</div>{o.feedback.comment && <p className="text-sm">{o.feedback.comment}</p>}</Card>}
        </div>
        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="mb-2 eyebrow !text-ink/75">Fulfilment</h3>
            <Kv k="Method" v={FULFILLMENT_LABEL[o.fulfillmentMethod]} />
            {o.deliveryAddress && <Kv k="Deliver to" v={o.deliveryAddress} />}
            {o.thirdPartyName && <Kv k="Courier (reference only)" v={`${o.thirdPartyName}${o.thirdPartyReference ? ` · ${o.thirdPartyReference}` : ""}`} />}
            {o.deliveryLocation && <Kv k="Handover location" v={o.deliveryLocation} />}
            {o.deliveryNotes && <Kv k="Notes" v={o.deliveryNotes} />}
            {o.customerNotes && <Kv k="Customer note" v={o.customerNotes} />}
            {o.rejectionReason && <Kv k="Rejection reason" v={o.rejectionReason} />}
            {o.cancelReason && <Kv k="Cancel reason" v={o.cancelReason} />}
          </Card>
          <Card className="p-5">
            <h3 className="mb-2 eyebrow !text-ink/75">People</h3>
            <Kv k="Farmer" v={<Link href={`/farmers/${o.farmer.id}`} className="text-accent">{o.farmer.publicName}</Link>} />
            <Kv k="Customer" v={o.customer.name} />
            {o.customer.phone && <Kv k="Customer phone" v={o.customer.phone} />}
          </Card>
        </div>
      </div>
    </>
  );
}
