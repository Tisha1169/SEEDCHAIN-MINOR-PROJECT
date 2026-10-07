import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

/** Section/text reveal: opacity + translate + blur → sharp. Static when the user prefers reduced motion. */
export function Reveal({ children, delay = 0, y = 28, className = "", as = "div", once = true, blur = true }: { children: ReactNode; delay?: number; y?: number; className?: string; as?: "div" | "span" | "li" | "section" | "p" | "h1" | "h2" | "h3"; once?: boolean; blur?: boolean }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] as ElementType;
  if (reduce) return <Tag className={className}>{children}</Tag>;
  return (
    <Tag
      className={className}
      initial={blur ? { opacity: 0, y, filter: "blur(10px)" } : { opacity: 0, y }}
      whileInView={blur ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 1, y: 0 }}
      viewport={{ once, margin: "-12% 0px -8% 0px" }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Tag>
  );
}

/** Animates a number from 0 when it scrolls into view. */
export function CountUp({ value, decimals = 0, prefix = "", suffix = "", className = "" }: { value: number; decimals?: number; prefix?: string; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) return setN(value);
    if (!inView) return;
    const c = animate(0, value, { duration: 1.6, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setN(v) });
    return () => c.stop();
  }, [inView, value, reduce]);
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

/** Glass surface whose highlight follows the cursor. */
export function GlassCard({ children, className = "", strong = false, style, lift = true }: { children: ReactNode; className?: string; strong?: boolean; style?: CSSProperties; lift?: boolean }) {
  return (
    <div
      className={`${strong ? "glass-strong" : "glass"} glass-spot ${lift ? "lift" : ""} rounded-[28px] ${className}`}
      style={style}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
    >
      {children}
    </div>
  );
}

/** Subtle magnetic pull for primary calls to action. */
export function Magnetic({ children, strength = 0.18, className = "" }: { children: ReactNode; strength?: number; className?: string }) {
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 });
  if (reduce) return <span className={`inline-block ${className}`}>{children}</span>;
  return (
    <motion.span
      className={`inline-block ${className}`}
      style={{ x, y }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.span>
  );
}
