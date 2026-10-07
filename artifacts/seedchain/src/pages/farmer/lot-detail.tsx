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
import { dateOnly, dateTime, inr, qty, titleCase } from "@/lib/format";

type EventKind = "HARVEST_RECORDED" | "QUALITY_RECORDED" | "STORAGE_RECORDED" | "LOSS_RECORDED" | "SPOILAGE_RECORDED" | "GROWING_RECORDED" | "CORRECTION_RECORDED";

function InventoryBar({ lot }: { lot: LotDetail }) {
  const i = lot.inventory;
  const total = Math.max(i.harvested, 0.0001);
  const seg = (v: number, c: string, t: string) => <div className={c} style={{ width: `${(v / total) * 100}%` }} title={`${t}: ${qty(v, i.unit)}`} />;
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full bg-zinc-100">{seg(i.available, "bg-accent", "Available")}{seg(i.reserved, "bg-amber-400", "Reserved")}{seg(i.sold, "bg-indigo-400", "Sold")}{seg(i.loss, "bg-rose-400", "Loss")}</div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-accent" />Available {qty(i.available, i.unit)}</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />Reserved {qty(i.reserved, i.unit)}</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-indigo-400" />Sold {qty(i.sold, i.unit)}</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-400" />Loss {qty(i.loss, i.unit)}</span>
      </div>
    </div>
  );
}

