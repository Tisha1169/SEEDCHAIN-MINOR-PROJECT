import type { ReactNode } from "react";
import type { PublicOverview } from "@workspace/api-client-react";
import { Reveal } from "@/components/motion";

export type Featured = NonNullable<PublicOverview["featured"]>;
export interface LandingProps {
  data?: PublicOverview;
  loading: boolean;
  failed: boolean;
}

export const dash = "—";

/** Big editorial heading with a masked line-by-line reveal. */
export function Display({ lines, className = "", gradientLast = true }: { lines: string[]; className?: string; gradientLast?: boolean }) {
  return (
    <h2 className={`font-extralight leading-[0.98] tracking-[-0.04em] ${className}`}>
      {lines.map((l, i) => (
        <Reveal key={l} as="span" delay={i * 0.12} y={36} className={`block ${gradientLast && i === lines.length - 1 ? "text-gradient" : ""}`}>
          {l}
        </Reveal>
      ))}
    </h2>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Reveal>
      <div className="eyebrow mb-5 flex items-center gap-3">
        <span className="h-px w-8 bg-white/25" />
        {children}
      </div>
    </Reveal>
  );
}

export function Section({ id, children, className = "" }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`relative mx-auto w-full max-w-[1280px] scroll-mt-24 px-4 py-24 sm:px-8 sm:py-36 ${className}`}>
      {children}
    </section>
  );
}

export function Row({ k, v, accent = false }: { k: string; v: ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-white/[0.07] py-3.5 last:border-0">
      <span className="eyebrow !tracking-[0.18em]">{k}</span>
      <span className={`text-right font-mono text-[13px] tracking-wide ${accent ? "text-accent" : "text-ink"}`}>{v}</span>
    </div>
  );
}

export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }).toUpperCase() : dash;
