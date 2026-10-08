import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useListLotPackages, type PackageItem, type SealStatus } from "@workspace/api-client-react";
import { Boxes, ChevronDown, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, Empty, ErrorState, Field, inputCls, Loading, Pill, textareaCls } from "@/components/app/common";
import { QrLabel } from "@/components/app/qr-label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, errMsg } from "@/lib/api";
import { dateTime, qty } from "@/lib/format";

const TONE: Record<string, string> = {
  ASSIGNED: "bg-white/10 text-ink/60",
  DISPATCH_VERIFIED: "bg-emerald-400/15 text-emerald-300",
  INTACT: "bg-emerald-400/15 text-emerald-300",
  BROKEN: "bg-rose-400/15 text-rose-300",
  REPORTED: "bg-amber-400/15 text-amber-300",
  REPLACED: "bg-amber-400/15 text-amber-300",
};

/** Mirrors the server's seal transition table (domain/seals.ts). The server is the authority; this only decides which buttons to offer. */
const ACTIONS: Record<SealStatus, { to: SealStatus; key: string; role: ("farmer" | "admin")[]; note: boolean }[]> = {
  ASSIGNED: [{ to: "DISPATCH_VERIFIED", key: "verify", role: ["farmer", "admin"], note: false }],
  DISPATCH_VERIFIED: [
    { to: "INTACT", key: "intact", role: ["admin"], note: false },
    { to: "BROKEN", key: "broken", role: ["admin"], note: true },
    { to: "REPLACED", key: "replace", role: ["farmer", "admin"], note: true },
  ],
  INTACT: [
    { to: "BROKEN", key: "broken", role: ["admin"], note: true },
    { to: "REPLACED", key: "replace", role: ["admin"], note: true },
  ],
  REPORTED: [
    { to: "INTACT", key: "intact", role: ["admin"], note: true },
    { to: "BROKEN", key: "broken", role: ["admin"], note: true },
    { to: "REPLACED", key: "replace", role: ["admin"], note: true },
  ],
  BROKEN: [{ to: "REPLACED", key: "replace", role: ["farmer", "admin"], note: true }],
  REPLACED: [{ to: "DISPATCH_VERIFIED", key: "verify", role: ["farmer", "admin"], note: false }],
};

