# Photography slots

The landing page, farmer passport and product passports render generated vector art by default.
To use real photography, drop high-resolution **WebP/AVIF-converted** files here with these names;
they are layered over the art automatically (lazy-loaded, `object-fit: cover`) and the art remains
the fallback if a file is missing:

| File | Used in |
|---|---|
| `harvest.webp` | Cinematic agriculture frame (landing section 02) |
| `potato.webp` | Digital identity section (03) |
| `qr-label.webp` | QR scene backdrop (04) |
| `farmer.webp` | Farmer digital passport (07) |
| `field.webp` | Final call to action (10) |

Only use images you have the licence to publish. Recommended: 2400 px wide, quality ~75, < 400 kB each.
