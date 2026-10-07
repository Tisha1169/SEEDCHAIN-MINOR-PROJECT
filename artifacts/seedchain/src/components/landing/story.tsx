import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { ArrowRight, Check, Circle, Sprout, Store, User, Wheat } from "lucide-react";
import { Frame, FieldScene, PotatoScene } from "@/components/art";
import { GlassCard, Reveal } from "@/components/motion";
import { enumLabel } from "@/lib/format";
import { dash, Display, Eyebrow, fmtDate, Row, Section, type LandingProps } from "./shared";

/** 03: one lot, one identity. */
export function Identity({ data, loading }: LandingProps) {
  const { t } = useTranslation();
  const f = data?.featured;
  return (
    <Section id="platform">
      <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-24">
        <Reveal y={50}>
          <Frame src="/media/potato.webp" alt={t("landing.identity.alt")} art={<PotatoScene seed={3} />} ratio="aspect-[4/5]">
            <div className="absolute left-5 top-5 z-10 glass-strong rounded-full px-4 py-2 text-[11px] tracking-[0.18em] text-ink/80">{f ? `${f.productName.toUpperCase()} · ${f.variety.toUpperCase()}` : t("landing.identity.potato")}</div>
          </Frame>
        </Reveal>
        <div>
          <Eyebrow>{t("landing.identity.eyebrow")}</Eyebrow>
          <Display lines={[t("landing.identity.line1"), t("landing.identity.line2")]} className="text-[clamp(2.8rem,7vw,6rem)]" />
          <Reveal delay={0.2}>
            <p className="mt-8 max-w-md text-[17px] font-light leading-relaxed text-ink/60">{t("landing.identity.body")}</p>
          </Reveal>
          <Reveal delay={0.3} className="mt-10">
            <GlassCard strong className="p-6 sm:p-8">
              <div className="mb-2 flex items-center justify-between">
                <span className="eyebrow">{t("landing.identity.passport")}</span>
                <span className="flex items-center gap-2 text-[11px] tracking-[0.18em] text-accent"><span className="animate-pulse-ring h-2 w-2 rounded-full bg-accent" />{f ? t("landing.identity.qrActive") : t("landing.identity.awaiting")}</span>
              </div>
              <Row k={t("landing.identity.lot")} v={f?.lotCode ?? dash} />
              <Row k={t("landing.identity.farm")} v={f ? `${f.farmName}${f.state ? `, ${f.state}` : ""}` : dash} />
              <Row k={t("landing.identity.harvest")} v={fmtDate(f?.harvestDate)} />
              <Row k={t("landing.identity.status")} v={f ? (f.verified ? t("landing.identity.verified") : t("landing.identity.registered")) : dash} accent={!!f?.verified} />
              {!f && !loading && <p className="mt-4 text-xs leading-relaxed text-ink/40">{t("landing.identity.empty")}</p>}
            </GlassCard>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

/** 04: QR → phone → live record. The QR is real and scannable. */
export function QrScene({ data }: LandingProps) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const f = data?.featured;
  const url = typeof window === "undefined" ? "" : f ? `${window.location.origin}/trace/${f.publicToken}` : `${window.location.origin}/scan`;
  const has = (type: string) => !!f?.timeline.some((e) => e.eventType === type);
  const checks: Array<[string, boolean]> = [
    [t("landing.qr.c1"), !!f?.verified],
    [t("landing.qr.c2"), has("HARVEST_RECORDED")],
    [t("landing.qr.c3"), has("QUALITY_RECORDED") || !!f?.qualityGrade],
    [t("landing.qr.c4"), !!f],
    [t("landing.qr.c5"), !!f],
  ];
  return (
    <Section className="!py-20 sm:!py-32">
      <div className="mb-14 grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div>
          <Eyebrow>{t("landing.qr.eyebrow")}</Eyebrow>
          <Display lines={[t("landing.qr.line1"), t("landing.qr.line2")]} className="text-[clamp(2.6rem,6.6vw,5.6rem)]" />
        </div>
        <Reveal delay={0.2}>
          <GlassCard className="p-6">
            <ul className="space-y-3.5">
              {checks.map(([label, ok], i) => (
                <motion.li key={label} initial={reduce ? false : { opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.25 + i * 0.12 }} className={`flex items-center gap-3 text-[15px] ${ok ? "text-ink" : "text-ink/35"}`}>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${ok ? "border-accent/50 bg-accent/15 text-accent" : "border-white/10"}`}>{ok ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2 w-2" />}</span>
                  {label}
                </motion.li>
              ))}
            </ul>
            {!f && <p className="mt-4 text-xs text-ink/40">{t("landing.qr.ticks")}</p>}
          </GlassCard>
        </Reveal>
      </div>

      <Reveal y={60}>
        <Frame src="/media/potato.webp" art={<FieldScene />} ratio="aspect-auto sm:aspect-[16/8]" scrim>
          <div className="relative z-10 flex flex-col items-center justify-center gap-10 px-6 py-14 sm:absolute sm:inset-0 sm:flex-row sm:gap-0 sm:p-12 lg:justify-around">
            {/* physical label (real QR) */}
            <motion.div initial={reduce ? false : { opacity: 0, y: 40, rotate: -4 }} whileInView={{ opacity: 1, y: 0, rotate: -3 }} viewport={{ once: true }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} className="relative w-[230px] shrink-0 rounded-[20px] bg-[#f4f2ea] p-5 text-neutral-900 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] sm:w-[260px]">
              <div className="mb-3 text-center text-[13px] font-semibold tracking-[0.3em]">SEEDCHAIN</div>
              <div className="relative">
                {url && <QRCodeSVG value={url} level="Q" marginSize={2} className="h-auto w-full" bgColor="#f4f2ea" fgColor="#0a0a0a" aria-label={t("landing.qr.aria")} />}
                <span aria-hidden className="scan-beam" />
              </div>
              <div className="mt-3 text-center font-mono text-[12px] font-semibold">{f?.lotCode ?? t("landing.qr.tryScanner")}</div>
              <div className="text-center text-[10px] tracking-wide text-neutral-600">{t("landing.qr.labelFooter")}</div>
            </motion.div>

            {/* glowing connection */}
            <svg aria-hidden className="hidden h-24 w-40 shrink-0 sm:block lg:w-56" viewBox="0 0 220 90" fill="none">
              <motion.path d="M4 45 C 60 4, 150 86, 216 45" stroke="url(#qrg)" strokeWidth="1.6" strokeLinecap="round" initial={reduce ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.6, delay: 0.5 }} />
              <circle r="4" fill="#86d6a0"><animateMotion dur="3s" repeatCount="indefinite" path="M4 45 C 60 4, 150 86, 216 45" /></circle>
              <defs><linearGradient id="qrg" x1="0" x2="1"><stop stopColor="#86d6a0" stopOpacity="0" /><stop offset=".5" stopColor="#86d6a0" /><stop offset="1" stopColor="#86d6a0" stopOpacity=".2" /></linearGradient></defs>
            </svg>

            {/* phone showing the live public record */}
            <motion.div initial={reduce ? false : { opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.25, ease: [0.22, 1, 0.36, 1] }} className="relative w-[250px] shrink-0 rounded-[2.6rem] border border-white/15 bg-black/80 p-2.5 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:w-[270px]">
              <div className="rounded-[2.1rem] bg-gradient-to-b from-[#0e2b1b] to-[#050c08] p-4 pt-8">
                <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-white/15" />
                <div className="rounded-2xl bg-accent/15 p-3 ring-1 ring-accent/30">
                  <div className="text-[9px] tracking-[0.25em] text-accent">{t("landing.qr.verified")}</div>
                  <div className="font-mono text-[13px]">{f?.lotCode ?? t("landing.qr.liveRecord")}</div>
                </div>
                <div className="mt-3 text-xl font-light">{f?.productName ?? "Potato"}</div>
                <div className="text-xs text-ink/55">{f ? `${f.variety} · ${f.farmerPublicName}` : t("landing.qr.opens")}</div>
                <div className="mt-4 space-y-2.5">
                  {(f?.timeline.slice(-3).map((e) => ({ key: e.eventType + e.eventTime, label: enumLabel("event", e.eventType) })) ?? [{ key: "a", label: t("landing.qr.s1") }, { key: "b", label: t("landing.qr.s2") }, { key: "c", label: t("landing.qr.s3") }]).map((e) => (
                    <div key={e.key} className="flex items-center gap-2 text-[11px] text-ink/70"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{e.label}</div>
                  ))}
                </div>
                <div className="mt-5 rounded-full border border-white/10 py-2 text-center text-[10px] tracking-[0.2em] text-ink/50">{t("landing.qr.fromDb")}</div>
              </div>
            </motion.div>
          </div>
        </Frame>
      </Reveal>

      <Reveal className="mt-8 text-center">
        <Link href={f ? `/trace/${f.publicToken}` : "/scan"} className="inline-flex items-center gap-2 text-sm text-ink/70 transition-colors hover:text-ink">{f ? t("landing.qr.openTrace") : t("landing.qr.openScanner")} <ArrowRight className="h-4 w-4" /></Link>
      </Reveal>
    </Section>
  );
}

const STEPS: Array<{ label: string; types: string[]; icon: typeof Sprout }> = [
  { label: "farm", types: ["LOT_CREATED"], icon: Sprout },
  { label: "harvest", types: ["HARVEST_RECORDED"], icon: Wheat },
  { label: "quality", types: ["QUALITY_RECORDED"], icon: Check },
  { label: "qr", types: ["QR_GENERATED"], icon: Circle },
  { label: "order", types: ["ORDER_CREATED"], icon: Store },
  { label: "delivery", types: ["ORDER_DISPATCHED", "DELIVERY_COMPLETED", "CUSTOMER_PICKUP"], icon: ArrowRight },
  { label: "customer", types: ["CUSTOMER_RECEIVED"], icon: User },
];

/** 05: the journey as glowing nodes that light up in sequence. Lit state comes from the featured lot's real events. */
export function Journey({ data }: LandingProps) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const f = data?.featured;
  return (
    <Section id="journey" className="!py-20 sm:!py-32">
      <div className="mb-16 text-center">
        <Eyebrow>{t("landing.journey.eyebrow")}</Eyebrow>
        <Display lines={[t("landing.journey.line1"), t("landing.journey.line2")]} className="text-[clamp(2.6rem,6.6vw,5.6rem)]" />
        <Reveal delay={0.2}><p className="mx-auto mt-6 max-w-md text-[15px] font-light text-ink/55">{f ? t("landing.journey.liveFrom", { code: f.lotCode }) : t("landing.journey.generic")}</p></Reveal>
      </div>
      <div className="relative">
        <div aria-hidden className="absolute left-[7%] right-[7%] top-[34px] hidden h-px bg-white/10 lg:block">
          <motion.div className="h-full origin-left bg-gradient-to-r from-accent/0 via-accent to-accent/60" initial={reduce ? false : { scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true, margin: "-20%" }} transition={{ duration: 2.2, ease: "easeInOut" }} />
        </div>
        <ol className="grid gap-4 lg:grid-cols-7">
          {STEPS.map((s, i) => {
            const ev = f?.timeline.find((e) => s.types.includes(e.eventType));
            const lit = !!ev;
            return (
              <motion.li key={s.label} initial={reduce ? false : { opacity: 0, y: 30, filter: "blur(8px)" }} whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }} viewport={{ once: true, margin: "-10%" }} transition={{ duration: 0.8, delay: i * 0.13 }} className="flex items-center gap-4 lg:flex-col lg:gap-5 lg:text-center">
                <span className={`relative z-10 flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full border backdrop-blur-xl ${lit ? "border-accent/60 bg-accent/15 text-accent shadow-[0_0_40px_-6px_rgba(134,214,160,0.55)]" : "border-white/10 bg-white/[0.03] text-ink/30"}`}>
                  <s.icon className="h-6 w-6" strokeWidth={1.4} />
                  {lit && <span className="animate-pulse-ring absolute inset-0 rounded-full" style={{ animationDelay: `${i * 0.3}s` }} />}
                </span>
                <div>
                  <div className={`text-[15px] tracking-wide ${lit ? "text-ink" : "text-ink/40"}`}>{t(`landing.journey.${s.label}`)}</div>
                  <div className="mt-1 font-mono text-[11px] text-ink/40">{ev ? fmtDate(ev.eventTime) : dash}</div>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </Section>
  );
}

/** 06: the business model, drawn. No intermediaries. */
export function Direct() {
  const { t } = useTranslation();
  const node = (icon: React.ReactNode, title: string, text: string, strong = false) => (
    <GlassCard strong={strong} className="flex-1 p-7 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-accent">{icon}</div>
      <div className="eyebrow !text-ink">{title}</div>
      <p className="mt-3 text-[13px] leading-relaxed text-ink/55">{text}</p>
    </GlassCard>
  );
  return (
    <Section className="!py-20 sm:!py-32">
      <div className="mb-16 text-center">
        <Eyebrow>{t("landing.direct.eyebrow")}</Eyebrow>
        <Display lines={[t("landing.direct.line1"), t("landing.direct.line2")]} className="text-[clamp(2.6rem,6.6vw,5.6rem)]" />
      </div>
      <Reveal>
        <div className="flex flex-col items-stretch gap-0 lg:flex-row lg:items-center">
          {node(<Sprout className="h-6 w-6" strokeWidth={1.4} />, t("landing.direct.farmer"), t("landing.direct.farmerText"))}
          <div className="relative flex h-16 items-center justify-center lg:h-auto lg:w-28"><div className="h-full w-px bg-gradient-to-b from-accent/0 via-accent/70 to-accent/0 lg:h-px lg:w-full lg:bg-gradient-to-r" /><span className="animate-float absolute h-2 w-2 rounded-full bg-accent shadow-[0_0_14px_3px_rgba(134,214,160,0.7)]" /></div>
          {node(<span className="text-lg font-light tracking-widest">SC</span>, t("landing.direct.seedchain"), t("landing.direct.seedchainText"), true)}
          <div className="relative flex h-16 items-center justify-center lg:h-auto lg:w-28"><div className="h-full w-px bg-gradient-to-b from-accent/0 via-accent/70 to-accent/0 lg:h-px lg:w-full lg:bg-gradient-to-r" /><span className="animate-float absolute h-2 w-2 rounded-full bg-accent shadow-[0_0_14px_3px_rgba(134,214,160,0.7)] [animation-delay:-3s]" /></div>
          {node(<User className="h-6 w-6" strokeWidth={1.4} />, t("landing.direct.customer"), t("landing.direct.customerText"))}
        </div>
      </Reveal>
    </Section>
  );
}
