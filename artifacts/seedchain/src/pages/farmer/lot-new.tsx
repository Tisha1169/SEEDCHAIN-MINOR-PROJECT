import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useListFarms, useListProducts, type LotDetail } from "@workspace/api-client-react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Field, inputCls, Loading, PageHeader, textareaCls } from "@/components/app/common";
import { QrLabel } from "@/components/app/qr-label";
import { useToast } from "@/hooks/use-toast";
import { errMsg, uuid } from "@/lib/api";
import { enumLabel, unitLabel } from "@/lib/format";
import { submitOrQueue } from "@/lib/offline-queue";

const today = () => new Date().toISOString().slice(0, 10);

export default function LotNew() {
  const { t } = useTranslation();
  const farms = useListFarms();
  const products = useListProducts();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [clientEventId, setId] = useState(uuid);
  const [created, setCreated] = useState<LotDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    farmId: "", productId: "", productName: "Potato", variety: "", unit: "kg", plantingDate: "", expectedHarvestDate: "", harvested: false,
    harvestDate: today(), harvestQuantity: "", qualityGrade: "", qualityNotes: "", origin: "", publicNotes: "", privateNotes: "",
    storing: false, storageType: "on_farm_shed", storageLocation: "", storageStart: new Date().toISOString().slice(0, 16), temperatureC: "", humidityPct: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });

  if (farms.isLoading || products.isLoading) return <Loading />;
  if (!farms.data?.length) return <Card className="p-8 text-center"><p className="mb-3">{t("farmer.lotNew.addFarmFirst")}</p><Link href="/farmer/farms"><Button className="rounded-full">{t("farmer.lotNew.addFarm")}</Button></Link></Card>;

  if (created) {
    const qr = created.activeQr;
    return (
      <div className="mx-auto max-w-lg">
        <Card className="p-6 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-12 w-12 text-accent" />
          <h2 className="text-2xl font-medium">{t("farmer.lotNew.created")}</h2>
          <p className="mb-5 text-sm text-ink/55">{t("farmer.lotNew.createdBody")}</p>
          {qr ? <QrLabel traceUrl={qr.traceUrl} lotCode={created.lotCode} productName={created.productName} variety={created.variety} origin={created.origin} /> : <p className="text-sm text-rose-300">{t("farmer.lotNew.noQr")}</p>}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href={`/farmer/lots/${created.id}`}><Button className="rounded-full">{t("farmer.lotNew.openLot")}</Button></Link>
            {qr && <Link href={`/trace/${qr.publicToken}`}><Button variant="outline" className="rounded-full">{t("farmer.lotNew.previewPublic")}</Button></Link>}
            <Button variant="outline" className="rounded-full" onClick={() => { setCreated(null); setId(uuid()); }}>{t("farmer.lotNew.createAnother")}</Button>
          </div>
        </Card>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const existing = f.productId ? products.data?.find((p) => p.id === f.productId) : undefined;
      const body = {
        farmId: f.farmId, origin: f.origin, clientEventId,
        ...(existing ? { productId: existing.id } : { productName: f.productName, variety: f.variety }),
        unit: existing?.unit ?? f.unit,
        ...(f.plantingDate && { plantingDate: f.plantingDate }), ...(f.expectedHarvestDate && { expectedHarvestDate: f.expectedHarvestDate }),
        ...(f.harvested && { harvestDate: f.harvestDate, harvestQuantity: Number(f.harvestQuantity), ...(f.qualityGrade && { qualityGrade: f.qualityGrade }), ...(f.qualityNotes && { qualityNotes: f.qualityNotes }) }),
        ...(f.publicNotes && { publicNotes: f.publicNotes }), ...(f.privateNotes && { privateNotes: f.privateNotes }),
        ...(f.harvested && f.storing && { storage: { storageType: f.storageType, storageLocation: f.storageLocation, storageStart: new Date(f.storageStart).toISOString(), ...(f.temperatureC && { temperatureC: Number(f.temperatureC) }), ...(f.humidityPct && { humidityPct: Number(f.humidityPct) }) } }),
      };
      const r = await submitOrQueue<LotDetail>({ url: "/api/lots", method: "POST", body }, t("farmer.lotNew.title") + " " + (f.variety || existing?.variety || ""), clientEventId);
      if (r.queued) {
        toast({ title: t("farmer.lotNew.offlineTitle"), description: t("farmer.lotNew.offlineBody") });
        setId(uuid());
        return;
      }
      setCreated(r.data!);
      await qc.invalidateQueries();
    } catch (err) {
      toast({ title: t("farmer.lotNew.couldNotCreate"), description: errMsg(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("farmer.lotNew.title")} subtitle={t("farmer.lotNew.subtitle")} />
      <form onSubmit={submit} className="space-y-5">
        <Card className="space-y-4 p-6">
          <Field label={t("farmer.lotNew.farm")}><select className={inputCls} required value={f.farmId} onChange={set("farmId")}><option value="">{t("farmer.lotNew.selectFarm")}</option>{farms.data.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.state})</option>)}</select></Field>
          <Field label={t("farmer.lotNew.product")}><select className={inputCls} value={f.productId} onChange={set("productId")}><option value="">{t("farmer.lotNew.newProduct")}</option>{products.data?.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.variety}</option>)}</select></Field>
          {!f.productId && (
            <div className="grid grid-cols-3 gap-3">
              <Field label={t("farmer.lotNew.crop")}><input className={inputCls} required value={f.productName} onChange={set("productName")} /></Field>
              <Field label={t("farmer.lotNew.variety")}><input className={inputCls} required placeholder={t("farmer.farms.varietyPh")} value={f.variety} onChange={set("variety")} /></Field>
              <Field label={t("farmer.lotNew.unit")}><select className={inputCls} value={f.unit} onChange={set("unit")}><option value="kg">{unitLabel("kg")}</option><option value="quintal">{unitLabel("quintal")}</option><option value="tonne">{unitLabel("tonne")}</option></select></Field>
            </div>
          )}
          <Field label={t("farmer.lotNew.origin")}><input className={inputCls} required minLength={2} placeholder={t("farmer.lotNew.originPh")} value={f.origin} onChange={set("origin")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("farmer.lotNew.planting")}><input className={inputCls} type="date" value={f.plantingDate} onChange={set("plantingDate")} /></Field>
            <Field label={t("farmer.lotNew.expectedHarvest")}><input className={inputCls} type="date" value={f.expectedHarvestDate} onChange={set("expectedHarvestDate")} /></Field>
          </div>
        </Card>
        <Card className="space-y-4 p-6">
          <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={f.harvested} onChange={set("harvested")} />{t("farmer.lotNew.alreadyHarvested")}</label>
          {f.harvested && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("farmer.lotNew.harvestDate")}><input className={inputCls} type="date" required max={today()} value={f.harvestDate} onChange={set("harvestDate")} /></Field>
                <Field label={t("farmer.lotNew.quantityUnit", { unit: unitLabel(f.unit) })}><input className={inputCls} type="number" required min="0.001" step="any" value={f.harvestQuantity} onChange={set("harvestQuantity")} /></Field>
                <Field label={t("farmer.lotNew.grade")}><select className={inputCls} value={f.qualityGrade} onChange={set("qualityGrade")}><option value="">{t("farmer.lotNew.notGraded")}</option><option>A</option><option>B</option><option>C</option></select></Field>
                <Field label={t("farmer.lotNew.qualityNotes")}><input className={inputCls} value={f.qualityNotes} onChange={set("qualityNotes")} /></Field>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.storing} onChange={set("storing")} />{t("farmer.lotNew.storing")}</label>
              {f.storing && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("farmer.lotNew.storageType")}><select className={inputCls} value={f.storageType} onChange={set("storageType")}><option value="on_farm_shed">{enumLabel("storageKind", "on_farm_shed")}</option><option value="cold_storage">{enumLabel("storageKind", "cold_storage")}</option><option value="warehouse">{enumLabel("storageKind", "warehouse")}</option><option value="ambient">{enumLabel("storageKind", "ambient")}</option><option value="other">{enumLabel("storageKind", "other")}</option></select></Field>
                  <Field label={t("farmer.lotNew.location")}><input className={inputCls} required value={f.storageLocation} onChange={set("storageLocation")} /></Field>
                  <Field label={t("farmer.lotNew.storageStart")}><input className={inputCls} type="datetime-local" required value={f.storageStart} onChange={set("storageStart")} /></Field>
                  <Field label={t("farmer.lotNew.temperature")}><input className={inputCls} type="number" step="any" value={f.temperatureC} onChange={set("temperatureC")} /></Field>
                  <Field label={t("farmer.lotNew.humidity")}><input className={inputCls} type="number" min="0" max="100" step="any" value={f.humidityPct} onChange={set("humidityPct")} /></Field>
                </div>
              )}
            </>
          )}
        </Card>
        <Card className="space-y-4 p-6">
          <Field label={t("farmer.lotNew.publicNotes")}><textarea className={textareaCls} rows={2} maxLength={1000} value={f.publicNotes} onChange={set("publicNotes")} /></Field>
          <Field label={t("farmer.lotNew.privateNotes")}><textarea className={textareaCls} rows={2} maxLength={2000} value={f.privateNotes} onChange={set("privateNotes")} /></Field>
        </Card>
        <Button disabled={busy} className="h-12 w-full text-base">{busy ? t("farmer.lotNew.creating") : t("farmer.lotNew.submit")}</Button>
      </form>
    </div>
  );
}
