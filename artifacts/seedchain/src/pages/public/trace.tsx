import { useEffect, useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, getGetPublicTraceQueryKey, recordScan, useGetPublicTrace } from "@workspace/api-client-react";
import { AlertTriangle, BadgeCheck, MapPin, QrCode, RefreshCw, ShieldAlert, ShoppingBag, Sprout, Thermometer, User } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, Kv, Loading, Pill } from "@/components/app/common";
import { ProduceTile } from "@/components/art";
import { Reveal } from "@/components/motion";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { cropName, dateOnly, dateTime, enumLabel, qty, timeAgo, unitLabel } from "@/lib/format";
import { errMsg, uuid } from "@/lib/api";
import { LotStatusPill } from "@/components/app/common";

const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";

/** One scan id per token per browser tab, so refreshes are recorded as duplicates, not new scans. */
function scanId(token: string): string {
  try {
    const k = `sc.scan.${token}`;
    return sessionStorage.getItem(k) ?? (sessionStorage.setItem(k, uuid()), sessionStorage.getItem(k)!);
  } catch {
    return uuid();
  }
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="relative z-[2] mx-auto max-w-xl px-4 pb-16 pt-24 sm:pt-28">{children}</div>
    </div>
  );
}

/** The server sends English text for a few event details; known shapes are re-expressed in the chosen language. */
function traceDetail(eventType: string, detail: string | null | undefined, tr: (k: string, o?: Record<string, unknown>) => string): string | null {
  if (!detail) return null;
  const grade = detail.match(/^Grade (\w+)$/);
  if (grade) return tr("traceExtra.gradeDetail", { g: grade[1] });
  const q = detail.match(/^([\d.,]+) (\w+)$/);
  if (q) return `${q[1]} ${unitLabel(q[2])}`;
  if (eventType === "STORAGE_RECORDED") return enumLabel("storageKind", detail.replace(/ /g, "_"));
  return detail;
}

