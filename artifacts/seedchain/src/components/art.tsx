import { useId, useRef, useState, type ReactNode } from "react";
import i18n from "@/i18n";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/* ---------------------------------------------------------------------------
   Procedural cinematic artwork.
   SeedChain has no stock-photo licence, so every "image frame" renders vector
   art by default. Drop real photography into /public/media (see README there)
   and <Frame src="/media/…"> shows it over the art with no code change.
   --------------------------------------------------------------------------- */

function prng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Smooth organic closed path around an ellipse (Catmull-Rom → Bézier). */
function blob(cx: number, cy: number, rx: number, ry: number, rnd: () => number, wobble = 0.1): string {
  const n = 9;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (rnd() - 0.5) * 2 * wobble;
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k] as const;
  });
  const p = (i: number) => pts[(i + n) % n];
  let d = `M ${p(0)[0].toFixed(1)} ${p(0)[1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + " Z";
}

const POTATOES: Array<[number, number, number, number, number]> = [
  [405, 372, 128, 84, -8], [262, 392, 104, 70, 12], [545, 392, 108, 72, -14], [175, 430, 86, 56, 6],
  [640, 430, 84, 56, -4], [345, 440, 96, 62, 9], [478, 446, 92, 60, -10], [400, 300, 100, 66, 4],
];

export function PotatoScene({ seed = 7, glow = true, className = "" }: { seed?: number; glow?: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  const rnd = prng(seed);
  const potatoes = POTATOES.map(([cx, cy, rx, ry, rot]) => ({ d: blob(cx, cy, rx, ry, rnd), rot, cx, cy, rx, ry }));
  const leaves = Array.from({ length: 7 }, (_, i) => {
    const x = 130 + i * 95 + rnd() * 30;
    const h = 150 + rnd() * 120;
    const lean = (rnd() - 0.5) * 120;
    return { x, h, lean, w: 46 + rnd() * 26 };
  });
  return (
    <svg viewBox="0 0 800 520" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label={i18n.t("misc.artPotatoes")}>
      <defs>
        <radialGradient id={`${id}bg`} cx="50%" cy="38%" r="75%"><stop offset="0%" stopColor="#12351f" /><stop offset="55%" stopColor="#08170f" /><stop offset="100%" stopColor="#030705" /></radialGradient>
        <radialGradient id={`${id}rim`} cx="50%" cy="20%" r="60%"><stop offset="0%" stopColor="#bfe9c8" stopOpacity="0.28" /><stop offset="100%" stopColor="#bfe9c8" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${id}pot`} cx="38%" cy="28%" r="80%"><stop offset="0%" stopColor="#e6c58a" /><stop offset="45%" stopColor="#b3844a" /><stop offset="100%" stopColor="#4a2f17" /></radialGradient>
        <linearGradient id={`${id}soil`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a120b" /><stop offset="100%" stopColor="#050403" /></linearGradient>
        <linearGradient id={`${id}leaf`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#4f9b62" /><stop offset="100%" stopColor="#0f3a22" /></linearGradient>
        <filter id={`${id}blur`}><feGaussianBlur stdDeviation="14" /></filter>
      </defs>
      <rect width="800" height="520" fill={`url(#${id}bg)`} />
      {glow && <ellipse cx="400" cy="120" rx="360" ry="170" fill={`url(#${id}rim)`} className="animate-drift" />}
      {leaves.map((l, i) => (
        <g key={i} opacity={0.55 + (i % 3) * 0.14} filter={i % 2 ? `url(#${id}blur)` : undefined}>
          <path d={`M ${l.x} 420 Q ${l.x + l.lean / 2} ${420 - l.h / 2} ${l.x + l.lean} ${420 - l.h} Q ${l.x + l.lean + l.w} ${420 - l.h / 2} ${l.x} 420 Z`} fill={`url(#${id}leaf)`} />
          <path d={`M ${l.x} 420 Q ${l.x + l.lean / 2} ${420 - l.h / 2} ${l.x + l.lean} ${420 - l.h}`} stroke="#a8e0b6" strokeOpacity="0.35" strokeWidth="1.4" fill="none" />
        </g>
      ))}
      <path d="M0 400 Q 200 360 400 380 T 800 372 V520 H0 Z" fill={`url(#${id}soil)`} />
      {potatoes.map((p, i) => (
        <g key={i} transform={`rotate(${p.rot} ${p.cx} ${p.cy})`}>
          <ellipse cx={p.cx + 8} cy={p.cy + p.ry * 0.82} rx={p.rx * 0.95} ry={p.ry * 0.22} fill="#000" opacity="0.5" />
          <path d={p.d} fill={`url(#${id}pot)`} />
          <ellipse cx={p.cx - p.rx * 0.3} cy={p.cy - p.ry * 0.42} rx={p.rx * 0.34} ry={p.ry * 0.14} fill="#fff" opacity="0.16" transform={`rotate(-18 ${p.cx} ${p.cy})`} />
          {Array.from({ length: 4 }, (_, k) => (
            <circle key={k} cx={p.cx + (rnd() - 0.5) * p.rx * 1.2} cy={p.cy + (rnd() - 0.5) * p.ry * 1.1} r={1.8 + rnd() * 2.6} fill="#3b2412" opacity="0.5" />
          ))}
        </g>
      ))}
      
    </svg>
  );
}

