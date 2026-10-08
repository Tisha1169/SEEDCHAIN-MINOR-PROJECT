import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useListPayments, type PaymentRecord } from "@workspace/api-client-react";
import { Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, ErrorState, Loading, PageHeader, Pill, Table, textareaCls } from "@/components/app/common";
import { PaymentPill } from "@/components/app/payment-panel";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, errMsg } from "@/lib/api";
import { dateTime, inr } from "@/lib/format";

const key = ["/api/admin/payments"];

export default function AdminPaymentsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const q = useListPayments({ query: { queryKey: key, refetchInterval: 30_000 } });
  const [target, setTarget] = useState<PaymentRecord | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function refund() {
    if (!target) return;
    setBusy(true);
    try {
      await apiRequest({ url: `/api/admin/payments/${target.id}/refund`, method: "POST", body: { reason } });
      toast({ title: t("pay.admin.refundDone") });
      setTarget(null);
      setReason("");
      await qc.invalidateQueries();
    } catch (err) {
      toast({ title: errMsg(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const Flag = ({ on }: { on: boolean }) => (on ? <Check className="h-4 w-4 text-accent" aria-label="yes" /> : <Minus className="h-4 w-4 text-ink/30" aria-label="no" />);
  return (
    <>
      <PageHeader title={t("pay.admin.title")} subtitle={t("pay.admin.subtitle")} />
      {q.isLoading ? <Loading /> : q.error || !q.data ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : !q.data.length ? (
        <Empty title={t("pay.admin.empty")} hint={t("pay.admin.emptyHint")} />
      ) : (
        <>
          <Table head={[t("pay.admin.when"), t("pay.admin.order"), t("pay.admin.customer"), t("pay.admin.amount"), t("pay.admin.status"), t("pay.admin.method"), `${t("pay.admin.checks")}: ${t("pay.admin.signature")} / ${t("pay.admin.webhook")}`, ""]}>
            {q.data.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2 text-xs text-ink/60">{dateTime(p.paidAt ?? p.createdAt)}</td>
                <td className="px-4 py-2"><Link href={`/admin/orders/${p.orderId}`} className="font-mono text-xs text-accent">{p.orderCode}</Link>{p.mode === "test" && <Pill className="ml-2 bg-amber-400/15 text-amber-300">TEST</Pill>}</td>
                <td className="px-4 py-2">{p.customerName}</td>
                <td className="px-4 py-2 font-medium">{inr(p.amountPaise / 100)}</td>
                <td className="px-4 py-2"><PaymentPill status={p.status === "CREATED" ? "PAYMENT_PENDING" : p.status === "PROCESSING" ? "PAYMENT_PROCESSING" : p.status === "FAILED" ? "PAYMENT_FAILED" : p.status === "CANCELLED" ? "PAYMENT_CANCELLED" : p.status} />{p.failureReason && <div className="mt-1 text-[11px] text-rose-300/80">{p.failureReason}</div>}</td>
                <td className="px-4 py-2 uppercase text-ink/70">{p.method ?? "—"}</td>
                <td className="px-4 py-2"><span className="inline-flex items-center gap-3"><Flag on={p.signatureVerified} /><Flag on={p.webhookVerified} /></span></td>
                <td className="px-4 py-2 text-right">{(p.status === "PAID" || p.status === "REFUND_PENDING") && !p.refundId && <Button size="sm" variant="outline" className="rounded-full" onClick={() => setTarget(p)}>{t("pay.admin.refund")}</Button>}</td>
              </tr>
            ))}
          </Table>
        </>
      )}
      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("pay.admin.refundTitle")}{target ? ` · ${target.orderCode}` : ""}</DialogTitle></DialogHeader>
          <p className="text-sm text-ink/65">{t("pay.admin.refundBody")}</p>
          <label className="block text-xs text-ink/60">{t("pay.admin.refundReason")}<textarea className={`${textareaCls} mt-1`} rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          <Button className="rounded-full" disabled={busy || reason.trim().length < 5} onClick={() => void refund()}>{t("pay.admin.refund")} {target ? inr(target.amountPaise / 100) : ""}</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