export default function TracePage() {
  const { t: tr } = useTranslation();
  const [, params] = useRoute("/trace/:token");
  const token = params?.token ?? "";
  const fromApp = new URLSearchParams(window.location.search).get("s") === "app";
  const qc = useQueryClient();
  const q = useGetPublicTrace(token, { query: { queryKey: getGetPublicTraceQueryKey(token), retry: false, refetchInterval: 30_000, refetchOnWindowFocus: true } });
  const recorded = useRef(false);
  const [live, setLive] = useState(false);
  const reduce = useReducedMotion();
  const lotId = q.data?.lotId;

  // Record the scan once (the in-app scanner has already recorded its own).
  useEffect(() => {
    if (!token || recorded.current || fromApp) return;
    recorded.current = true;
    const dev = /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop";
    void recordScan({ publicToken: token, scanSource: "camera_link", clientEventId: scanId(token), deviceType: dev }).catch(() => undefined);
  }, [token, fromApp]);

  // Live updates for exactly this lot: the farmer's next update appears without a manual refresh.
  useEffect(() => {
    if (!lotId) return;
    const es = new EventSource(`${apiBase}/api/stream/trace/${token}`);
    es.addEventListener("ready", () => setLive(true));
    es.addEventListener("change", () => void qc.invalidateQueries({ queryKey: getGetPublicTraceQueryKey(token) }));
    es.onerror = () => setLive(false);
    return () => es.close();
  }, [lotId, token, qc]);

  if (q.isLoading) return <Shell><Loading label={tr("trace.verifying")} /></Shell>;

  if (q.error) {
    const e = q.error;
    if (e instanceof ApiError && e.status === 404) {
      return (
        <Shell>
          <Card className="p-8 text-center">
            <ShieldAlert className="mx-auto mb-3 h-12 w-12 text-rose-500" />
            <h1 className="text-xl font-medium">{tr("trace.unknownTitle")}</h1>
            <p className="mt-2 text-sm text-ink/60">{tr("trace.unknownBody")}</p>
            <Link href="/scan"><Button className="mt-5 rounded-full">{tr("trace.scanAnother")}</Button></Link>
          </Card>
        </Shell>
      );
    }
    if (e instanceof ApiError && e.status === 410) {
      const st = (e.data as { status?: string } | null)?.status;
      return (
        <Shell>
          <Card className="border-rose-400/25 p-8 text-center">
            <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-amber-500" />
            <h1 className="text-xl font-medium">{st === "REVOKED" ? tr("trace.revokedTitle") : st === "DISABLED" ? tr("trace.disabledTitle") : tr("trace.replacedTitle")}</h1>
            <p className="mt-2 text-sm text-ink/60">{(e.data as { message?: string } | null)?.message}</p>
          </Card>
        </Shell>
      );
    }
    return (
      <Shell>
        <Card className="p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-amber-500" />
          <h1 className="text-xl font-medium">{tr("trace.unreachableTitle")}</h1>
          <p className="mt-2 text-sm text-ink/60">{errMsg(e)} {tr("trace.noCache")}</p>
          <Button onClick={() => void q.refetch()} variant="outline" className="mt-5 rounded-full"><RefreshCw className="mr-2 h-4 w-4" />{tr("trace.tryAgain")}</Button>
        </Card>
      </Shell>
    );
  }

  const t = q.data!;
  const verified = t.verification === "VERIFIED";
  return (
    <Shell>
      <div className="space-y-4">
        {/* verification banner */}
        <Reveal blur={false}>
          <div className={`glass-strong relative overflow-hidden rounded-[28px] p-5 ${verified ? "" : "!border-amber-400/30"}`}>
            <div aria-hidden className={`absolute -right-16 -top-16 h-52 w-52 rounded-full blur-3xl ${verified ? "bg-accent/25" : "bg-amber-400/20"}`} />
            <div className="relative flex items-center gap-4">
              <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border ${verified ? "border-accent/50 bg-accent/15 text-accent" : "border-amber-300/40 bg-amber-300/10 text-amber-300"}`}>
                {verified ? <BadgeCheck className="h-7 w-7" strokeWidth={1.4} /> : <AlertTriangle className="h-7 w-7" strokeWidth={1.4} />}
              </span>
              <div className="min-w-0">
                <div className={`text-[11px] font-medium tracking-[0.28em] ${verified ? "text-accent" : "text-amber-300"}`}>{verified ? tr("trace.verified") : tr("trace.unverified")}</div>
                <div className="mt-0.5 truncate font-mono text-xl tracking-wide">{t.lotCode}</div>
              </div>
            </div>
            <p className="relative mt-3 text-xs leading-relaxed text-ink/55">{verified ? tr("trace.verifiedBody") : tr("trace.unverifiedBody")}</p>
          </div>
        </Reveal>

        {/* product */}
        <Reveal blur={false} delay={0.05}>
          <div className="glass overflow-hidden rounded-[28px]">
            <div className="relative aspect-[16/9]">
              <ProduceTile name={t.productName} seed={t.lotCode} className="absolute inset-0" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
                <div><h1 className="text-4xl font-extralight tracking-tight">{cropName(t.productName)}</h1><div className="text-ink/65">{t.variety}</div></div>
                <LotStatusPill status={t.status} />
              </div>
            </div>
            <div className="p-5">
              <Kv k={tr("trace.farmer")} v={<span className="inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-ink/40" />{t.farmer.publicName}{t.farmer.verified && <BadgeCheck className="h-4 w-4 text-accent" />}</span>} />
              <Kv k={tr("trace.farm")} v={t.farmName} />
              <Kv k={tr("trace.origin")} v={<span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-ink/40" />{t.origin}</span>} />
              <Kv k={tr("trace.harvestDate")} v={dateOnly(t.harvestDate)} />
              <Kv k={tr("trace.harvested")} v={qty(t.harvestedQuantity, t.unit)} />
              {t.availableQuantity != null && <Kv k={tr("trace.availableNow")} v={qty(t.availableQuantity, t.unit)} />}
              <Kv k={tr("trace.quality")} v={t.qualityGrade ? `${tr("trace.grade")} ${t.qualityGrade}` : tr("trace.notRecorded")} />
              {t.qualityNotes && <Kv k={tr("trace.qualityNotes")} v={t.qualityNotes} />}
              {t.storage && (
                <div className="mt-4 rounded-2xl bg-white/[0.04] p-3.5 text-sm">
                  <div className="mb-1 flex items-center gap-2 text-xs font-medium tracking-wide text-ink/70"><Thermometer className="h-4 w-4 text-accent" />{tr("trace.storage")}</div>
                  <div className="text-ink/60">{enumLabel("storageKind", t.storage.storageType)} {tr("trace.since")} {dateOnly(t.storage.storageStart)}{t.storage.temperatureC != null && ` · ${t.storage.temperatureC}°C`}{t.storage.storageCondition && ` · ${tr(`farmer.detail.cond.${t.storage.storageCondition}`, { defaultValue: t.storage.storageCondition })}`}</div>
                </div>
              )}
              {t.publicNotes && <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink/60">{t.publicNotes}</p>}
            </div>
          </div>
        </Reveal>

        {t.listed && (t.availableQuantity ?? 0) > 0 && (
          <Link href={`/marketplace/${t.lotId}`} className="flex h-14 items-center justify-center gap-2 rounded-full bg-white text-[15px] font-medium text-neutral-950 transition-shadow hover:shadow-[0_0_44px_-8px_rgba(255,255,255,0.55)]"><ShoppingBag className="h-5 w-5" />{tr("trace.orderDirect")}</Link>
        )}

        {/* journey */}
        <Reveal blur={false}>
          <div className="glass rounded-[28px] p-5 sm:p-6">
            <h2 className="mb-6 flex items-center gap-2 text-[11px] font-medium tracking-[0.24em] text-ink/60"><Sprout className="h-4 w-4 text-accent" />{tr("trace.journey")}</h2>
            <ol className="relative space-y-6 pl-8">
              <span aria-hidden className="absolute bottom-2 left-[11px] top-2 w-px bg-gradient-to-b from-accent/60 via-accent/25 to-transparent" />
              {t.timeline.map((e, i) => (
                <motion.li key={`${e.eventType}-${i}`} initial={reduce ? false : { opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-6%" }} transition={{ duration: 0.6, delay: Math.min(i * 0.05, 0.4) }} className="relative">
                  <span className="absolute -left-8 top-0.5 flex h-[23px] w-[23px] items-center justify-center rounded-full border border-accent/50 bg-[#07130c] shadow-[0_0_16px_-2px_rgba(134,214,160,0.55)]"><span className="h-1.5 w-1.5 rounded-full bg-accent" /></span>
                  <div className="text-[15px] leading-tight">{enumLabel("event", e.eventType)}</div>
                  <div className="mt-1 text-xs text-ink/45">{dateTime(e.eventTime)}{e.location ? ` · ${e.location}` : ""}</div>
                  {e.detail && <div className="mt-0.5 text-xs text-ink/65">{traceDetail(e.eventType, e.detail, tr)}</div>}
                </motion.li>
              ))}
            </ol>
          </div>
        </Reveal>

        <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-[28px] p-4 text-xs text-ink/50">
          <div>
            <div>{tr("trace.lastUpdated")} {dateTime(t.lastUpdatedAt)} ({timeAgo(t.lastUpdatedAt)})</div>
            <div className="mt-0.5 text-ink/35">{tr("trace.retrieved")} {timeAgo(t.retrievedAt)} {tr("trace.fromLiveDb")} · QR v{t.qrVersion}</div>
          </div>
          <div className="flex items-center gap-2">
            <Pill className={live ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-ink/60"}>{live ? tr("trace.live") : tr("trace.refreshes")}</Pill>
            <Button size="sm" variant="outline" onClick={() => void q.refetch()} disabled={q.isFetching}><RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${q.isFetching ? "animate-spin" : ""}`} />{tr("trace.refresh")}</Button>
          </div>
        </div>
        <p className="px-4 pb-4 text-center text-[11px] leading-relaxed text-ink/30"><QrCode className="mr-1 inline h-3 w-3" />{tr("trace.disclaimer")}</p>
      </div>
    </Shell>
  );
}
