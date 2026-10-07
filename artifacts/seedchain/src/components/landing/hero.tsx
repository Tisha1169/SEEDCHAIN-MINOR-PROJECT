import { useRef } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ScanLine } from "lucide-react";
import { Magnetic, CountUp, GlassCard } from "@/components/motion";
import { Frame, PotatoScene } from "@/components/art";
import { dash, type LandingProps } from "./shared";

/** 01: typography only. Fades, rises and softly blurs away as the next scene arrives. */
export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "-16%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.62], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);
  const filter = useTransform(scrollYProgress, [0, 0.7], ["blur(0px)", "blur(12px)"]);
  const lineIn = (i: number) => (reduce ? {} : { initial: { y: "110%" }, animate: { y: "0%" }, transition: { duration: 1.25, delay: 0.25 + i * 0.16, ease: [0.22, 1, 0.36, 1] as const } });

  return (
    <section ref={ref} className="relative h-[150svh]" aria-label="SeedChain">
      <div className="sticky top-0 flex h-[100svh] flex-col items-center justify-center overflow-hidden px-5 text-center">
        {/* atmosphere: slow drifting glows + faint orbit lines, no imagery */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="animate-drift absolute -left-[12%] top-[8%] h-[62vmin] w-[62vmin] rounded-full bg-[radial-gradient(circle,rgba(70,160,100,0.30),transparent_65%)] blur-3xl" />
          <div className="animate-drift absolute -right-[10%] bottom-[2%] h-[56vmin] w-[56vmin] rounded-full bg-[radial-gradient(circle,rgba(40,110,70,0.30),transparent_65%)] blur-3xl [animation-delay:-9s]" />
          <svg className="absolute left-1/2 top-1/2 h-[135vmin] w-[135vmin] -translate-x-1/2 -translate-y-1/2 opacity-[0.16]" viewBox="0 0 800 800" fill="none">
            {[160, 250, 340, 430].map((r, i) => (<circle key={r} cx="400" cy="400" r={r} stroke="url(#orbit)" strokeWidth="1" strokeDasharray={i % 2 ? "2 10" : undefined} />))}
            <defs><linearGradient id="orbit" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#bfe9c8" /><stop offset="1" stopColor="#bfe9c8" stopOpacity="0" /></linearGradient></defs>
          </svg>
          <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_45%,transparent_40%,rgba(0,0,0,0.65)_100%)]" />
        </div>

        <motion.div style={reduce ? undefined : { y, opacity, scale, filter }} className="relative z-10 flex flex-col items-center will-change-transform">
          <div className="eyebrow mb-8 sm:mb-10"><motion.span initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 1.2 }}>Digital identity for every harvest</motion.span></div>
          <h1 className="text-[clamp(3.1rem,12.6vw,11.5rem)] font-extralight leading-[0.9] tracking-[-0.05em]">
            <span className="block overflow-hidden pb-[0.14em] -mb-[0.06em]"><motion.span className="block" {...lineIn(0)}>Every harvest</motion.span></span>
            <span className="block overflow-hidden pb-[0.26em] -mb-[0.14em]"><motion.span className="text-gradient block pb-[0.02em]" {...lineIn(1)}>has a story.</motion.span></span>
          </h1>
          <motion.p initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.15, duration: 1 }} className="mt-9 max-w-[34rem] text-balance text-[15px] font-light leading-relaxed text-ink/60 sm:mt-11 sm:text-lg">
            SeedChain gives every agricultural lot a digital identity, from farm to customer.
          </motion.p>
          <motion.div initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.35, duration: 1 }} className="mt-9 flex flex-wrap items-center justify-center gap-3 sm:mt-11">
            <Magnetic><Link href="/marketplace" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-medium text-neutral-950 transition-shadow hover:shadow-[0_0_44px_-8px_rgba(255,255,255,0.6)]">Explore SeedChain <ArrowRight className="h-4 w-4" /></Link></Magnetic>
            <Magnetic><Link href="/scan" className="glass inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm text-ink transition-colors hover:bg-white/10"><ScanLine className="h-4 w-4" />Scan a product</Link></Magnetic>
          </motion.div>
        </motion.div>

        <div className="absolute bottom-7 left-6 hidden text-left sm:block eyebrow !leading-6">Traceable<br />Transparent<br />Direct</div>
        <div className="absolute bottom-7 right-6 hidden text-right sm:block eyebrow !leading-6">Farm → Lot → QR<br />→ Customer</div>
        <motion.div aria-hidden style={reduce ? undefined : { opacity }} className="absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3">
          <span className="eyebrow !text-[0.6rem]">Scroll to explore</span>
          <span className="relative h-10 w-px overflow-hidden bg-white/15"><span className="absolute inset-x-0 top-0 h-4 animate-[scan-beam_2.2s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-white to-transparent" /></span>
        </motion.div>
      </div>
    </section>
  );
}

