import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useListAllTraceEvents, useListAuditLogs, useListIntegrations, useListQrScans } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, ErrorState, Loading, PageHeader, Pill, Table } from "@/components/app/common";
import { SourceFooter } from "@/pages/farmer/market";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, errMsg } from "@/lib/api";
import { serverText, sourceLabel } from "@/lib/server-text";
import { dateTime, enumLabel } from "@/lib/format";

export function AdminEvents() {
  const { t } = useTranslation();
  const [type, setType] = useState("");
  const q = useListAllTraceEvents({ eventType: type || undefined, limit: 200 });
  const scans = useListQrScans({ limit: 30 });
  return (
    <>
      <PageHeader title={t("admin.events.title")} subtitle={t("admin.events.subtitle")} actions={<input className="h-10 rounded-full border bg-glass-2 px-4 text-sm" placeholder={t("admin.events.filter")} value={type} onChange={(e) => setType(e.target.value.toUpperCase())} />} />
      {q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : (
        <Table head={[t("admin.events.cols.recorded"), t("admin.events.cols.lot"), t("admin.events.cols.event"), t("admin.events.cols.who"), t("admin.events.cols.qty"), t("admin.events.cols.reason"), t("admin.events.cols.source")]}>
          {q.data?.map((e) => <tr key={e.id}><td className="px-4 py-2 text-xs">{dateTime(e.recordedAt)}</td><td className="px-4 py-2 font-mono text-xs">{e.lotCode}</td><td className="px-4 py-2 font-medium">{enumLabel("event", e.eventType)}</td><td className="px-4 py-2 text-xs">{e.actorName ?? t("admin.events.system")} {e.actorRole && `(${enumLabel("role", e.actorRole)})`}</td><td className="px-4 py-2">{e.quantityChange ?? "—"}</td><td className="px-4 py-2 text-xs">{e.reason ? serverText(e.reason) : "—"}</td><td className="px-4 py-2 text-xs">{enumLabel("eventSource", e.source)}</td></tr>)}
        </Table>
      )}
      <h3 className="mb-3 mt-8 eyebrow !text-ink/75">{t("admin.events.latestScans")}</h3>
      {scans.data && <Table head={[t("admin.events.scanCols.time"), t("admin.events.scanCols.lot"), t("admin.events.scanCols.qrv"), t("admin.events.scanCols.result"), t("admin.events.scanCols.source"), t("admin.events.scanCols.device"), t("admin.events.scanCols.signedIn")]}>{scans.data.map((s) => <tr key={s.id}><td className="px-4 py-2 text-xs">{dateTime(s.scannedAt)}</td><td className="px-4 py-2 font-mono text-xs">{s.lotCode ?? "—"}</td><td className="px-4 py-2">{s.qrVersion ?? "—"}</td><td className="px-4 py-2"><Pill className={s.result === "OK" ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"}>{enumLabel("scanResult", s.result)}</Pill></td><td className="px-4 py-2 text-xs">{enumLabel("scanSource", s.scanSource)}</td><td className="px-4 py-2 text-xs">{s.deviceType ? enumLabel("device", s.deviceType) : "—"}</td><td className="px-4 py-2 text-xs">{s.signedIn ? t("admin.events.yes") : t("admin.events.no")}</td></tr>)}</Table>}
    </>
  );
}

export function AdminAudit() {
  const { t } = useTranslation();
  const q = useListAuditLogs({ limit: 300 });
  return (
    <>
      <PageHeader title={t("admin.audit.title")} subtitle={t("admin.audit.subtitle")} />
      {q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : (
        <Table head={[t("admin.audit.cols.when"), t("admin.audit.cols.who"), t("admin.audit.cols.action"), t("admin.audit.cols.entity"), t("admin.audit.cols.change"), t("admin.audit.cols.request")]}>
          {q.data?.map((a) => <tr key={a.id}><td className="px-4 py-2 text-xs">{dateTime(a.createdAt)}</td><td className="px-4 py-2 text-xs">{a.userName ?? t("admin.audit.system")} {a.role && `(${enumLabel("role", a.role)})`}</td><td className="px-4 py-2 font-medium">{a.action}</td><td className="px-4 py-2 text-xs">{a.entityType}<div className="font-mono text-[10px] text-ink/40">{a.entityId?.slice(0, 8)}</div></td><td className="max-w-xs px-4 py-2 font-mono text-[10px]">{a.before != null && <div className="truncate text-rose-300">− {JSON.stringify(a.before)}</div>}{a.after != null && <div className="truncate text-emerald-300">+ {JSON.stringify(a.after)}</div>}</td><td className="px-4 py-2 font-mono text-[10px]">{a.requestId?.slice(0, 8)}</td></tr>)}
        </Table>
      )}
    </>
  );
}

export function AdminIntegrations() {
  const { t } = useTranslation();
  const q = useListIntegrations();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (source: string) => {
    setBusy(source);
    try { const r = await apiRequest<{ status: string; recordCount: number; error?: string }>({ url: `/api/admin/integrations/${source}/run`, method: "POST" }); toast({ title: t("admin.sources.recordsToast", { status: enumLabel("runStatus", r.status), n: r.recordCount }), description: r.error ?? undefined, variant: r.status === "FAILED" ? "destructive" : "default" }); await qc.invalidateQueries(); }
    catch (err) { toast({ title: t("admin.sources.runFailed"), description: errMsg(err), variant: "destructive" }); } finally { setBusy(null); }
  };
  return (
    <>
      <PageHeader title={t("admin.sources.title")} subtitle={t("admin.sources.subtitle")} />
      {q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} /> : (
        <div className="space-y-5">{q.data?.map((s) => (
          <Card key={s.source} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-medium">{sourceLabel(s.source, s.label)}</div><SourceFooter s={s} /></div><Button disabled={busy === s.source} variant="outline" className="rounded-full" onClick={() => void run(s.source)}><RefreshCw className={`mr-2 h-4 w-4 ${busy === s.source ? "animate-spin" : ""}`} />{t("admin.sources.runNow")}</Button></div>
            <div className="mt-4 overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-ink/45"><th className="py-1">{t("admin.sources.cols.started")}</th><th>{t("admin.sources.cols.status")}</th><th>{t("admin.sources.cols.records")}</th><th>{t("admin.sources.cols.version")}</th><th>{t("admin.sources.cols.endpoint")}</th><th>{t("admin.sources.cols.error")}</th></tr></thead><tbody>{s.recentRuns.map((r) => <tr key={r.id} className="border-t"><td className="py-1.5">{dateTime(r.startedAt)}</td><td><Pill className={r.status === "SUCCESS" ? "bg-emerald-400/15 text-emerald-300" : r.status === "FAILED" ? "bg-rose-400/15 text-rose-300" : "bg-zinc-400/15 text-zinc-300"}>{enumLabel("runStatus", r.status)}</Pill></td><td>{r.recordCount}</td><td>{r.processingVersion}</td><td className="max-w-[260px] truncate font-mono">{r.sourceEndpoint}</td><td className="text-rose-300">{r.error}</td></tr>)}</tbody></table></div>
          </Card>))}</div>
      )}
    </>
  );
}