/** Receding furrows under a low sun: farm / farmer sections. */
export function FieldScene({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const rows = Array.from({ length: 15 }, (_, i) => i - 7);
  return (
    <svg viewBox="0 0 800 520" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label={i18n.t("misc.artRows")}>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0a1c12" /><stop offset="50%" stopColor="#1d5233" /><stop offset="100%" stopColor="#4c9a6a" /></linearGradient>
        <radialGradient id={`${id}sun`} cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#f3f6c8" stopOpacity="0.95" /><stop offset="35%" stopColor="#bfe9a8" stopOpacity="0.35" /><stop offset="100%" stopColor="#bfe9a8" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}ground`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1f5636" /><stop offset="100%" stopColor="#030604" /></linearGradient>
      </defs>
      <rect width="800" height="520" fill={`url(#${id}sky)`} />
      <circle cx="400" cy="250" r="260" fill={`url(#${id}sun)`} className="animate-drift" />
      <path d="M0 262 Q 130 236 260 258 T 520 252 T 800 258 V520 H0 Z" fill={`url(#${id}ground)`} />
      {rows.map((r) => (
        <path key={r} d={`M ${400 + r * 6} 258 L ${400 + r * 118} 520`} stroke="#9ad6ae" strokeOpacity={0.18 + (1 - Math.abs(r) / 8) * 0.3} strokeWidth={1 + (1 - Math.abs(r) / 8) * 2} />
      ))}
      {[290, 320, 365, 430, 520].map((y, i) => (
        <path key={y} d={`M0 ${y} Q 400 ${y - 10 - i * 2} 800 ${y}`} stroke="#000" strokeOpacity="0.35" strokeWidth={1 + i} fill="none" />
      ))}
    </svg>
  );
}

/**
 * Frame: rounded cinematic panel. A real photo (if present in /public/media) is layered over the generated art,
 * lazy-loaded, and scales very slowly as it scrolls through the viewport (disabled for reduced motion).
 */
export function Frame({
  children,
  src,
  alt = "",
  className = "",
  art,
  overlay = true,
  scrim = false,
  position = "50% 50%",
  ratio = "aspect-[16/10]",
}: {
  children?: ReactNode;
  src?: string;
  alt?: string;
  className?: string;
  art?: ReactNode;
  overlay?: boolean;
  /** Extra darkening for frames that carry text or UI on top of a bright photo. */
  scrim?: boolean;
  position?: string;
  ratio?: string;
}) {
  const [photo, setPhoto] = useState(!!src);
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.02, 1.12]);
  return (
    <div ref={ref} className={`relative isolate overflow-hidden rounded-[32px] border border-white/10 bg-black shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] ${ratio} ${className}`}>
      <div className="absolute inset-0 [&>svg]:h-full [&>svg]:w-full">{art}</div>
      {src && photo && (
        <motion.img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setPhoto(false)}
          style={{ objectPosition: position, scale: reduce ? 1 : scale }}
          className="absolute inset-0 h-full w-full object-cover will-change-transform"
        />
      )}
      {overlay && <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,transparent_30%,rgba(0,0,0,0.55)_100%)]" />}
      {overlay && <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />}
      {scrim && <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,8,5,0.55),rgba(3,8,5,0.72))]" />}
      <div className="pointer-events-none absolute inset-0 rounded-[32px] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]" />
      {children}
    </div>
  );
}

const TILES = [
  { src: "/media/tile-harvest.webp", pos: "22% 86%" },
  { src: "/media/tile-valley.webp", pos: "30% 88%" },
  { src: "/media/tile-seedling.webp", pos: "56% 86%" },
];

/**
 * Produce tile for cards, passports and headers. Potato listings show the supplied potato photography
 * (one of three crops, chosen deterministically from `seed`/name so a given lot always looks the same);
 * other crops keep generated art rather than showing a potato photo for the wrong product.
 */
export function ProduceTile({ name, seed, className = "", alt }: { name: string; seed?: string; className?: string; alt?: string }) {
  const n = name.toLowerCase();
  const isPotato = n.includes("potato") || !n;
  const key = [...(seed ?? n)].reduce((a, c) => a + c.charCodeAt(0), 7);
  const tile = TILES[key % TILES.length];
  const [photo, setPhoto] = useState(isPotato);
  return (
    <div className={`relative overflow-hidden bg-black [&>svg]:h-full [&>svg]:w-full ${className}`}>
      {isPotato ? <PotatoScene seed={key} /> : <FieldScene />}
      {isPotato && photo && (
        <img src={tile.src} alt={alt ?? `${name} from a SeedChain farm`} loading="lazy" decoding="async" width={960} height={540} onError={() => setPhoto(false)} style={{ objectPosition: tile.pos }} className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
    </div>
  );
}
