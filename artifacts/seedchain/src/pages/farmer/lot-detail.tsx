import { JourneyMap } from "@/components/app/geo-maps";
import { PackagesCard } from "@/components/app/packages-card";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Link, useRoute } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetLot, useListLotEvents, useListLotQrCodes, useListLotStorage, type LotDetail } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, ErrorState, Field, inputCls, Kv, Loading, LotStatusPill, PageHeader, Pill, RiskPill, textareaCls } from "@/components/app/common";
import { QrLabel } from "@/components/app/qr-label";
import { Timeline } from "@/components/app/timeline";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, errMsg, uuid } from "@/lib/api";
import { submitOrQueue } from "@/lib/offline-queue";
import { serverText } from "@/lib/server-text";
import { cropName, dateOnly, dateTime, enumLabel, inr, qty, unitLabel } from "@/lib/format";

type EventKind = "HARVEST_RECORDED" | "QUALITY_RECORDED" | "STORAGE_RECORDED" | "LOSS_RECORDED" | "SPOILAGE_RECORDED" | "GROWING_RECORDED" | "CORRECTION_RECORDED";

function InventoryBar({ lot }: { lot: LotDetail }) {
  const { t } = useTranslation();
  const i = lot.inventory;
  const total = Math.max(i.harvested, 0.0001);
  const seg = (v: number, c: string, label: string) => <div className={c} style={{ width: `${(v / total) * 100}%` }} title={`${label}: ${qty(v, i.unit)}`} />;
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full bg-zinc-100">{seg(i.available, "bg-accent", t("farmer.detail.available"))}{seg(i.reserved, "bg-amber-400", t("farmer.detail.reserved"))}{seg(i.sold, "bg-indigo-400", t("farmer.detail.sold"))}{seg(i.loss, "bg-rose-400", t("farmer.detail.loss"))}</div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-accent" />{t("farmer.detail.available")} {qty(i.available, i.unit)}</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />{t("farmer.detail.reserved")} {qty(i.reserved, i.unit)}</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-indigo-400" />{t("farmer.detail.sold")} {qty(i.sold, i.unit)}</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-400" />{t("farmer.detail.loss")} {qty(i.loss, i.unit)}</span>
      </div>
    </div>
  );
}

