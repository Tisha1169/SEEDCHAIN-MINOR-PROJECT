import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateFarm, useCreateProduct, useListFarms, useListProducts } from "@workspace/api-client-react";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Empty, ErrorState, Field, inputCls, Loading, PageHeader } from "@/components/app/common";
import { useToast } from "@/hooks/use-toast";
import { errMsg } from "@/lib/api";
import { unitLabel } from "@/lib/format";

export default function FarmsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const farms = useListFarms();
  const products = useListProducts();
  const createFarm = useCreateFarm();
  const createProduct = useCreateProduct();
  const [f, setF] = useState({ name: "", village: "", district: "", state: "", size: "", lat: "", lon: "" });
  const [p, setP] = useState({ name: "Potato", variety: "", unit: "kg" as "kg" | "quintal" | "tonne" });

  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (pos) => setF((s) => ({ ...s, lat: pos.coords.latitude.toFixed(6), lon: pos.coords.longitude.toFixed(6) })),
      () => toast({ title: t("farmer.farms.locDenied"), description: t("farmer.farms.locDeniedBody"), variant: "destructive" }),
      { timeout: 10000 },
    );

  return (
    <>
      <PageHeader title={t("farmer.farms.title")} subtitle={t("farmer.farms.subtitle")} />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="eyebrow !text-ink/75">{t("farmer.farms.myFarms")}</h3>
          {farms.isLoading ? <Loading /> : farms.error ? <ErrorState error={farms.error} /> : farms.data?.length ? farms.data.map((x) => (
            <Card key={x.id} className="p-4"><div className="font-medium">{x.name}</div><div className="text-sm text-ink/55">{[x.village, x.district, x.state].filter(Boolean).join(", ")}{x.sizeHectares ? ` · ${x.sizeHectares} ${t("farmer.farms.ha")}` : ""}</div><div className="text-xs text-ink/40">{x.latitude != null ? t("farmer.farms.gps", { lat: x.latitude, lon: x.longitude }) : t("farmer.farms.noGps")}</div></Card>
          )) : <Empty title={t("farmer.farms.emptyTitle")} hint={t("farmer.farms.emptyHint")} />}
          <Card className="p-5">
            <h4 className="mb-3 font-medium">{t("farmer.farms.addFarm")}</h4>
            <form className="space-y-3" onSubmit={async (e) => {
              e.preventDefault();
              try {
                await createFarm.mutateAsync({ data: { name: f.name, state: f.state, ...(f.village && { village: f.village }), ...(f.district && { district: f.district }), ...(f.size && { sizeHectares: Number(f.size) }), ...(f.lat && f.lon && { latitude: Number(f.lat), longitude: Number(f.lon) }) } });
                setF({ name: "", village: "", district: "", state: "", size: "", lat: "", lon: "" });
                toast({ title: t("farmer.farms.farmAdded") });
                await qc.invalidateQueries();
              } catch (err) { toast({ title: t("farmer.farms.couldNotAddFarm"), description: errMsg(err), variant: "destructive" }); }
            }}>
              <Field label={t("farmer.farms.farmName")}><input className={inputCls} required minLength={2} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("farmer.farms.village")}><input className={inputCls} value={f.village} onChange={(e) => setF({ ...f, village: e.target.value })} /></Field>
                <Field label={t("farmer.farms.district")}><input className={inputCls} value={f.district} onChange={(e) => setF({ ...f, district: e.target.value })} /></Field>
                <Field label={t("farmer.farms.state")}><input className={inputCls} required value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} /></Field>
                <Field label={t("farmer.farms.sizeHa")}><input className={inputCls} type="number" step="any" min="0" value={f.size} onChange={(e) => setF({ ...f, size: e.target.value })} /></Field>
                <Field label={t("farmer.farms.latitude")}><input className={inputCls} type="number" step="any" min="-90" max="90" value={f.lat} onChange={(e) => setF({ ...f, lat: e.target.value })} /></Field>
                <Field label={t("farmer.farms.longitude")}><input className={inputCls} type="number" step="any" min="-180" max="180" value={f.lon} onChange={(e) => setF({ ...f, lon: e.target.value })} /></Field>
              </div>
              <div className="flex gap-2"><Button type="button" variant="outline" className="rounded-full" onClick={locate}><LocateFixed className="mr-2 h-4 w-4" />{t("farmer.farms.useLocation")}</Button><Button disabled={createFarm.isPending} className="rounded-full">{t("farmer.farms.saveFarm")}</Button></div>
            </form>
          </Card>
        </div>
        <div className="space-y-4">
          <h3 className="eyebrow !text-ink/75">{t("farmer.farms.myProducts")}</h3>
          {products.isLoading ? <Loading /> : products.data?.length ? products.data.map((x) => <Card key={x.id} className="p-4"><div className="font-medium">{x.name} · {x.variety}</div><div className="text-xs text-ink/50">{t("farmer.farms.soldPer", { unit: unitLabel(x.unit) })}</div></Card>) : <Empty title={t("farmer.farms.noProducts")} />}
          <Card className="p-5">
            <h4 className="mb-3 font-medium">{t("farmer.farms.registerCrop")}</h4>
            <form className="space-y-3" onSubmit={async (e) => {
              e.preventDefault();
              try {
                await createProduct.mutateAsync({ data: p });
                setP({ ...p, variety: "" });
                toast({ title: t("farmer.farms.productRegistered") });
                await qc.invalidateQueries();
              } catch (err) { toast({ title: t("farmer.farms.couldNotRegister"), description: errMsg(err), variant: "destructive" }); }
            }}>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("farmer.farms.crop")}><input className={inputCls} required value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
                <Field label={t("farmer.farms.variety")}><input className={inputCls} required placeholder={t("farmer.farms.varietyPh")} value={p.variety} onChange={(e) => setP({ ...p, variety: e.target.value })} /></Field>
              </div>
              <Field label={t("farmer.farms.soldPerLabel")}><select className={inputCls} value={p.unit} onChange={(e) => setP({ ...p, unit: e.target.value as typeof p.unit })}><option value="kg">{unitLabel("kg")}</option><option value="quintal">{t("farmer.farms.quintal100")}</option><option value="tonne">{unitLabel("tonne")}</option></select></Field>
              <Button disabled={createProduct.isPending} className="rounded-full">{t("farmer.farms.saveProduct")}</Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
