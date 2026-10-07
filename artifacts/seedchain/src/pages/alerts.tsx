import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useListAlerts } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, Empty, ErrorState, Loading, PageHeader, Pill } from "@/components/app/common";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, errMsg } from "@/lib/api";
import { serverText } from "@/lib/server-text";
import { dateTime, enumLabel } from "@/lib/format";

const SEV: Record<string, string> = { LOW: "bg-zinc-400/15 text-zinc-300", MEDIUM: "bg-amber-400/15 text-amber-300", HIGH: "bg-orange-400/15 text-orange-300", CRITICAL: "bg-rose-400/15 text-rose-300" };

export default function AlertsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [state, setState] = useState<"open" | "all">("open");
  const q = useListAlerts({ state });
  const qc = useQueryClient();
  const { toast } = useToast();
  const act = async (id: string, what: "acknowledge" | "resolve") => {
    try { await apiRequest({ url: `/api/alerts/${id}/${what}`, method: "POST" }); await qc.invalidateQueries(); } catch (err) { toast({ title: t("alerts.failed"), description: errMsg(err), variant: "destructive" }); }
  };
  return (
    <>
      <PageHeader title={t("alerts.title")} subtitle={t("alerts.subtitle")} actions={<select className="h-10 rounded-full border bg-glass-2 px-4 text-sm" value={state} onChange={(e) => setState(e.target.value as "open" | "all")}><option value="open">{t("alerts.open")}</option><option value="all">{t("alerts.all")}</option></select>} />
      {q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : !q.data?.length ? <Empty title={t("alerts.noneTitle")} hint={t("alerts.noneHint")} /> : (
        <div className="space-y-3">{q.data.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><div className="mb-1 flex items-center gap-2"><Pill className={SEV[a.severity]}>{enumLabel("severity", a.severity)}</Pill><span className="text-sm font-medium">{enumLabel("alertType", a.type)}</span>{a.resolvedAt && <Pill className="bg-emerald-400/15 text-emerald-300">{t("alerts.resolved")}</Pill>}</div><p className="text-sm">{serverText(a.message)}</p><div className="mt-1 text-xs text-ink/45">{dateTime(a.createdAt)}{a.acknowledgedAt && ` · ${t("alerts.acknowledged")} ${dateTime(a.acknowledgedAt)}`}{a.entityType === "lot" && a.entityId && <> · <Link href={`/${user?.role}/lots/${a.entityId}`} className="text-accent">{t("alerts.openLot")}</Link></>}{a.entityType === "order" && a.entityId && <> · <Link href={`/${user?.role}/orders/${a.entityId}`} className="text-accent">{t("alerts.openOrder")}</Link></>}</div></div>
              <div className="flex gap-2">{!a.acknowledgedAt && <Button size="sm" variant="outline" className="rounded-full" onClick={() => void act(a.id, "acknowledge")}>{t("alerts.acknowledge")}</Button>}{user?.role === "admin" && !a.resolvedAt && <Button size="sm" className="rounded-full" onClick={() => void act(a.id, "resolve")}>{t("alerts.resolve")}</Button>}</div>
            </div>
          </Card>))}</div>
      )}
    </>
  );
}
