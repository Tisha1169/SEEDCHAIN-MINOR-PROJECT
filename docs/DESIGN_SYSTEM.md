# Design system

A dark, cinematic, "liquid glass" interface. The redesign changed presentation only; all routes, APIs, auth, QR generation/scanning, inventory and orders are unchanged and still drive every screen.

## Principles
Quiet, minimal, editorial. Deep forest blacks, muted agricultural green (`accent` `#86d6a0`), thin 1 px borders, large light-weight type, generous space, restrained motion. No neon, no full-page photos.

## Tokens (`artifacts/seedchain/src/index.css`)
| Token | Use |
|---|---|
| `bg-base` `#040806`, body radial glows + film grain | page canvas (never flat black) |
| `text-ink` `#e9eee8` (+ opacity steps) | all text |
| `border-line`, `bg-glass`, `bg-glass-2` | hairlines and translucent fills |
| `text-accent` / `bg-accent/15` | the only brand colour; status and focus |
| `.glass`, `.glass-strong`, `.glass-spot`, `.lift` | frosted surfaces, cursor-lit highlight, hover lift |
| `.eyebrow`, `.text-gradient`, `.hairline` | micro-labels, headline gradient, dividers |
| `shadcn` HSL tokens (`--background`, `--primary`…) | remapped to the dark theme so every `ui/*` component follows |

Typography: Inter 200–700. Hero/section headings use weight 200 with −0.04 em tracking and `clamp()` sizes up to ~11 rem; labels are 0.68 rem, 0.22 em tracked uppercase. Primary calls to action are white pills; secondary actions are glass pills.

## Building blocks
`components/motion.tsx`: `Reveal` (opacity + rise + blur→sharp; `blur={false}` for performance-critical pages), `CountUp`, `GlassCard`, `Magnetic`. `components/art.tsx`: `Frame`, `PotatoScene`, `FieldScene`, `ProduceTile`. `components/app/common.tsx`: `Card`, `Stat`, `BigNumber`, `Field`, `Table`, `Pill`… `components/landing/*`: the ten scenes.

## Landing page
01 typography-only hero → 02 cinematic frame (scale/opacity scroll reveal) → 03 "One lot. One identity." → 04 real QR + phone → 05 journey nodes → 06 farmer → customer → 07 farmer passport → 08 intelligence → 09 customer product passport → 10 closing. **Every number and card on it comes from `GET /api/public/overview`** (live database aggregates, one featured public lot, labelled external market/weather data). With no data the cards show dashes or "awaiting first lot"; nothing is invented.

## Imagery
No licensed photography exists in the repository, so frames render generated vector artwork. Drop WebP/AVIF files named as in `public/media/README.md` (`harvest`, `potato`, `qr-label`, `farmer`, `field`) and they are layered over the art automatically, lazy-loaded, with the art as fallback. Never use a single full-page background image.

## Motion, accessibility, performance
Motion is opacity/transform (GPU-friendly) and respects `prefers-reduced-motion` (framer reveals render static; CSS animations collapse to ~0 ms). Focus rings, skip-to-content link, `aria-current`, labelled icon buttons, semantic landmarks. Routes other than landing/auth are lazy-loaded; charts and the ZXing scanner are separate chunks (initial JS ≈ 180 kB + React + motion). The public trace page avoids blur animations for low-end phones.
