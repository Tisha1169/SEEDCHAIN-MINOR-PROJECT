import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BadgeCheck, Cloud, Gauge, Package, ShieldCheck, Star, TrendingUp, Wheat } from "lucide-react";
import { FieldScene, Frame, ProduceTile } from "@/components/art";
import { CountUp, GlassCard, Magnetic, Reveal } from "@/components/motion";
import { Logo } from "@/components/layout/navbar";
import { serverText } from "@/lib/server-text";
import { currentLocale } from "@/i18n";
import { enumLabel, timeAgo, unitLabel } from "@/lib/format";
import { dash, Display, Eyebrow, fmtDate, Row, Section, type LandingProps } from "./shared";

/** 07: the farmer's digital passport. */
export function FarmerPassport({ data }: LandingProps) {
  const { t } = useTranslation();
  const f = data?.featured;
  const s = f?.farmerStats;
  return (
    <Section id="farmers">
      <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-24">
        <Reveal y={50}>
          <Frame src="/media/farmer.webp" alt={t("landing.passport.alt")} art={<FieldScene />} ratio="aspect-[4/5] sm:aspect-[5/4]" position="38% 50%">
            <div className="absolute inset-x-4 bottom-4 z-10 sm:inset-x-8 sm:bottom-8">
              <GlassCard strong className="p-5 sm:p-7" lift={false}>
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-accent/15 text-xl font-light text-accent">{(f?.farmerPublicName ?? "F")[0]}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-lg font-light"><span className="truncate">{f?.farmerPublicName ?? t("landing.passport.verifiedFarmer")}</span>{f?.verified && <BadgeCheck className="h-5 w-5 shrink-0 text-accent" aria-label={t("landing.passport.verifiedFarmer")} />}</div>
                    <div className="truncate text-xs text-ink/50">{f ? [f.farmName, f.district, f.state].filter(Boolean).join(" · ") : t("landing.passport.profileFallback")}</div>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  {[
                    [t("landing.passport.activeLots"), s ? String(s.activeLots) : dash],
                    [t("landing.passport.traceability"), s?.traceabilityPercent != null ? `${s.traceabilityPercent}%` : dash],
                    [t("landing.passport.rating"), s?.rating ? `${s.rating.average.toFixed(1)} ★` : dash],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-2xl bg-white/[0.04] py-3"><div className="text-lg font-light">{v}</div><div className="eyebrow !text-[0.56rem] !tracking-[0.16em]">{k}</div></div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-ink/50"><Wheat className="h-3.5 w-3.5" />{f ? `${f.productName} · ${f.variety}` : t("landing.passport.crops")}{s && !s.rating && <span className="ml-auto">{t("landing.passport.noRatings")}</span>}</div>
              </GlassCard>
            </div>
          </Frame>
        </Reveal>
        <div>
          <Eyebrow>{t("landing.passport.eyebrow")}</Eyebrow>
          <Display lines={[t("landing.passport.line1"), t("landing.passport.line2")]} className="text-[clamp(2.8rem,6.6vw,5.6rem)]" />
          <Reveal delay={0.2}><p className="mt-8 max-w-md text-[17px] font-light leading-relaxed text-ink/60">{t("landing.passport.body")}</p></Reveal>
          <Reveal delay={0.3} className="mt-9 flex flex-wrap gap-3">
            <Magnetic><Link href="/register?role=farmer" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-medium text-neutral-950">{t("landing.passport.join")} <ArrowRight className="h-4 w-4" /></Link></Magnetic>
            {f && <Link href="/marketplace" className="glass inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm">{t("landing.passport.seeProduce")}</Link>}
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

/** 08: real-time intelligence. Every figure is a live database/external-source value with its provenance. */
export function Intelligence({ data, loading }: LandingProps) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const cov = data?.traceabilityCoverage?.percent;
  const m = data?.market;
  const w = data?.featured?.weather;
  const cards: Array<{ k: string; v: string; sub: string; icon: typeof Gauge }> = [
    { k: t("landing.intel.market"), v: m ? t("landing.intel.perKg", { price: m.pricePerKg }) : dash, sub: m ? t("landing.intel.marketSub", { market: m.market, state: m.state, date: fmtDate(m.observationDate), source: m.source }) : t("landing.intel.noMarket"), icon: TrendingUp },
    { k: t("landing.intel.weather"), v: w?.temperatureC != null ? `${Math.round(w.temperatureC)}°C${w.condition ? ` · ${serverText(w.condition)}` : ""}` : dash, sub: w ? t("landing.intel.weatherSub", { ago: timeAgo(w.observationTime) }) : t("landing.intel.noWeather"), icon: Cloud },
    { k: t("landing.intel.inventory"), v: data ? t("landing.intel.kg", { n: data.availableKg.toLocaleString(currentLocale()) }) : dash, sub: t("landing.intel.invSub"), icon: Package },
    { k: t("landing.intel.demand"), v: data ? String(data.ordersLast30Days) : dash, sub: t("landing.intel.demandSub"), icon: Gauge },
    { k: t("landing.intel.traceability"), v: cov != null ? `${cov}%` : dash, sub: data ? t("landing.intel.traceSub", { n: data.traceabilityCoverage.lotsCounted }) : "", icon: ShieldCheck },
    { k: t("landing.intel.risk"), v: data ? `${data.elevatedRiskLots} / ${data.monitoredLots}` : dash, sub: t("landing.intel.riskSub"), icon: Star },
  ];
  const Card = ({ c, i }: { c: (typeof cards)[number]; i: number }) => (
    <Reveal delay={i * 0.08}>
      <GlassCard className="p-5">
        <div className="flex items-center justify-between"><span className="eyebrow">{c.k}</span><c.icon className="h-4 w-4 text-accent/80" strokeWidth={1.5} /></div>
        <div className="mt-3 text-[1.7rem] font-extralight leading-none tracking-tight">{loading ? <span className="inline-block h-7 w-24 animate-pulse rounded bg-white/10" /> : c.v}</div>
        <div className="mt-2.5 text-[11px] leading-snug text-ink/40">{c.sub}</div>
      </GlassCard>
    </Reveal>
  );
  return (
    <Section id="insights">
      <div className="mb-14 text-center">
        <Eyebrow>{t("landing.intel.eyebrow")}</Eyebrow>
        <Display lines={[t("landing.intel.line1"), t("landing.intel.line2")]} className="text-[clamp(2.6rem,6.6vw,5.6rem)]" />
        <Reveal delay={0.2}><p className="mx-auto mt-6 max-w-lg text-[15px] font-light text-ink/55">{t("landing.intel.lead")}</p></Reveal>
      </div>
      <div className="grid items-center gap-4 lg:grid-cols-[1fr_minmax(280px,380px)_1fr] lg:gap-8">
        <div className="order-2 grid gap-4 lg:order-1">{cards.slice(0, 3).map((c, i) => <Card key={c.k} c={c} i={i} />)}</div>
        <Reveal className="order-1 lg:order-2">
          <div className="relative mx-auto aspect-square w-full max-w-[380px]">
            <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" aria-hidden>
              <defs><linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#86d6a0" /><stop offset="1" stopColor="#86d6a0" stopOpacity=".1" /></linearGradient></defs>
              {[190, 150, 110].map((r, i) => (<circle key={r} cx="200" cy="200" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeDasharray={i === 1 ? "2 7" : undefined} />))}
              <motion.circle cx="200" cy="200" r="190" fill="none" stroke="url(#ring)" strokeWidth="2" strokeLinecap="round" transform="rotate(-90 200 200)" pathLength={1} strokeDasharray="1" initial={reduce ? false : { strokeDashoffset: 1 }} whileInView={{ strokeDashoffset: 1 - (cov ?? 0) / 100 }} viewport={{ once: true }} transition={{ duration: 2, ease: "easeOut" }} />
              {!reduce && <g className="origin-center animate-[spin_26s_linear_infinite]" style={{ transformOrigin: "200px 200px" }}><circle cx="200" cy="10" r="3.5" fill="#86d6a0" /><circle cx="200" cy="50" r="2" fill="#86d6a0" opacity=".5" /></g>}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="text-6xl font-extralight tracking-tighter sm:text-7xl">{cov != null ? <CountUp value={cov} suffix="%" /> : dash}</div>
              <div className="eyebrow mt-3">{t("landing.intel.coverage")}</div>
            </div>
          </div>
        </Reveal>
        <div className="order-3 grid gap-4">{cards.slice(3).map((c, i) => <Card key={c.k} c={c} i={i + 3} />)}</div>
      </div>
    </Section>
  );
}

/** 09: discover → verify → buy, with the product passport. */
export function CustomerExperience({ data }: LandingProps) {
  const { t } = useTranslation();
  const f = data?.featured;
  const steps = [["01", t("landing.cust.s1t"), t("landing.cust.s1d")], ["02", t("landing.cust.s2t"), t("landing.cust.s2d")], ["03", t("landing.cust.s3t"), t("landing.cust.s3d")]];
  return (
    <Section id="customers">
      <div className="mb-14 grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-end">
        <div>
          <Eyebrow>{t("landing.cust.eyebrow")}</Eyebrow>
          <Display lines={[t("landing.cust.line1"), t("landing.cust.line2")]} className="text-[clamp(2.8rem,6.6vw,5.6rem)]" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">{steps.map(([n, st, d], i) => (<Reveal key={n} delay={i * 0.1}><GlassCard className="h-full p-5"><div className="font-mono text-xs text-accent">{n}</div><div className="mt-2 text-lg font-light">{st}</div><p className="mt-1.5 text-[12px] leading-relaxed text-ink/50">{d}</p></GlassCard></Reveal>))}</div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Reveal>
          <GlassCard strong className="overflow-hidden !rounded-[32px]">
            <div className="relative aspect-[16/10]"><ProduceTile name={f?.productName ?? "Potato"} seed={f?.lotCode} className="absolute inset-0" />
              {f && <div className="absolute left-4 top-4 rounded-full glass-strong px-3 py-1.5 text-[10px] tracking-[0.2em]">{f.verified ? t("landing.cust.verifiedFarmer") : t("landing.cust.registered")}</div>}
            </div>
            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div><div className="text-3xl font-extralight tracking-tight">{f?.productName ?? "Potato"}</div><div className="text-ink/55">{f?.variety ?? "Kufri Jyoti"}</div></div>
                <div className="text-right"><div className="text-3xl font-extralight">{f?.pricePerUnit != null ? `₹${f.pricePerUnit}` : dash}</div><div className="eyebrow !text-[0.6rem]">{t("landing.cust.perUnit", { unit: unitLabel(f?.unit ?? "kg") })}</div></div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-x-6 text-sm">
                <div className="border-t border-white/[0.07] py-3"><div className="eyebrow !text-[0.58rem]">{t("landing.cust.from")}</div><div className="mt-1 text-[13px]">{f ? (f.verified ? t("landing.cust.fromVerified", { state: f.state ?? "" }) : t("landing.cust.fromPlain", { state: f.state ?? "" })) : dash}</div></div>
                <div className="border-t border-white/[0.07] py-3"><div className="eyebrow !text-[0.58rem]">{t("landing.cust.harvested")}</div><div className="mt-1 text-[13px]">{f?.harvestDate ? timeAgo(`${f.harvestDate}T00:00:00`) : dash}</div></div>
                <div className="border-t border-white/[0.07] py-3"><div className="eyebrow !text-[0.58rem]">{t("landing.cust.traceability")}</div><div className="mt-1 text-[13px]">{f?.farmerStats.traceabilityPercent != null ? `${f.farmerStats.traceabilityPercent}%` : dash}</div></div>
                <div className="border-t border-white/[0.07] py-3"><div className="eyebrow !text-[0.58rem]">{t("landing.cust.grade")}</div><div className="mt-1 text-[13px]">{f?.qualityGrade ? t("landing.cust.gradeValue", { g: f.qualityGrade }) : dash}</div></div>
              </div>
              <div className="mt-4 flex gap-3">
                <Link href={f ? `/trace/${f.publicToken}` : "/scan"} className="glass flex-1 rounded-full py-3 text-center text-sm hover:bg-white/10">{t("landing.cust.viewJourney")}</Link>
                <Link href={f ? `/marketplace/${f.lotId}` : "/marketplace"} className="flex-1 rounded-full bg-white py-3 text-center text-sm font-medium text-neutral-950">{t("landing.cust.buyNow")}</Link>
              </div>
            </div>
          </GlassCard>
        </Reveal>
        <Reveal delay={0.15}>
          <GlassCard className="h-full p-6 sm:p-9">
            <div className="mb-1 flex items-center gap-2 text-accent"><ShieldCheck className="h-5 w-5" strokeWidth={1.4} /><span className="eyebrow !text-accent">{t("landing.cust.passport")}</span></div>
            <div className="mb-6 mt-2 text-3xl font-extralight tracking-tight">{f ? `${f.productName} · ${f.variety}` : t("landing.cust.identity")}</div>
            <Row k={t("landing.cust.lot")} v={f?.lotCode ?? dash} /><Row k={t("landing.cust.origin")} v={f?.origin ?? dash} /><Row k={t("landing.cust.harvest")} v={fmtDate(f?.harvestDate)} /><Row k={t("landing.cust.quality")} v={f?.qualityGrade ? t("landing.cust.gradeCaps", { g: f.qualityGrade }) : dash} /><Row k={t("landing.cust.status")} v={f ? enumLabel("lotStatus", f.status) : dash} accent />
            <div className="mt-6"><div className="eyebrow mb-3">{t("landing.cust.history")}</div>
              {f ? (<ol className="space-y-3">{f.timeline.slice(-5).map((e, i) => (<li key={`${e.eventType}${i}`} className="flex items-center gap-3 text-[13px] text-ink/75"><span className="h-1.5 w-1.5 rounded-full bg-accent" /><span className="flex-1">{enumLabel("event", e.eventType)}</span><span className="font-mono text-[11px] text-ink/35">{fmtDate(e.eventTime)}</span></li>))}</ol>) : <p className="text-sm text-ink/40">{t("landing.cust.historyEmpty")}</p>}
            </div>
          </GlassCard>
        </Reveal>
      </div>
    </Section>
  );
}

export function Closing() {
  const { t } = useTranslation();
  return (
    <>
      <section className="px-3 pb-6 pt-10 sm:px-6">
        <Reveal y={50}>
          <Frame src="/media/farmer.webp" art={<FieldScene />} ratio="aspect-[4/5] sm:aspect-[16/8]" scrim position="30% 60%" className="mx-auto max-w-[1320px] !rounded-[36px] sm:!rounded-[48px]">
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
              <Display lines={[t("landing.closing.line1"), t("landing.closing.line2")]} className="text-[clamp(3rem,9vw,8rem)]" />
              <Reveal delay={0.3} className="mt-10 flex flex-wrap justify-center gap-3">
                <Magnetic><Link href="/marketplace" className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-medium text-neutral-950 transition-shadow hover:shadow-[0_0_50px_-8px_rgba(255,255,255,0.6)]">{t("landing.closing.explore")} <ArrowRight className="h-4 w-4" /></Link></Magnetic>
                <Link href="/register" className="glass inline-flex items-center rounded-full px-8 py-4 text-sm">{t("landing.closing.create")}</Link>
              </Reveal>
            </div>
          </Frame>
        </Reveal>
      </section>
      <footer className="mx-auto max-w-[1280px] px-6 py-14">
        <div className="hairline mb-10" />
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <Logo />
          <nav aria-label={t("landing.closing.footerNav")} className="flex flex-wrap gap-x-7 gap-y-2 text-[13px] text-ink/50">
            <Link href="/marketplace" className="hover:text-ink">{t("landing.closing.marketplace")}</Link><Link href="/scan" className="hover:text-ink">{t("landing.closing.scan")}</Link><Link href="/how-it-works" className="hover:text-ink">{t("landing.closing.how")}</Link><Link href="/register?role=farmer" className="hover:text-ink">{t("landing.closing.farmers")}</Link><Link href="/login" className="hover:text-ink">{t("landing.closing.signIn")}</Link>
          </nav>
        </div>
        <p className="mt-8 max-w-2xl text-[11px] leading-relaxed text-ink/30">{t("landing.closing.disclaimer")}</p>
      </footer>
    </>
  );
}