export default function LotDetailPage({ base }: { base: "farmer" | "admin" }) {
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
      toast({ title: listed ? "Listed for customers" : "Listing paused" });
      await refresh();
    } catch (err) { toast({ title: "Could not update listing", description: errMsg(err), variant: "destructive" }); }
    finally { setBusy(false); }
  }

  async function submitEvent() {
    if (!dlg) return;
    setBusy(true);
    try {
      if (dlg === "REPLACE_QR") {
        await apiRequest({ url: "/api/qr/generate", method: "POST", body: { lotId: id, reason: f.reason } });
        toast({ title: "New QR issued. The old label no longer works." });
      } else if (dlg === "REVOKE_QR") {
        await apiRequest({ url: "/api/qr/revoke", method: "POST", body: { qrId: f.qrId, reason: f.reason, issueReplacement: f.replacement } });
        toast({ title: "QR revoked" });
      } else {
        const clientEventId = uuid();
        const body: Record<string, unknown> = { eventType: dlg, clientEventId, eventTime: new Date().toISOString(), ...(f.reason && { reason: f.reason }), ...(f.location && { location: f.location }) };
        if (dlg === "HARVEST_RECORDED" || dlg === "LOSS_RECORDED" || dlg === "SPOILAGE_RECORDED") body.quantity = Number(f.quantity);
        if (dlg === "QUALITY_RECORDED") body.qualityGrade = f.grade;
        if (dlg === "STORAGE_RECORDED") body.storage = { storageType: f.storageType, storageLocation: f.storageLocation, storageStart: new Date().toISOString(), storageCondition: f.condition, ...(f.temperatureC && { temperatureC: Number(f.temperatureC) }), ...(f.humidityPct && { humidityPct: Number(f.humidityPct) }) };
        if (dlg === "CORRECTION_RECORDED") { body.correctsEventId = f.correctsEventId; if (f.adjust) body.harvestAdjustment = Number(f.adjust); }
        const r = await submitOrQueue({ url: `/api/lots/${id}/events`, method: "POST", body }, `${titleCase(dlg)} on ${lot.lotCode}`, clientEventId);
        toast({ title: r.queued ? "Saved offline — waiting for synchronization." : "Recorded" });
      }
      setDlg(null);
      setF({ ...f, quantity: "", reason: "" });
      await refresh();
    } catch (err) { toast({ title: "Could not save", description: errMsg(err), variant: "destructive" }); }
    finally { setBusy(false); }
  }

  const eventBtn = (k: EventKind, label: string) => <Button key={k} variant="outline" className="rounded-full" onClick={() => setDlg(k)}>{label}</Button>;
  const harvestEvents = events.data?.filter((e) => e.eventType === "HARVEST_RECORDED") ?? [];

  return (
    <>
      <PageHeader title={`${lot.productName} · ${lot.variety}`} subtitle={<span className="inline-flex flex-wrap items-center gap-2"><span className="font-mono">{lot.lotCode}</span><LotStatusPill status={lot.status} />{lot.listed && <Pill className="bg-emerald-400/15 text-emerald-300">Listed</Pill>}<RiskPill level={lot.risk.level} /></span>} actions={<Link href={`/${base}/lots`}><Button variant="outline" className="rounded-full">All lots</Button></Link>} />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-5"><h3 className="mb-3 eyebrow !text-ink/75">Inventory</h3><InventoryBar lot={lot} />
            <div className="mt-4"><Kv k="Farm" v={lot.farmName} /><Kv k="Origin" v={lot.origin} /><Kv k="Harvest date" v={dateOnly(lot.harvestDate)} /><Kv k="Quality" v={lot.qualityGrade ? `Grade ${lot.qualityGrade}` : "Not graded"} /><Kv k="Price" v={lot.pricePerUnit != null ? `${inr(lot.pricePerUnit)} / ${unit}` : "Not set"} /></div>
            {lot.estimatedMarketValue && <div className="mt-3 rounded-2xl bg-sky-400/10 p-3 text-xs text-sky-300"><b>{lot.estimatedMarketValue.label}</b><br />≈ {inr(lot.estimatedMarketValue.amount)} · {lot.estimatedMarketValue.basis} · {lot.estimatedMarketValue.market} on {lot.estimatedMarketValue.observationDate}</div>}
          </Card>
          <Card className="p-5"><h3 className="mb-2 flex items-center gap-2 eyebrow !text-ink/75">Risk assessment <RiskPill level={lot.risk.level} /></h3>
            <p className="mb-2 text-xs text-ink/45">Rule-based ({lot.risk.engine}), not machine learning. Score {lot.risk.score}/100.</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">{lot.risk.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
          </Card>
          {isFarmer && (
            <Card className="space-y-4 p-5">
              <h3 className="eyebrow !text-ink/75">Record what happened</h3>
              <div className="flex flex-wrap gap-2">
                {lot.status === "CREATED" && eventBtn("GROWING_RECORDED", "Mark growing")}
                {eventBtn("HARVEST_RECORDED", "Record harvest")}{eventBtn("QUALITY_RECORDED", "Record quality")}{eventBtn("STORAGE_RECORDED", "Record storage")}{eventBtn("LOSS_RECORDED", "Record loss")}{eventBtn("SPOILAGE_RECORDED", "Record spoilage")}{eventBtn("CORRECTION_RECORDED", "Correct an entry")}
              </div>
              <div className="border-t pt-4">
                <h4 className="mb-2 text-sm font-medium">Listing for customers</h4>
                <div className="flex flex-wrap items-end gap-3">
                  <Field label={`Price per ${unit} (₹)`}><input className={`${inputCls} w-40`} type="number" min="0" step="any" placeholder={lot.pricePerUnit?.toString() ?? ""} value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
                  <Button disabled={busy} className="rounded-full bg-glass-2 text-neutral-950" onClick={() => void listing(true)}>{lot.listed ? "Update price" : "List for sale"}</Button>
                  {lot.listed && <Button disabled={busy} variant="outline" className="rounded-full" onClick={() => void listing(false)}>Pause listing</Button>}
                </div>
              </div>
            </Card>
          )}
          <Card className="p-5"><h3 className="mb-3 eyebrow !text-ink/75">Farmer-managed storage</h3>
            {storage.data?.length ? storage.data.map((s) => <div key={s.id} className="border-b py-2 text-sm last:border-0"><b>{titleCase(s.storageType)}</b> at {s.storageLocation}<div className="text-xs text-ink/55">{dateTime(s.storageStart)} → {s.storageEnd ? dateTime(s.storageEnd) : "ongoing"}{s.temperatureC != null && ` · ${s.temperatureC}°C`}{s.humidityPct != null && ` · ${s.humidityPct}% RH`}{s.storageCondition && ` · ${s.storageCondition}`}</div></div>) : <p className="text-sm text-ink/50">No storage recorded.</p>}
          </Card>
          <Card className="p-5"><h3 className="mb-4 eyebrow !text-ink/75">Full traceability history (private view)</h3>
            {events.isLoading ? <Loading /> : <Timeline items={(events.data ?? []).map((e) => ({ key: e.id, label: titleCase(e.eventType), time: e.eventTime, detail: [e.quantityChange != null && `${e.quantityChange > 0 ? "+" : ""}${e.quantityChange} ${unit}`, e.quantityAfter != null && `available after: ${e.quantityAfter}`, e.reason].filter(Boolean).join(" · "), meta: `${e.actorName ?? "System"}${e.actorRole ? ` (${e.actorRole})` : ""}${e.source !== "web" ? ` · via ${e.source}` : ""}` }))} />}
          </Card>
        </div>
        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="mb-3 eyebrow !text-ink/75">QR label</h3>
            {active ? <QrLabel traceUrl={active.traceUrl} lotCode={lot.lotCode} productName={lot.productName} variety={lot.variety} origin={lot.origin} /> : <p className="text-sm text-amber-300">No active QR. {isFarmer ? "Issue a new one below." : ""}</p>}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {active && <Link href={`/trace/${active.publicToken}`}><Button variant="outline" size="sm" className="rounded-full">Open public page</Button></Link>}
              {(isFarmer || user?.role === "admin") && <Button size="sm" variant="outline" className="rounded-full" onClick={() => setDlg("REPLACE_QR")}>{active ? "Replace label" : "Issue QR"}</Button>}
              {user?.role === "admin" && active && <Button size="sm" variant="outline" className="rounded-full border-rose-400/25 text-rose-300" onClick={() => { setF({ ...f, qrId: active.id }); setDlg("REVOKE_QR"); }}>Revoke QR</Button>}
            </div>
            <div className="mt-4 space-y-1 border-t pt-3 text-xs text-ink/55">{qrs.data?.map((q) => <div key={q.id} className="flex justify-between"><span>v{q.version} · {dateOnly(q.createdAt)}</span><span>{q.status}{q.revokeReason ? ` (${q.revokeReason})` : ""}</span></div>)}</div>
          </Card>
        </div>
      </div>
      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dlg && titleCase(dlg)}</DialogTitle><DialogDescription>Recorded permanently and attributed to you. Entries are never edited; mistakes are fixed with a correction.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            {(dlg === "HARVEST_RECORDED" || dlg === "LOSS_RECORDED" || dlg === "SPOILAGE_RECORDED") && <Field label={`Quantity (${unit})`}><input className={inputCls} type="number" min="0.001" step="any" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} /></Field>}
            {dlg === "QUALITY_RECORDED" && <Field label="Grade"><select className={inputCls} value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })}><option>A</option><option>B</option><option>C</option></select></Field>}
            {dlg === "STORAGE_RECORDED" && (<><Field label="Type"><select className={inputCls} value={f.storageType} onChange={(e) => setF({ ...f, storageType: e.target.value })}><option value="on_farm_shed">On-farm shed</option><option value="cold_storage">Cold storage</option><option value="warehouse">Warehouse</option><option value="ambient">Ambient</option><option value="other">Other</option></select></Field><Field label="Location"><input className={inputCls} value={f.storageLocation} onChange={(e) => setF({ ...f, storageLocation: e.target.value })} /></Field><div className="grid grid-cols-3 gap-2"><Field label="Temp °C"><input className={inputCls} type="number" step="any" value={f.temperatureC} onChange={(e) => setF({ ...f, temperatureC: e.target.value })} /></Field><Field label="Humidity %"><input className={inputCls} type="number" step="any" value={f.humidityPct} onChange={(e) => setF({ ...f, humidityPct: e.target.value })} /></Field><Field label="Condition"><select className={inputCls} value={f.condition} onChange={(e) => setF({ ...f, condition: e.target.value })}><option>good</option><option>fair</option><option>poor</option></select></Field></div></>)}
            {dlg === "CORRECTION_RECORDED" && (<><Field label="Entry to correct"><select className={inputCls} value={f.correctsEventId} onChange={(e) => setF({ ...f, correctsEventId: e.target.value })}><option value="">Select…</option>{events.data?.map((e) => <option key={e.id} value={e.id}>{titleCase(e.eventType)} · {dateTime(e.eventTime)}</option>)}</select></Field>{harvestEvents.some((e) => e.id === f.correctsEventId) && <Field label={`Harvest adjustment (${unit}, + or −)`}><input className={inputCls} type="number" step="any" value={f.adjust} onChange={(e) => setF({ ...f, adjust: e.target.value })} /></Field>}</>)}
            {dlg === "REVOKE_QR" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.replacement} onChange={(e) => setF({ ...f, replacement: e.target.checked })} />Issue a replacement label for the same lot</label>}
            <Field label={dlg === "REPLACE_QR" || dlg === "REVOKE_QR" || dlg === "CORRECTION_RECORDED" || dlg === "LOSS_RECORDED" || dlg === "SPOILAGE_RECORDED" ? "Reason (required)" : "Notes (optional)"}><textarea className={textareaCls} rows={2} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setDlg(null)}>Cancel</Button><Button disabled={busy} className="bg-glass-2 text-neutral-950" onClick={() => void submitEvent()}>{busy ? "Saving…" : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
