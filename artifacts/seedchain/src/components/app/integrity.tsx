import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useGetPublicTrace, getGetPublicTraceQueryKey, type PublicTrace, type ReportSealBodyKind, type SealReportResult } from "@workspace/api-client-react";
import { AlertTriangle, Check, CircleDashed, Minus, ShieldCheck, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pill, textareaCls } from "@/components/app/common";
import { apiRequest, errMsg } from "@/lib/api";
import { qty } from "@/lib/format";

type Tone = "ok" | "warn" | "bad" | "idle";
const TONE: Record<Tone, string> = {
  ok: "text-accent",
  warn: "text-amber-300",
  bad: "text-rose-300",
  idle: "text-ink/45",
};

function Row({ tone, children, sub }: { tone: Tone; children: React.ReactNode; sub?: React.ReactNode }) {
  const Icon = tone === "ok" ? Check : tone === "bad" ? AlertTriangle : tone === "warn" ? CircleDashed : Minus;
  return (
    <li className="flex items-start gap-2.5 py-1.5">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${TONE[tone]}`} strokeWidth={2} aria-hidden />
      <div>
        <div className={`text-[13px] tracking-wide ${tone === "idle" ? "text-ink/55" : "text-ink/90"}`}>{children}</div>
        {sub && <div className="mt-0.5 text-[11px] leading-relaxed text-ink/50">{sub}</div>}
      </div>
    </li>
  );
}

export function sealStateTone(state: string): Tone {
  return state === "INTACT" ? "ok" : state === "EXCEPTION" ? "bad" : state === "NOT_VERIFIED" ? "warn" : "idle";
}

/** Compact one-line integrity indicator (order pages, lists). */
export function IntegrityChip({ token }: { token: string | null | undefined }) {
  const { t } = useTranslation();
  const q = useGetPublicTrace(token ?? "", { query: { queryKey: getGetPublicTraceQueryKey(token ?? ""), enabled: !!token, retry: false, staleTime: 30_000 } });
  const p = q.data?.physicalIntegrity;
  if (!p) return null;
  const tone = sealStateTone(p.state);
  const label = p.state === "INTACT" ? t("seal.trace.intact") : p.state === "EXCEPTION" ? t("seal.trace.exception") : p.state === "NOT_VERIFIED" ? t("seal.trace.notVerified") : t("seal.trace.noSeals");
  const cls = tone === "ok" ? "bg-emerald-400/15 text-emerald-300" : tone === "bad" ? "bg-rose-400/15 text-rose-300" : tone === "warn" ? "bg-amber-400/15 text-amber-300" : "bg-white/10 text-ink/55";
  return <Pill className={cls}>{label}</Pill>;
}

function ReportDialog({ token, open, onClose }: { token: string; open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<ReportSealBodyKind>("SEAL_BROKEN");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<SealReportResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const kinds: ReportSealBodyKind[] = ["SEAL_BROKEN", "SEAL_MISSING", "SEAL_MISMATCH", "OTHER"];

  async function send() {
    setBusy(true);
    setErr(null);
    try {
      setDone(await apiRequest<SealReportResult>({ url: `/api/trace/${token}/report-seal`, method: "POST", body: { kind, ...(note.trim() && { note: note.trim() }) } }));
    } catch (e) {
      setErr(`${t("seal.trace.failed")} ${errMsg(e)}`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("seal.trace.reportTitle")}</DialogTitle></DialogHeader>
        {done ? (
          <div className="space-y-4"><p className="text-sm text-ink/75">{done.alreadyUnderReview ? t("seal.trace.already") : t("seal.trace.thanks")}</p><Button className="rounded-full" onClick={onClose}>OK</Button></div>
        ) : (
          <div className="space-y-4">
            <fieldset className="space-y-2">
              {kinds.map((k) => (
                <label key={k} className="flex cursor-pointer items-center gap-2 text-sm text-ink/85">
                  <input type="radio" name="seal-kind" checked={kind === k} onChange={() => setKind(k)} />
                  {t(`seal.trace.kind.${k}`)}
                </label>
              ))}
            </fieldset>
            <label className="block text-xs text-ink/60">{t("seal.trace.noteLabel")}<textarea className={`${textareaCls} mt-1`} rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} /></label>
            {err && <p role="alert" className="text-sm text-rose-300">{err}</p>}
            <Button className="rounded-full" disabled={busy} onClick={() => void send()}>{t("seal.trace.send")}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Public identity and integrity panel. Every row is derived from recorded data; nothing is ticked that the system
 * has not actually verified, and the copy never claims the produce is guaranteed or the package tamper-proof.
 */
export function IdentityPanel({ trace, token }: { trace: PublicTrace; token: string }) {
  const { t } = useTranslation();
  const [reporting, setReporting] = useState(false);
  const d = trace.digitalIdentity;
  const p = trace.physicalIntegrity;
  const tone = sealStateTone(p.state);

  return (
    <div className={`glass rounded-[28px] p-5 sm:p-6 ${p.state === "EXCEPTION" ? "!border-rose-400/30" : ""}`}>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 flex items-center gap-2 text-[11px] font-medium tracking-[0.24em] text-ink/60"><ShieldCheck className="h-4 w-4 text-accent" />{t("seal.trace.digital")}</h2>
          <ul>
            <Row tone={d.qrValid ? "ok" : "bad"}>{t("seal.trace.qrValid")}</Row>
            <Row tone={d.lotRegistered ? "ok" : "bad"}>{t("seal.trace.lotRegistered")}</Row>
            <Row tone={d.farmerVerified ? "ok" : "warn"}>{d.farmerVerified ? t("seal.trace.farmVerified") : t("seal.trace.farmNotVerified")}</Row>
            <Row tone={d.quality === "INSPECTED" ? "ok" : d.quality === "RECORDED_BY_FARMER" ? "warn" : "idle"}>
              {d.quality === "INSPECTED" ? t("seal.trace.qualityInspected") : d.quality === "RECORDED_BY_FARMER" ? t("seal.trace.qualityRecorded") : t("seal.trace.qualityNone")}
            </Row>
          </ul>
        </div>
        <div>
          <h2 className="mb-2 flex items-center gap-2 text-[11px] font-medium tracking-[0.24em] text-ink/60"><ShieldCheck className="h-4 w-4 text-accent" />{t("seal.trace.physical")}</h2>
          <ul>
            {p.state === "INTACT" && <Row tone="ok">{t("seal.trace.intact")}</Row>}
            {p.state === "NOT_VERIFIED" && <Row tone="warn" sub={p.scope === "LOT" ? t("seal.trace.lotLevel", { ok: p.counts.OK, n: p.packagesTotal }) : undefined}>{t("seal.trace.notVerified")}</Row>}
            {p.state === "NO_SEALS" && <Row tone="idle">{t("seal.trace.noSeals")}</Row>}
            {p.state === "EXCEPTION" && (
              <Row tone="bad" sub={<>{p.package && t("seal.trace.sealStatus", { s: t(`seal.status.${p.package.sealStatus}`) })}{p.package ? " · " : ""}{t("seal.trace.contact")}</>}>
                <b>{t("seal.trace.exception")}</b>
              </Row>
            )}
            {p.package && (
              <Row tone="idle" sub={t("seal.trace.sealMatch", { id: p.package.sealId })}>
                {t("seal.trace.package", { label: p.package.label, qty: qty(p.package.quantity, trace.unit) })}
              </Row>
            )}
            {p.scope === "LOT" && p.state === "INTACT" && <Row tone="idle">{t("seal.trace.lotLevel", { ok: p.counts.OK, n: p.packagesTotal })}</Row>}
          </ul>
        </div>
      </div>
      <p className={`mt-4 border-t border-white/10 pt-3 text-[11px] leading-relaxed ${tone === "bad" ? "text-rose-200/80" : "text-ink/45"}`}>
        {t("seal.trace.disclaimer")} {t("seal.trace.explain")}
      </p>
      <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={() => setReporting(true)}><Flag className="mr-2 h-3.5 w-3.5" />{t("seal.trace.reportCta")}</Button>
      <ReportDialog token={token} open={reporting} onClose={() => setReporting(false)} />
    </div>
  );
}
