import { useState } from "react";
import { useListAllTraceEvents, useListAuditLogs, useListIntegrations, useListQrScans } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, ErrorState, Loading, PageHeader, Pill, Table } from "@/components/app/common";
import { SourceFooter } from "@/pages/farmer/market";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, errMsg } from "@/lib/api";
import { dateTime, titleCase } from "@/lib/format";

export function AdminEvents() {
  const [type, setType] = useState("");
  const q = useListAllTraceEvents({ eventType: type || undefined, limit: 200 });
  const scans = useListQrScans({ limit: 30 });
  return (
    <>
      <PageHeader title="Trace events" subtitle="Append-only history across every lot." actions={<input className="h-10 rounded-full border bg-glass-2 px-4 text-sm" placeholder="Filter by type, e.g. ORDER_CREATED" value={type} onChange={(e) => setType(e.target.value.toUpperCase())} />} />
      {q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : (
        <Table head={["Recorded", "Lot", "Event", "Who", "Qty Δ", "Reason", "Source"]}>
          {q.data?.map((e) => <tr key={e.id}><td className="px-4 py-2 text-xs">{dateTime(e.recordedAt)}</td><td className="px-4 py-2 font-mono text-xs">{e.lotCode}</td><td className="px-4 py-2 font-medium">{titleCase(e.eventType)}</td><td className="px-4 py-2 text-xs">{e.actorName ?? "System"} {e.actorRole && `(${e.actorRole})`}</td><td className="px-4 py-2">{e.quantityChange ?? "—"}</td><td className="px-4 py-2 text-xs">{e.reason ?? "—"}</td><td className="px-4 py-2 text-xs">{e.source}</td></tr>)}
        </Table>
      )}
      <h3 className="mb-3 mt-8 eyebrow !text-ink/75">Latest QR scans</h3>
      {scans.data && <Table head={["Time", "Lot", "QR v", "Result", "Source", "Device", "Signed in"]}>{scans.data.map((s) => <tr key={s.id}><td className="px-4 py-2 text-xs">{dateTime(s.scannedAt)}</td><td className="px-4 py-2 font-mono text-xs">{s.lotCode ?? "—"}</td><td className="px-4 py-2">{s.qrVersion ?? "—"}</td><td className="px-4 py-2"><Pill className={s.result === "OK" ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"}>{s.result}</Pill></td><td className="px-4 py-2 text-xs">{s.scanSource}</td><td className="px-4 py-2 text-xs">{s.deviceType ?? "—"}</td><td className="px-4 py-2 text-xs">{s.signedIn ? "yes" : "no"}</td></tr>)}</Table>}
    </>
  );
}

export function AdminAudit() {
  const q = useListAuditLogs({ limit: 300 });
  return (
    <>
      <PageHeader title="Audit log" subtitle="Who did what, to which record, with before/after values." />
      {q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : (
        <Table head={["When", "Who", "Action", "Entity", "Change", "Request"]}>
          {q.data?.map((a) => <tr key={a.id}><td className="px-4 py-2 text-xs">{dateTime(a.createdAt)}</td><td className="px-4 py-2 text-xs">{a.userName ?? "system"} {a.role && `(${a.role})`}</td><td className="px-4 py-2 font-medium">{a.action}</td><td className="px-4 py-2 text-xs">{a.entityType}<div className="font-mono text-[10px] text-ink/40">{a.entityId?.slice(0, 8)}</div></td><td className="max-w-xs px-4 py-2 font-mono text-[10px]">{a.before != null && <div className="truncate text-rose-300">− {JSON.stringify(a.before)}</div>}{a.after != null && <div className="truncate text-emerald-300">+ {JSON.stringify(a.after)}</div>}</td><td className="px-4 py-2 font-mono text-[10px]">{a.requestId?.slice(0, 8)}</td></tr>)}
        </Table>
      )}
    </>
  );
}

export function AdminIntegrations() {
  const q = useListIntegrations();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (source: string) => {
    setBusy(source);
    try { const r = await apiRequest<{ status: string; recordCount: number; error?: string }>({ url: `/api/admin/integrations/${source}/run`, method: "POST" }); toast({ title: `${r.status}: ${r.recordCount} record(s)`, description: r.error ?? undefined, variant: r.status === "FAILED" ? "destructive" : "default" }); await qc.invalidateQueries(); }
    catch (err) { toast({ title: "Run failed", description: errMsg(err), variant: "destructive" }); } finally { setBusy(null); }
  };
  return (
    <>
      <PageHeader title="External data sources" subtitle="Backend ingestion with lineage. The browser never calls these APIs directly." />
      {q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} /> : (
        <div className="space-y-5">{q.data?.map((s) => (
          <Card key={s.source} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-medium">{s.label}</div><SourceFooter s={s} /></div><Button disabled={busy === s.source} variant="outline" className="rounded-full" onClick={() => void run(s.source)}><RefreshCw className={`mr-2 h-4 w-4 ${busy === s.source ? "animate-spin" : ""}`} />Run now</Button></div>
            <div className="mt-4 overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-ink/45"><th className="py-1">Started</th><th>Status</th><th>Records</th><th>Version</th><th>Endpoint (secrets redacted)</th><th>Error</th></tr></thead><tbody>{s.recentRuns.map((r) => <tr key={r.id} className="border-t"><td className="py-1.5">{dateTime(r.startedAt)}</td><td><Pill className={r.status === "SUCCESS" ? "bg-emerald-400/15 text-emerald-300" : r.status === "FAILED" ? "bg-rose-400/15 text-rose-300" : "bg-zinc-400/15 text-zinc-300"}>{r.status}</Pill></td><td>{r.recordCount}</td><td>{r.processingVersion}</td><td className="max-w-[260px] truncate font-mono">{r.sourceEndpoint}</td><td className="text-rose-300">{r.error}</td></tr>)}</tbody></table></div>
          </Card>))}</div>
      )}
    </>
  );
}
