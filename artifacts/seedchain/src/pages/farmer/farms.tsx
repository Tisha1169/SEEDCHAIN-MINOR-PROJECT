import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateFarm, useCreateProduct, useListFarms, useListProducts } from "@workspace/api-client-react";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Empty, ErrorState, Field, inputCls, Loading, PageHeader } from "@/components/app/common";
import { useToast } from "@/hooks/use-toast";
import { errMsg } from "@/lib/api";

export default function FarmsPage() {
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
      () => toast({ title: "Location permission denied", description: "Enter coordinates manually or leave them blank.", variant: "destructive" }),
      { timeout: 10000 },
    );

  return (
    <>
      <PageHeader title="Farms & products" subtitle="GPS coordinates are optional; with them SeedChain fetches real weather for your farm." />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="eyebrow !text-ink/75">My farms</h3>
          {farms.isLoading ? <Loading /> : farms.error ? <ErrorState error={farms.error} /> : farms.data?.length ? farms.data.map((x) => (
            <Card key={x.id} className="p-4"><div className="font-medium">{x.name}</div><div className="text-sm text-ink/55">{[x.village, x.district, x.state].filter(Boolean).join(", ")}{x.sizeHectares ? ` · ${x.sizeHectares} ha` : ""}</div><div className="text-xs text-ink/40">{x.latitude != null ? `GPS ${x.latitude}, ${x.longitude}` : "No GPS recorded"}</div></Card>
          )) : <Empty title="No farms yet" hint="Add your first farm below." />}
          <Card className="p-5">
            <h4 className="mb-3 font-medium">Add a farm</h4>
            <form className="space-y-3" onSubmit={async (e) => {
              e.preventDefault();
              try {
                await createFarm.mutateAsync({ data: { name: f.name, state: f.state, ...(f.village && { village: f.village }), ...(f.district && { district: f.district }), ...(f.size && { sizeHectares: Number(f.size) }), ...(f.lat && f.lon && { latitude: Number(f.lat), longitude: Number(f.lon) }) } });
                setF({ name: "", village: "", district: "", state: "", size: "", lat: "", lon: "" });
                toast({ title: "Farm added" });
                await qc.invalidateQueries();
              } catch (err) { toast({ title: "Could not add farm", description: errMsg(err), variant: "destructive" }); }
            }}>
              <Field label="Farm name"><input className={inputCls} required minLength={2} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Village"><input className={inputCls} value={f.village} onChange={(e) => setF({ ...f, village: e.target.value })} /></Field>
                <Field label="District"><input className={inputCls} value={f.district} onChange={(e) => setF({ ...f, district: e.target.value })} /></Field>
                <Field label="State"><input className={inputCls} required value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} /></Field>
                <Field label="Size (hectares)"><input className={inputCls} type="number" step="any" min="0" value={f.size} onChange={(e) => setF({ ...f, size: e.target.value })} /></Field>
                <Field label="Latitude"><input className={inputCls} type="number" step="any" min="-90" max="90" value={f.lat} onChange={(e) => setF({ ...f, lat: e.target.value })} /></Field>
                <Field label="Longitude"><input className={inputCls} type="number" step="any" min="-180" max="180" value={f.lon} onChange={(e) => setF({ ...f, lon: e.target.value })} /></Field>
              </div>
              <div className="flex gap-2"><Button type="button" variant="outline" className="rounded-full" onClick={locate}><LocateFixed className="mr-2 h-4 w-4" />Use my location</Button><Button disabled={createFarm.isPending} className="rounded-full">Save farm</Button></div>
            </form>
          </Card>
        </div>
        <div className="space-y-4">
          <h3 className="eyebrow !text-ink/75">My products</h3>
          {products.isLoading ? <Loading /> : products.data?.length ? products.data.map((x) => <Card key={x.id} className="p-4"><div className="font-medium">{x.name} · {x.variety}</div><div className="text-xs text-ink/50">Sold per {x.unit}</div></Card>) : <Empty title="No products yet" />}
          <Card className="p-5">
            <h4 className="mb-3 font-medium">Register a crop / product</h4>
            <form className="space-y-3" onSubmit={async (e) => {
              e.preventDefault();
              try {
                await createProduct.mutateAsync({ data: p });
                setP({ ...p, variety: "" });
                toast({ title: "Product registered" });
                await qc.invalidateQueries();
              } catch (err) { toast({ title: "Could not register product", description: errMsg(err), variant: "destructive" }); }
            }}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Crop"><input className={inputCls} required value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
                <Field label="Variety"><input className={inputCls} required placeholder="e.g. Kufri Jyoti" value={p.variety} onChange={(e) => setP({ ...p, variety: e.target.value })} /></Field>
              </div>
              <Field label="Sold per"><select className={inputCls} value={p.unit} onChange={(e) => setP({ ...p, unit: e.target.value as typeof p.unit })}><option value="kg">kg</option><option value="quintal">quintal (100 kg)</option><option value="tonne">tonne</option></select></Field>
              <Button disabled={createProduct.isPending} className="rounded-full">Save product</Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
