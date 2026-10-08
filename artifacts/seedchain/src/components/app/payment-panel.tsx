import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { getCheckoutSession, type Order } from "@workspace/api-client-react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Kv, Pill } from "@/components/app/common";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, errMsg } from "@/lib/api";
import { dateTime, inr } from "@/lib/format";
import { openRazorpayCheckout } from "@/lib/razorpay";

const PILL: Record<string, string> = {
  UNPAID: "bg-white/10 text-ink/60",
  PAYMENT_PENDING: "bg-amber-400/15 text-amber-300",
  PAYMENT_PROCESSING: "bg-sky-400/15 text-sky-300",
  PAID: "bg-emerald-400/15 text-emerald-300",
  PAYMENT_FAILED: "bg-rose-400/15 text-rose-300",
  PAYMENT_CANCELLED: "bg-zinc-400/15 text-zinc-300",
  REFUND_PENDING: "bg-amber-400/15 text-amber-300",
  REFUNDED: "bg-sky-400/15 text-sky-300",
};

export function PaymentPill({ status }: { status: string }) {
  const { t } = useTranslation();
  return <Pill className={PILL[status] ?? PILL.UNPAID}>{t(`pay.status.${status}`)}</Pill>;
}

const PAYABLE = ["PAYMENT_PENDING", "PAYMENT_PROCESSING", "PAYMENT_FAILED"];

/** Payment details for an order. Customers can resume payment while the stock hold lasts. */
export function PaymentPanel({ order }: { order: Order }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const pay = order.payment;
  const canPay = user?.role === "customer" && order.status === "PENDING" && PAYABLE.includes(order.paymentStatus) && (!order.paymentDueAt || new Date(order.paymentDueAt) > new Date());

  async function payNow() {
    setBusy(true);
    try {
      const s = await getCheckoutSession(order.id);
      await openRazorpayCheckout({
        keyId: s.keyId, amountPaise: s.amountPaise, currency: s.currency, razorpayOrderId: s.razorpayOrderId, merchantName: s.merchantName, description: s.description, prefill: s.prefill,
        onSuccess: (r) => {
          void apiRequest({ url: "/api/checkout/verify", method: "POST", body: { orderId: order.id, ...r } })
            .then(() => toast({ title: t("pay.state.successTitle") }))
            .catch((err) => toast({ title: t("pay.state.unverifiedTitle"), description: errMsg(err), variant: "destructive" }))
            .finally(() => void qc.invalidateQueries());
        },
        onFailure: (r) => toast({ title: t("pay.state.failedTitle"), description: r.error?.description, variant: "destructive" }),
        onDismiss: () => setBusy(false),
      });
    } catch (err) {
      toast({ title: errMsg(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="eyebrow !text-ink/75">{t("pay.order.title")}</h3>
        <PaymentPill status={order.paymentStatus} />
      </div>
      {pay && (
        <>
          <Kv k={t("pay.order.amount")} v={inr(pay.amountPaise / 100)} />
          {pay.method && <Kv k={t("pay.order.method")} v={pay.method.toUpperCase()} />}
          {pay.paidAt && <Kv k={t("pay.order.paidAt")} v={dateTime(pay.paidAt)} />}
          {pay.razorpayPaymentId && <Kv k={t("pay.order.paymentId")} v={<span className="break-all font-mono text-xs">{pay.razorpayPaymentId}</span>} />}
          {pay.mode === "test" && <Kv k={t("pay.order.mode")} v={<Pill className="bg-amber-400/15 text-amber-300">TEST</Pill>} />}
          {pay.failureReason && order.paymentStatus === "PAYMENT_FAILED" && <p className="mt-2 text-xs text-rose-300">{pay.failureReason}</p>}
        </>
      )}
      {user?.role === "farmer" && order.paymentStatus === "PAID" && <p className="mt-2 text-xs text-ink/55">{t("pay.order.farmerPaid")}</p>}
      {order.paymentStatus === "REFUND_PENDING" && <p className="mt-2 text-xs text-amber-300">{t("pay.order.refundNote")}</p>}
      {canPay && (
        <div className="mt-3 space-y-2">
          <Button className="w-full rounded-full" disabled={busy} onClick={() => void payNow()}><CreditCard className="mr-2 h-4 w-4" />{t("pay.order.payNow")}</Button>
          {order.paymentDueAt && <p className="text-[11px] text-ink/45">{t("pay.order.holdEnds", { time: dateTime(order.paymentDueAt) })}</p>}
        </div>
      )}
    </Card>
  );
}
