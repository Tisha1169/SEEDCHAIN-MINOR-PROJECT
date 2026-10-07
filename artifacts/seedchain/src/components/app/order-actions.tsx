import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Order, OrderAction } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { errMsg, uuid } from "@/lib/api";
import { submitOrQueue } from "@/lib/offline-queue";
import { Field, inputCls, textareaCls } from "./common";
import { useAuth } from "@/hooks/use-auth";

const DANGER = new Set<OrderAction>(["reject", "cancel"]);

/**
 * Buttons are rendered from `order.allowedActions`, which the backend
 * computes from its state machine. The UI cannot offer an illegal move, and
 * the backend would refuse it anyway.
 */
export function OrderActions({ order }: { order: Order }) {
  const { t } = useTranslation();
  const LABEL = (a: OrderAction) => t(`orders.actions.${a}`);
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<OrderAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ reason: "", deliveryLocation: "", deliveryNotes: "", thirdPartyName: "", thirdPartyReference: "", gps: false });
  if (!order.allowedActions.length) return null;

  const needsDialog = (a: OrderAction) =>
    a === "reject" || a === "cancel" || a === "dispatch" || a === "complete" || (a === "confirm-receipt" && user?.role === "admin");

  async function run(action: OrderAction) {
    setBusy(true);
    try {
      let latitude: number | undefined;
      let longitude: number | undefined;
      if (form.gps && action === "complete" && "geolocation" in navigator) {
        const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 }));
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      }
      const clientEventId = uuid();
      const body = {
        clientEventId,
        eventTime: new Date().toISOString(),
        ...(form.reason && { reason: form.reason }),
        ...(form.deliveryLocation && { deliveryLocation: form.deliveryLocation }),
        ...(form.deliveryNotes && { deliveryNotes: form.deliveryNotes }),
        ...(form.thirdPartyName && { thirdPartyName: form.thirdPartyName }),
        ...(form.thirdPartyReference && { thirdPartyReference: form.thirdPartyReference }),
        ...(latitude !== undefined && { latitude, longitude }),
      };
      const r = await submitOrQueue<Order>(
        { url: `/api/orders/${order.id}/${action}`, method: "POST", body, headers: { "Idempotency-Key": clientEventId } },
        `${LABEL(action)} — ${order.orderCode}`,
        clientEventId,
      );
      if (r.queued) toast({ title: t("orders.dialog.savedOffline") });
      else toast({ title: t("orders.dialog.updated") });
      setDialog(null);
      await qc.invalidateQueries();
    } catch (err) {
      toast({ title: t("orders.dialog.fail"), description: errMsg(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {order.allowedActions.map((a) => (
          <Button
            key={a}
            disabled={busy}
            variant={DANGER.has(a) ? "outline" : "default"}
            className={DANGER.has(a) ? "rounded-full border-rose-400/25 text-rose-300 hover:bg-rose-400/10" : "rounded-full"}
            onClick={() => (needsDialog(a) ? setDialog(a) : void run(a))}
          >
            {LABEL(a)}
          </Button>
        ))}
      </div>
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog && LABEL(dialog)}</DialogTitle>
            <DialogDescription>{t("orders.dialog.desc", { code: order.orderCode })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(dialog === "reject" || dialog === "cancel" || (dialog === "confirm-receipt" && user?.role === "admin")) && (
              <Field label={dialog === "reject" ? t("orders.dialog.reasonCustomer") : t("orders.dialog.reason")}>
                <textarea className={textareaCls} rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </Field>
            )}
            {dialog === "dispatch" && (
              <>
                {order.fulfillmentMethod === "THIRD_PARTY_DELIVERY" && (
                  <>
                    <Field label={t("orders.dialog.courierName")} hint={t("orders.dialog.courierHint")}>
                      <input className={inputCls} value={form.thirdPartyName} onChange={(e) => setForm({ ...form, thirdPartyName: e.target.value })} />
                    </Field>
                    <Field label={t("orders.dialog.consignment")}>
                      <input className={inputCls} value={form.thirdPartyReference} onChange={(e) => setForm({ ...form, thirdPartyReference: e.target.value })} />
                    </Field>
                  </>
                )}
                <Field label={t("orders.dialog.deliveryNotes")}>
                  <textarea className={textareaCls} rows={2} value={form.deliveryNotes} onChange={(e) => setForm({ ...form, deliveryNotes: e.target.value })} />
                </Field>
              </>
            )}
            {dialog === "complete" && (
              <>
                <Field label={order.fulfillmentMethod === "CUSTOMER_PICKUP" ? t("orders.dialog.pickupLocation") : t("orders.dialog.deliveryLocation")}>
                  <input className={inputCls} value={form.deliveryLocation} onChange={(e) => setForm({ ...form, deliveryLocation: e.target.value })} />
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.gps} onChange={(e) => setForm({ ...form, gps: e.target.checked })} />
                  {t("orders.dialog.gps")}
                </label>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>{t("orders.dialog.back")}</Button>
            <Button
              disabled={busy || (dialog === "dispatch" && order.fulfillmentMethod === "THIRD_PARTY_DELIVERY" && !form.thirdPartyName.trim()) || ((dialog === "reject" || dialog === "cancel" || (dialog === "confirm-receipt" && user?.role === "admin")) && user?.role !== "customer" && !form.reason.trim())}
             
              onClick={() => dialog && void run(dialog)}
            >
              {busy ? t("orders.dialog.saving") : t("orders.dialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
