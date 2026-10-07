# Post-upgrade audit

Audit of the codebase at commit `0caeeba` (branch `pilot-ready-transformation`), performed before starting the "pilot-ready agritech" upgrade. Method: code inspection, grep, running the production bundle against PostgreSQL 16, probing every named external source from the build machine.

## 1. What was claimed vs. what actually exists

| Item | Reality at audit time |
|---|---|
| Three roles, lots, QR generation/scanning, public trace, events, inventory, orders, admin dashboard | **Present and tested** (60 backend + 8 frontend tests) |
| Premium dark/liquid-glass UI, cinematic landing | **Present** |
| "Multilingual architecture, Punjabi/Hindi/English UI" | **Not present.** No i18n library, no locale files; ~190 hard-coded English UI strings across 22 pages plus server-sent English labels and error messages |
| "Mobile/PWA improvements" | **Not present.** No manifest, no service worker, no icons. Responsive layouts only; offline = a pending-action queue in `localStorage` |
| "Basic analytics" | Admin counters/charts exist; **no QR analytics** (unique/repeat/failed/per-lot), no KPIs such as inventory accuracy or repeat rate |
| Farmer verification | Approve / reject / suspend only. **No "correction required" state**, no resubmission, no review panel showing farm/crop details |
| Reviews | One 1-5 rating per confirmed order. **No freshness/quality dimensions, no moderation**, farmer rating not on public profile |
| Recall | **Not present** |
| QR anomaly detection | **Not present** (only a >50-scans/10-min burst alert) |
| Notifications | **Not present** (alerts exist; nothing per-user) |
| Quality records | Grade + free-text notes only; no appearance/size/defects/inspection date |
| Traceability completeness | A coarse "coverage %" (quality + active QR) that is not explainable per lot |
| Data layer | Open-Meteo weather and an unverified data.gov.in adapter. **No source registry, no raw storage, no PAU/FAOSTAT/etc., no data-health screen** |
| Forecasting, assistant, Punjab map, PWA | **Not present** |

The upgrade below implements the missing items. Nothing already working is removed.

## 2. External sources: what is actually reachable (probed from the build machine, 7 Oct 2026)

| Source | Result | Consequence |
|---|---|---|
| PAU potato resource `web3.pau.edu/potato/Potato_cult.php` | **DNS does not resolve.** The same content is live at `https://www.pau.edu/potato/Potato_cult.php` (HTTP 200) and contains a real district table (area / production / yield, 2023-24, "Source: Department of Horticulture, Punjab") | Ingested from the working host; the original URL is recorded as superseded |
| ICAR `https://www.icar.gov.in/` | **TLS certificate expired** (Node: `CERT_HAS_EXPIRED`). `cpri.icar.gov.in` does not resolve | Not scraped; TLS verification is **not** disabled. Institutional reference only, no figures taken from it |
| data.gov.in mandi API `api.data.gov.in` | **Connection reset** at TLS handshake from curl and Node; the browser sandbox also refused | Adapter hardened and unit-tested on the documented response shape, **but not verified live**; CSV/JSON file import added as the fallback; needs the owner's API key and a network that can reach it |
| AGMARKNET `agmarknet.gov.in` | HTTP 200 but a 1 kB JavaScript shell; no public API | Reference only; no scraping |
| FAOSTAT API | `401 Missing Authorization Header` (token required) | Use the public **bulk file** (34 MB, CC BY 4.0) instead; works without credentials |
| DES `data.desagri.gov.in` | Connect timeout | Registry entry, status `unreachable`; no data |
| NHB `nhb.gov.in/statistics.aspx` | Reachable, but the page is navigation + annual-report PDFs; no machine-readable tables | Reference only; no figures extracted |
| IMD `mausam.imd.gov.in` | Reachable HTML; no documented public machine-readable district API | Not integrated. Weather stays on Open-Meteo and is labelled as such (model-based, **not IMD**) |
| Open-Meteo | OK (verified live) | Kept |

No agricultural figure is typed into the code from memory. Anything shown comes from a parsed fetch with a stored raw copy, or from an explicitly cited import.

## 3. Findings by category (and what was done)

| # | Finding | Severity | Resolution |
|---|---|---|---|
| 1 | No i18n; UI strings hard-coded; API errors shown as raw English | High (farmer usability) | Phase i18n: `en/hi/pa`, error **codes** translated client-side |
| 2 | QR states limited to ACTIVE/REVOKED/REPLACED; no temporary disable, no recall state | High | New `DISABLED` state + lot recall with public warning |
| 3 | No scan analytics beyond a raw table; no anomaly review workflow | High | Analytics endpoint + anomaly table with investigate/disable/re-enable/revoke and audit trail |
| 4 | Public trace timeline shows only events that happened; no "Pending / Not recorded" steps | Medium | Server-computed journey with explicit pending steps |
| 5 | Completeness not explainable | Medium | Pure function + per-lot explanation of missing parts |
| 6 | Client-side unit conversion (₹/quintal → ₹/kg) in the farmer dashboard | Low | Moved to the API |
| 7 | List endpoints cap at 200-1000 rows with no pagination | Medium | Cursor/limit pagination on orders, lots, events, users, scans, alerts |
| 8 | Public overview computes risk for up to 200 lots per request | Low | Cached 30 s; risk aggregates cached separately; flagged |
| 9 | Rate limits are per instance, in memory | Medium | Documented; limits tightened on scan endpoints |
| 10 | Review model too thin; no moderation | Medium | Freshness/quality/overall, admin hide/unhide |
| 11 | Verification lacks "correction required" | Medium | New status + resubmit flow |
| 12 | Risk reasons are English strings only; missing inputs not reported | Medium | Reason codes + params; explicit "data unavailable" list; harvest-age rule |
| 13 | No notifications | Medium | In-app notification table + SSE |
| 14 | Weather source labelled generically | Low | Registry + precise attribution |
| 15 | No PWA/manifest/service worker | Medium | Added; API responses are never cached by the service worker |
| 16 | Public trace is the only unauthenticated read path with business data | Info | Uniform timing/errors, rate limited, tokens redacted from logs (verified) |

## 4. Database audit

Required indexes exist: `qr_codes.public_token` (unique), `qr_codes.lot_id`, `traceability_events (lot_id, event_time)`, `events.event_type`, `events.recorded_at`, `qr_scan_events.lot_id`, `qr_scan_events.scanned_at`, `orders (farmer_id|customer_id|status|created_at)`, `order_items (order_id|lot_id)`, `lots.farmer_id`. All business tables use foreign keys; inventory has CHECK constraints; events/audit are append-only by trigger. Gaps found and fixed in this upgrade: notifications and review indexes, data-pipeline tables (raw payloads, reference statistics) and their FKs.

## 5. Verified-before-change baseline

`pnpm lint`, `pnpm typecheck`, 68 tests (60 + 8), production build, Docker build and `pnpm audit --prod` were all green at commit `0caeeba`.