export function PackagesCard({ lotId, unit, harvested, role, traceBase, lotCode, productName, variety, origin }: {
  lotId: string; unit: string; harvested: number; role: "farmer" | "admin"; traceBase: string; lotCode: string; productName: string; variety: string; origin: string;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const key = [`/api/lots/${lotId}/packages`];
  const q = useListLotPackages(lotId, { query: { queryKey: key, retry: false } });
  const [count, setCount] = useState("");
  const [each, setEach] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [labelFor, setLabelFor] = useState<string | null>(null);
  const [dlg, setDlg] = useState<{ pkg: PackageItem; to: SealStatus; actionKey: string; needNote: boolean } | null>(null);
  const [note, setNote] = useState("");

  const packaged = (q.data ?? []).reduce((s, p) => s + p.quantity, 0);
  const left = Math.max(0, Math.round((harvested - packaged) * 1000) / 1000);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const made = await apiRequest<PackageItem[]>({ url: `/api/lots/${lotId}/packages`, method: "POST", body: { count: Number(count), quantityEach: Number(each) } });
      toast({ title: t("seal.create.done", { n: made.length }) });
      setCount("");
      setEach("");
      await qc.invalidateQueries({ queryKey: key });
    } catch (err) {
      toast({ title: errMsg(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function apply(p: PackageItem, to: SealStatus, n?: string) {
    setBusy(true);
    try {
      await apiRequest({ url: `/api/packages/${p.id}/seal`, method: "POST", body: { status: to, ...(n?.trim() && { note: n.trim() }) } });
      toast({ title: t("seal.action.updated") });
      setDlg(null);
      setNote("");
      await qc.invalidateQueries({ queryKey: key });
      await qc.invalidateQueries({ queryKey: [`/api/lots/${lotId}/events`] });
    } catch (err) {
      toast({ title: errMsg(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <h3 className="mb-1 flex items-center gap-2 eyebrow !text-ink/75"><Boxes className="h-4 w-4" />{t("seal.title")}</h3>
      <p className="mb-4 text-xs leading-relaxed text-ink/50">{t("seal.subtitle")}</p>

      {harvested > 0 && left > 0 && (
        <form onSubmit={create} className="mb-5 grid items-end gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-[1fr_1fr_auto]">
          <Field label={t("seal.create.count")}><input className={inputCls} type="number" min="1" max="200" step="1" required value={count} onChange={(e) => setCount(e.target.value)} /></Field>
          <Field label={t("seal.create.each", { unit })} hint={t("seal.create.unpackaged", { n: left, unit })}><input className={inputCls} type="number" min="0.001" step="any" max={left} required value={each} onChange={(e) => setEach(e.target.value)} /></Field>
          <Button disabled={busy} className="rounded-full">{t("seal.create.submit")}</Button>
        </form>
      )}

      {q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : !q.data?.length ? (
        <Empty title={t("seal.none")} hint={t("seal.noneHint")} />
      ) : (
        <ul className="space-y-2">
          {q.data.map((p) => {
            const acts = ACTIONS[p.sealStatus].filter((a) => a.role.includes(role));
            return (
              <li key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{p.label} <span className="font-normal text-ink/55">· {qty(p.quantity, unit)}</span></div>
                    <div className="font-mono text-[11px] text-ink/50">{t("seal.sealId")}: {p.sealId}</div>
                  </div>
                  <Pill className={TONE[p.sealStatus]}>{t(`seal.status.${p.sealStatus}`)}</Pill>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {acts.map((a) => (
                    <Button key={a.key} size="sm" variant="outline" className="rounded-full" disabled={busy} onClick={() => (a.note ? (setNote(""), setDlg({ pkg: p, to: a.to, actionKey: a.key, needNote: true })) : void apply(p, a.to))}>{t(`seal.action.${a.key}`)}</Button>
                  ))}
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => setLabelFor(labelFor === p.id ? null : p.id)}><QrCode className="mr-1.5 h-3.5 w-3.5" />{t("seal.label")}</Button>
                  <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setOpen(open === p.id ? null : p.id)}><ChevronDown className={`mr-1 h-3.5 w-3.5 transition-transform ${open === p.id ? "rotate-180" : ""}`} />{t("seal.history")}</Button>
                </div>
                {labelFor === p.id && (
                  <div className="mt-4"><QrLabel compact traceUrl={`${traceBase}${p.publicToken}`} lotCode={lotCode} productName={productName} variety={variety} origin={origin} pkg={{ label: p.label, quantityText: qty(p.quantity, unit), sealId: p.sealId }} /></div>
                )}
                {open === p.id && (
                  <ol className="mt-3 space-y-1.5 border-t border-white/10 pt-3 text-xs text-ink/60">
                    {(p.history ?? []).map((h, i) => (
                      <li key={i}>{dateTime(h.at)} · <b className="text-ink/80">{h.eventType.replace(/^SEAL_/, "").replace(/_/g, " ").toLowerCase()}</b>{h.actorRole ? ` (${h.actorRole})` : ""}{h.note ? ` · ${h.note}` : ""}</li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dlg ? `${t(`seal.action.${dlg.actionKey}`)} · ${dlg.pkg.label}` : ""}</DialogTitle></DialogHeader>
          <label className="block text-xs text-ink/60">{t("seal.action.noteLabel")}<textarea className={`${textareaCls} mt-1`} rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <Button className="rounded-full" disabled={busy || (dlg?.needNote && !note.trim())} onClick={() => dlg && void apply(dlg.pkg, dlg.to, note)}>{t("seal.action.confirm")}</Button>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