export default function LotDetailPage({ base }: { base: "farmer" | "admin" }) {
  const { t } = useTranslation();
  const [, params] = useRoute(`/${base}/lots/:id`);
  const id = params!.id;
  const { user } = useAuth();
  const isFarmer = user?.role === "farmer";
  const qc = useQueryClient();
  const { toast } = useToast();
  const lotQ = useGetLot(id, { query: { queryKey: [`/api/lots/${id}`], retry: false } });
  const events = useListLotEvents(id, { query: { queryKey: [`/api/lots/${id}/events`] } });
  const qrs = useListLotQrCodes(id, { query: { queryKey: [`/api/lots/${id}/qr`] } });
  const storage = useListLotStorage(id, { query: { queryKey: [`/api/lots/${id}/storage`] } });
  const [price, setPrice] = useState("");
  const [dlg, setDlg] = useState<EventKind | "REPLACE_QR" | "REVOKE_QR" | null>(null);
  const [f, setF] = useState({ quantity: "", reason: "", grade: "A", location: "", storageType: "on_farm_shed", storageLocation: "", temperatureC: "", humidityPct: "", condition: "good", correctsEventId: "", adjust: "", qrId: "", replacement: true });
  const [busy, setBusy] = useState(false);

  if (lotQ.isLoading) return <Loading />;
  if (lotQ.error || !lotQ.data) return <ErrorState error={lotQ.error} onRetry={() => void lotQ.refetch()} />;
  const lot = lotQ.data;
  const unit = lot.inventory.unit;
  const active = qrs.data?.find((q) => q.status === "ACTIVE");
  const refresh = () => qc.invalidateQueries();

  async function listing(listed: boolean) {
    setBusy(true);
    try {
      await apiRequest({ url: `/api/lots/${id}/listing`, method: "POST", body: { listed, ...(price && { pricePerUnit: Number(price) }) } });
      toast({ title: listed ? t("farmer.detail.toastListed") : t("farmer.detail.toastPaused") });
      await refresh();
    } catch (err) { toast({ title: t("farmer.detail.toastListingFail"), description: errMsg(err), variant: "destructive" }); }
    finally { setBusy(false); }
  }

  async function submitEvent() {
    if (!dlg) return;
    setBusy(true);
    try {
      if (dlg === "REPLACE_QR") {
        await apiRequest({ url: "/api/qr/generate", method: "POST", body: { lotId: id, reason: f.reason } });
        toast({ title: t("farmer.detail.toastNewQr") });
      } else if (dlg === "REVOKE_QR") {
        await apiRequest({ url: "/api/qr/revoke", method: "POST", body: { qrId: f.qrId, reason: f.reason, issueReplacement: f.replacement } });
        toast({ title: t("farmer.detail.toastRevoked") });
      } else {
        const clientEventId = uuid();
        const body: Record<string, unknown> = { eventType: dlg, clientEventId, eventTime: new Date().toISOString(), ...(f.reason && { reason: f.reason }), ...(f.location && { location: f.location }) };
        if (dlg === "HARVEST_RECORDED" || dlg === "LOSS_RECORDED" || dlg === "SPOILAGE_RECORDED") body.quantity = Number(f.quantity);
        if (dlg === "QUALITY_RECORDED") body.qualityGrade = f.grade;
        if (dlg === "STORAGE_RECORDED") body.storage = { storageType: f.storageType, storageLocation: f.storageLocation, storageStart: new Date().toISOString(), storageCondition: f.condition, ...(f.temperatureC && { temperatureC: Number(f.temperatureC) }), ...(f.humidityPct && { humidityPct: Number(f.humidityPct) }) };
        if (dlg === "CORRECTION_RECORDED") { body.correctsEventId = f.correctsEventId; if (f.adjust) body.harvestAdjustment = Number(f.adjust); }
        const r = await submitOrQueue({ url: `/api/lots/${id}/events`, method: "POST", body }, t("farmer.detail.queueLabel", { what: dlgLabel(dlg), code: lot.lotCode }), clientEventId);
        toast({ title: r.queued ? t("farmer.detail.toastSavedOffline") : t("farmer.detail.toastRecorded") });
      }
      setDlg(null);
      setF({ ...f, quantity: "", reason: "" });
      await refresh();
    } catch (err) { toast({ title: t("farmer.detail.toastSaveFail"), description: errMsg(err), variant: "destructive" }); }
    finally { setBusy(false); }
  }

  const dlgLabel = (k: string) => (k === "REPLACE_QR" || k === "REVOKE_QR" ? t(`farmer.detail.dlgTitle.${k}`) : enumLabel("event", k));
  const eventBtn = (k: EventKind, label: string) => <Button key={k} variant="outline" className="rounded-full" onClick={() => setDlg(k)}>{label}</Button>;
  const harvestEvents = events.data?.filter((e) => e.eventType === "HARVEST_RECORDED") ?? [];

  return (
    <>
      <PageHeader title={`${cropName(lot.productName)} · ${lot.variety}`} subtitle={<span className="inline-flex flex-wrap items-center gap-2"><span className="font-mono">{lot.lotCode}</span><LotStatusPill status={lot.status} />{lot.listed && <Pill className="bg-emerald-400/15 text-emerald-300">{t("farmer.detail.listedPill")}</Pill>}<RiskPill level={lot.risk.level} /></span>} actions={<Link href={`/${base}/lots`}><Button variant="outline" className="rounded-full">{t("farmer.detail.allLots")}</Button></Link>} />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-5"><h3 className="mb-3 eyebrow !text-ink/75">{t("farmer.detail.inventory")}</h3><InventoryBar lot={lot} />
            <div className="mt-4"><Kv k={t("farmer.detail.farm")} v={lot.farmName} /><Kv k={t("farmer.detail.origin")} v={lot.origin} /><Kv k={t("farmer.detail.harvestDate")} v={dateOnly(lot.harvestDate)} /><Kv k={t("farmer.detail.quality")} v={lot.qualityGrade ? t("farmer.detail.grade", { g: lot.qualityGrade }) : t("farmer.detail.notGraded")} /><Kv k={t("farmer.detail.price")} v={lot.pricePerUnit != null ? t("farmer.detail.perUnit", { price: inr(lot.pricePerUnit), unit: unitLabel(unit) }) : t("farmer.detail.notSet")} /></div>
            {lot.estimatedMarketValue && <div className="mt-3 rounded-2xl bg-sky-400/10 p-3 text-xs text-sky-300"><b>{lot.estimatedMarketValue.label}</b><br />{t("farmer.detail.valueLine", { amount: inr(lot.estimatedMarketValue.amount), basis: lot.estimatedMarketValue.basis, market: lot.estimatedMarketValue.market, date: lot.estimatedMarketValue.observationDate })}</div>}
          </Card>
          <Card className="p-5"><h3 className="mb-2 flex items-center gap-2 eyebrow !text-ink/75">{t("farmer.detail.risk")} <RiskPill level={lot.risk.level} /></h3>
            <p className="mb-2 text-xs text-ink/45">{t("farmer.detail.riskLine", { engine: lot.risk.engine, score: lot.risk.score })}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">{lot.risk.reasons.map((r) => <li key={r}>{serverText(r)}</li>)}</ul>
          </Card>
          {isFarmer && (
            <Card className="space-y-4 p-5">
              <h3 className="eyebrow !text-ink/75">{t("farmer.detail.record")}</h3>
              <div className="flex flex-wrap gap-2">
                {lot.status === "CREATED" && eventBtn("GROWING_RECORDED", t("farmer.detail.markGrowing"))}
                {eventBtn("HARVEST_RECORDED", t("farmer.detail.recHarvest"))}{eventBtn("QUALITY_RECORDED", t("farmer.detail.recQuality"))}{eventBtn("STORAGE_RECORDED", t("farmer.detail.recStorage"))}{eventBtn("LOSS_RECORDED", t("farmer.detail.recLoss"))}{eventBtn("SPOILAGE_RECORDED", t("farmer.detail.recSpoilage"))}{eventBtn("CORRECTION_RECORDED", t("farmer.detail.correct"))}
              </div>
              <div className="border-t pt-4">
                <h4 className="mb-2 text-sm font-medium">{t("farmer.detail.listing")}</h4>
                <div className="flex flex-wrap items-end gap-3">
                  <Field label={t("farmer.detail.pricePer", { unit: unitLabel(unit) })}><input className={`${inputCls} w-40`} type="number" min="0" step="any" placeholder={lot.pricePerUnit?.toString() ?? ""} value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
                  <Button disabled={busy} className="rounded-full" onClick={() => void listing(true)}>{lot.listed ? t("farmer.detail.updatePrice") : t("farmer.detail.listForSale")}</Button>
                  {lot.listed && <Button disabled={busy} variant="outline" className="rounded-full" onClick={() => void listing(false)}>{t("farmer.detail.pauseListing")}</Button>}
                </div>
              </div>
            </Card>
          )}
          <Card className="p-5"><h3 className="mb-3 eyebrow !text-ink/75">{t("farmer.detail.storage")}</h3>
            {storage.data?.length ? storage.data.map((s) => <div key={s.id} className="border-b py-2 text-sm last:border-0"><b>{t("farmer.detail.storageAt", { type: enumLabel("storageKind", s.storageType), place: s.storageLocation })}</b><div className="text-xs text-ink/55">{dateTime(s.storageStart)} → {s.storageEnd ? dateTime(s.storageEnd) : t("farmer.detail.ongoing")}{s.temperatureC != null && ` · ${s.temperatureC}°C`}{s.humidityPct != null && ` · ${t("farmer.detail.rh", { n: s.humidityPct })}`}{s.storageCondition && ` · ${s.storageCondition}`}</div></div>) : <p className="text-sm text-ink/50">{t("farmer.detail.noStorage")}</p>}
          </Card>
          {(isFarmer || user?.role === "admin") && lot.inventory.harvested > 0 && (
            <PackagesCard lotId={id} unit={unit} harvested={lot.inventory.harvested} role={user?.role === "admin" ? "admin" : "farmer"} traceBase={active ? active.traceUrl.replace(/[^/]+$/, "") : `${window.location.origin}/trace/`} lotCode={lot.lotCode} productName={lot.productName} variety={lot.variety} origin={lot.origin} />
          )}
          {events.data && <JourneyMap events={events.data} />}
          <Card className="p-5"><h3 className="mb-4 eyebrow !text-ink/75">{t("farmer.detail.history")}</h3>
            {events.isLoading ? <Loading /> : <Timeline items={(events.data ?? []).map((e) => ({ key: e.id, label: enumLabel("event", e.eventType), time: e.eventTime, detail: [e.quantityChange != null && `${e.quantityChange > 0 ? "+" : ""}${e.quantityChange} ${unitLabel(unit)}`, e.quantityAfter != null && t("farmer.detail.availableAfter", { n: e.quantityAfter }), serverText(e.reason)].filter(Boolean).join(" · "), meta: `${e.actorName ?? t("farmer.detail.system")}${e.actorRole ? ` (${enumLabel("role", e.actorRole)})` : ""}${e.source !== "web" ? ` · ${t("farmer.detail.via", { source: enumLabel("eventSource", e.source) })}` : ""}` }))} />}
          </Card>
        </div>
        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="mb-3 eyebrow !text-ink/75">{t("farmer.detail.qrLabel")}</h3>
            {active ? <QrLabel traceUrl={active.traceUrl} lotCode={lot.lotCode} productName={lot.productName} variety={lot.variety} origin={lot.origin} /> : <p className="text-sm text-amber-300">{t("farmer.detail.noQr")} {isFarmer ? t("farmer.detail.issueBelow") : ""}</p>}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {active && <Link href={`/trace/${active.publicToken}`}><Button variant="outline" size="sm" className="rounded-full">{t("farmer.detail.openPublic")}</Button></Link>}
              {(isFarmer || user?.role === "admin") && <Button size="sm" variant="outline" className="rounded-full" onClick={() => setDlg("REPLACE_QR")}>{active ? t("farmer.detail.replaceLabel") : t("farmer.detail.issueQr")}</Button>}
              {user?.role === "admin" && active && <Button size="sm" variant="outline" className="rounded-full border-rose-400/25 text-rose-300" onClick={() => { setF({ ...f, qrId: active.id }); setDlg("REVOKE_QR"); }}>{t("farmer.detail.revokeQr")}</Button>}
            </div>
            <div className="mt-4 space-y-1 border-t pt-3 text-xs text-ink/55">{qrs.data?.map((q) => <div key={q.id} className="flex justify-between"><span>{t("farmer.detail.qrVersionLine", { v: q.version, date: dateOnly(q.createdAt) })}</span><span>{enumLabel("qrStatus", q.status)}{q.revokeReason ? ` (${q.revokeReason})` : ""}</span></div>)}</div>
          </Card>
        </div>
      </div>
      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dlg && dlgLabel(dlg)}</DialogTitle><DialogDescription>{t("farmer.detail.dlgDesc")}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            {(dlg === "HARVEST_RECORDED" || dlg === "LOSS_RECORDED" || dlg === "SPOILAGE_RECORDED") && <Field label={t("farmer.detail.quantity", { unit: unitLabel(unit) })}><input className={inputCls} type="number" min="0.001" step="any" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} /></Field>}
            {dlg === "QUALITY_RECORDED" && <Field label={t("farmer.detail.gradeLabel")}><select className={inputCls} value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })}><option>A</option><option>B</option><option>C</option></select></Field>}
            {dlg === "STORAGE_RECORDED" && (<><Field label={t("farmer.detail.type")}><select className={inputCls} value={f.storageType} onChange={(e) => setF({ ...f, storageType: e.target.value })}><option value="on_farm_shed">{enumLabel("storageKind", "on_farm_shed")}</option><option value="cold_storage">{enumLabel("storageKind", "cold_storage")}</option><option value="warehouse">{enumLabel("storageKind", "warehouse")}</option><option value="ambient">{enumLabel("storageKind", "ambient")}</option><option value="other">{enumLabel("storageKind", "other")}</option></select></Field><Field label={t("farmer.detail.location")}><input className={inputCls} value={f.storageLocation} onChange={(e) => setF({ ...f, storageLocation: e.target.value })} /></Field><div className="grid grid-cols-3 gap-2"><Field label={t("farmer.detail.temp")}><input className={inputCls} type="number" step="any" value={f.temperatureC} onChange={(e) => setF({ ...f, temperatureC: e.target.value })} /></Field><Field label={t("farmer.detail.humidity")}><input className={inputCls} type="number" step="any" value={f.humidityPct} onChange={(e) => setF({ ...f, humidityPct: e.target.value })} /></Field><Field label={t("farmer.detail.condition")}><select className={inputCls} value={f.condition} onChange={(e) => setF({ ...f, condition: e.target.value })}><option value="good">{t("farmer.detail.cond.good")}</option><option value="fair">{t("farmer.detail.cond.fair")}</option><option value="poor">{t("farmer.detail.cond.poor")}</option></select></Field></div></>)}
            {dlg === "CORRECTION_RECORDED" && (<><Field label={t("farmer.detail.entryToCorrect")}><select className={inputCls} value={f.correctsEventId} onChange={(e) => setF({ ...f, correctsEventId: e.target.value })}><option value="">{t("farmer.detail.select")}</option>{events.data?.map((e) => <option key={e.id} value={e.id}>{enumLabel("event", e.eventType)} · {dateTime(e.eventTime)}</option>)}</select></Field>{harvestEvents.some((e) => e.id === f.correctsEventId) && <Field label={t("farmer.detail.adjustment", { unit: unitLabel(unit) })}><input className={inputCls} type="number" step="any" value={f.adjust} onChange={(e) => setF({ ...f, adjust: e.target.value })} /></Field>}</>)}
            {dlg === "REVOKE_QR" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.replacement} onChange={(e) => setF({ ...f, replacement: e.target.checked })} />{t("farmer.detail.replacement")}</label>}
            <Field label={dlg === "REPLACE_QR" || dlg === "REVOKE_QR" || dlg === "CORRECTION_RECORDED" || dlg === "LOSS_RECORDED" || dlg === "SPOILAGE_RECORDED" ? t("farmer.detail.reasonRequired") : t("farmer.detail.notesOptional")}><textarea className={textareaCls} rows={2} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setDlg(null)}>{t("farmer.detail.cancel")}</Button><Button disabled={busy} onClick={() => void submitEvent()}>{busy ? t("farmer.detail.saving") : t("farmer.detail.save")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