function FloatChip({ label, value, className, delay = 0, live = false }: { label: string; value: string; className: string; delay?: number; live?: boolean }) {
  return (
    <div className={`absolute z-10 ${className}`}>
      <div className="animate-float" style={{ animationDelay: `${delay}s` }}>
        <GlassCard strong className="!rounded-2xl px-4 py-3" lift={false}>
          <div className="eyebrow !text-[0.58rem] !tracking-[0.2em]">{label}</div>
          <div className="mt-1 flex items-center gap-2 text-sm font-medium tracking-wide text-ink">
            {live && <span className="animate-pulse-ring h-2 w-2 rounded-full bg-accent" />}
            {value}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

/** 02: the first cinematic frame, scaled/revealed by scroll. Real figures sit beneath it. */
export function CinematicFrame({ data, loading, failed }: LandingProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 95%", "start 25%"] });
  const scale = useTransform(scrollYProgress, [0, 1], [0.86, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [0.15, 1]);
  const f = data?.featured;
  const cov = data?.traceabilityCoverage?.percent;
  const stats: Array<[string, number | null, string]> = [
    ["Verified farmers", data?.verifiedFarmers ?? null, ""],
    ["Lots on sale", data?.listedLots ?? null, ""],
    ["Verified scans", data?.qrScans ?? null, ""],
    ["Traceability coverage", cov ?? null, "%"],
  ];

  return (
    <section id="story" className="relative -mt-[34svh] px-3 sm:px-6">
      <motion.div ref={ref} style={reduce ? undefined : { scale, opacity }} className="mx-auto max-w-[1320px] will-change-transform">
        <Frame src="/media/harvest.webp" alt="Harvested potatoes" art={<PotatoScene seed={11} />} ratio="aspect-[4/5] sm:aspect-[16/9]" className="!rounded-[36px] sm:!rounded-[48px]">
          <FloatChip label="Lot" value={f ? `${f.lotCode} · VERIFIED` : "LOT VERIFIED"} className="left-4 top-5 sm:left-10 sm:top-10" live={!!f} />
          <FloatChip label="QR" value="ACTIVE" className="right-4 top-14 sm:right-12 sm:top-24" delay={1.4} live />
          <FloatChip label="Traceability" value={cov != null ? `${cov}%` : dash} className="bottom-24 left-4 sm:bottom-32 sm:left-16" delay={2.2} />
          <FloatChip label="Route" value="FARM → CUSTOMER" className="bottom-24 right-4 sm:bottom-28 sm:right-14" delay={0.7} />
          <div className="absolute inset-x-0 bottom-6 z-10 px-6 text-center sm:bottom-10">
            <div className="eyebrow">{f ? `${f.productName} · ${f.variety}` : "Harvest"}</div>
            <div className="mt-2 text-2xl font-extralight tracking-tight text-ink sm:text-4xl">From soil to table, on the record.</div>
          </div>
        </Frame>
      </motion.div>

      <div className="mx-auto mt-6 grid max-w-[1320px] grid-cols-2 gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-4">
        {stats.map(([label, v, suffix]) => (
          <GlassCard key={label} className="p-5 sm:p-7">
            <div className="text-4xl font-extralight tracking-tight sm:text-5xl">
              {loading ? <span className="inline-block h-9 w-16 animate-pulse rounded-lg bg-white/10" /> : v == null ? dash : <CountUp value={v} suffix={suffix} />}
            </div>
            <div className="eyebrow mt-3 !tracking-[0.16em]">{label}</div>
          </GlassCard>
        ))}
      </div>
      <p className="mt-4 text-center text-[11px] tracking-wide text-ink/35">{failed ? "Live figures are temporarily unavailable." : "Figures are live from the SeedChain database."}</p>
    </section>
  );
}
