# Current Architecture Audit (pre-transformation)

Audited commit: `4627ac9` ("Revise README for improved project documentation"), branch `main`.
Audit performed before any functional change. Everything below describes the repository **as it was**.

## 1. Repository layout

| Path | Purpose |
|---|---|
| `artifacts/seedchain` | React 19 + Vite 7 + Tailwind 4 + shadcn/ui frontend, `wouter` router, TanStack Query |
| `artifacts/api-server` | Express 5 API, Drizzle ORM, Pino logging, bundled with esbuild |
| `artifacts/mockup-sandbox` | Replit UI mockup sandbox (not part of the product, excluded from build) |
| `lib/db` | Drizzle schema + `pg` pool (`drizzle-kit push`, no migration files) |
| `lib/api-spec` | `openapi.yaml` + Orval config |
| `lib/api-client-react` | Orval-generated React Query hooks + `customFetch` |
| `lib/api-zod` | Orval-generated Zod schemas |
| `scripts` | `hello.ts` placeholder only |

## 2. Baseline health

* `pnpm install` succeeds.
* **`pnpm run typecheck` fails** (15 errors): pages import `@lib/api-client-react` (alias not resolvable by `tsc`), and `admin/dashboard.tsx`, `storage/incoming.tsx` reference identifiers (`adminStats`, `allShipments`, `batchQRData`, `pendingIncoming`) that were deleted from `lib/supply-chain.ts`. The frontend therefore cannot pass the repo's own `build` script (`build` runs `typecheck` first).
* No tests of any kind exist.
* No database migrations exist; schema is applied with `drizzle-kit push`.

## 3. Roles (before)

`user_role` enum: `farmer`, `storage`, `logistics`, `buyer`, `admin`, which is five roles with separate dashboards:
`/farmer/*`, `/storage/*`, `/logistics/*`, `/buyer/*`, `/admin/*`.
Registration accepted **any** role from the request body, including `admin` (privilege escalation).

## 4. Database tables (before)

| Table | Notes |
|---|---|
| `users` | serial id, email unique, `password_hash`, `role` |
| `farms` | farmer_id → users |
| `seed_batches` | serial id, `batch_code` (`SC-<base36 time>-<rand3>`), single `quantity_kg`, `status` enum (`planted…sold`) |
| `harvests` | batch_id, quantity, grade |
| `storage_records` | operator_id → users (storage role) |
| `transport_records` | driver_id → users (logistics role) |
| `orders` | buyer_id, batch_id, quantity, price; status `pending/confirmed/dispatched/delivered/cancelled` |
| `shipment_tracking` | `TRK-<7 digits>` tracking ids, status enum of logistics steps |

Missing: indexes beyond PK/unique, check constraints, inventory columns (reserved/sold/loss), QR records, events, audit log, alerts, external data.

## 5. Backend routes (before)

All in `artifacts/api-server/src/routes`:
`/api/healthz`, `/api/auth/{register,login,me}`, `/api/users[/:id]`, `/api/farms[/:id]`, `/api/batches[/:id]`, `/api/harvests[/:id]`, `/api/storage[/:id]`, `/api/transport[/:id]`, `/api/orders[/:id]`, `/api/marketplace`, `/api/dashboard/{summary,farmer/:id,storage/:id,logistics/:id,buyer/:id}`, `/api/tracking/*`, `/api/shipments/user/:id`, plus `/health`.

Findings:

* **No authorization at all**: `authMiddleware` only authenticates. Any logged-in user can `PUT /batches/:id`, `PUT /orders/:id`, `PUT /users/:id` (any user), list all users with emails/phones, read any dashboard by userId (IDOR).
* **No input validation**: bodies are destructured straight into inserts; the generated Zod schemas are only used for `/healthz`.
* **Arbitrary status changes**: `PUT /batches/:id` and `PUT /orders/:id` accept any status; no state machine.
* **No inventory**: ordering does not check or reserve quantity; overselling is possible; `delivered` order marks the *whole batch* `sold`.
* Filtering done in memory after selecting full tables.
* `/marketplace` returns **hardcoded prices** (25/20/15 by grade) and **fabricated harvest date** (`new Date()`).
* `/dashboard/summary` returns **hardcoded `recentActivity`**; storage dashboard uses a hardcoded 50 000 kg capacity.
* Public `GET /tracking/:trackingId` exposes the driver's name and internal batch ids; tracking ids are 7-digit sequential-range random numbers (enumerable).
* Catch-all `app.get(/.*/)` redirects to `FRONTEND_URL`.
* `cors()` with no origin restriction.

## 6. Authentication (before)

* `hashPassword` = `HMAC-SHA256(SESSION_SECRET, password)`: unsalted, fast, same password → same hash.
* Default secret `"seedchain-secret-key"` if env missing.
* Token = base64(JSON `{userId, role, iat}`) + HMAC; **never expires**; no logout/revocation; signature compared with `!==` (not constant-time).
* Token stored in `localStorage` together with the full user object; the frontend trusts the stored `role` for routing.
* **Demo fallback in `use-auth.tsx`**: if the API is unreachable or rejects the login, five hard-coded demo users log in **without a password**, and `register` creates a fake local user. This is a production auth bypass on the client side (no server data is exposed, but the UI pretends to be logged in).

## 7. QR flow (before)

* `farmer/register-crop.tsx` renders `QRCodeSVG value={JSON.stringify({batchCode, variety})}`: the QR encodes mutable JSON, not a URL. A phone camera shows text; nothing resolves to the database.
* Other pages generated QR values from the removed `batchQRData` helper.
* No QR table, no revocation, no versioning, no scan logging, no scanner.

## 8. Tracking flow (before)

* `pages/tracking.tsx` imports `dummyShipment`, `allShipments`, `batchQRData` from `lib/supply-chain.ts` (these exports no longer exist → page broken) and searched an **in-memory fake shipment list**, showing "demo IDs" quick links.
* `tracking-old.tsx`, `landing-old.tsx` dead files.
* Backend `shipment_tracking` existed but the public page never called it.

## 9. Order flow (before)

Buyer → `POST /orders` (no quantity check, price from client body) → anyone `PUT /orders/:id` status. Farmers had no order inbox. No events, no idempotency.

## 10. Demo / mock / fake data found

| Location | Issue |
|---|---|
| `src/hooks/use-auth.tsx` | demo user map + password-less fallback login/register |
| `src/lib/supply-chain.ts` | 432 lines of simulated shipments, RFID "simulation", fake coordinates |
| `src/pages/tracking.tsx`, `tracking-old.tsx` | fake shipment search |
| `src/pages/admin/dashboard.tsx` | references `adminStats`, `allShipments` |
| `src/pages/storage/incoming.tsx` | `pendingIncoming`, `batchQRData` |
| `src/lib/supabase.ts` | unused Supabase client with "running in demo mode" placeholder |
| `api/routes/orders.ts` | hardcoded marketplace prices / harvest date |
| `api/routes/dashboard.ts` | hardcoded `recentActivity`, capacity |
| `replit.md` | demo credentials list |
| `artifacts/seedchain/.env`, `.env.production`, `.env.vercel` | committed although `.gitignore` lists them (Supabase publishable key; not a secret, but unused) |
| `*/dev.log` | committed log files |

## 11. Deployment (before)

* Frontend on Vercel (static build, `vercel.json` SPA rewrite).
* Backend expected on Replit (`.replit`, autoscale), with Vite dev proxy `/api → :8080`. **No production path from the Vercel frontend to the API** (relative `/api` calls hit Vercel and return `index.html`), which is why the demo fallback always fired in production.
* Database: Replit PostgreSQL via `drizzle-kit push`.

## 12. Problems summary

1. Five-role middleman model contradicts the direct farmer→customer business model.
2. Missing authorization, validation, state machine, inventory, idempotency.
3. QR encodes JSON, does not resolve to live data.
4. Public pages show fabricated data.
5. Weak password hashing, non-expiring tokens, client-side auth bypass.
6. No migrations, no tests, project does not typecheck.
7. No production deployment path for the API.

## 13. Proposed production architecture

See [PRODUCTION_ARCHITECTURE.md](PRODUCTION_ARCHITECTURE.md). In short:

* Three roles: `admin`, `farmer`, `customer`. Storage and delivery become **farmer-recorded data**, not accounts.
* Domain split: products, farms, lots (with transactional inventory columns + DB check constraints), QR codes (random 256-bit public token, versioned, ACTIVE/REVOKED/REPLACED), append-only traceability events (DB trigger blocks UPDATE/DELETE), orders + order items with a backend-enforced state machine, alerts, append-only audit log, QR scan events, external data observations with ingestion-run lineage.
* QR encodes only `PUBLIC_TRACE_BASE_URL/trace/<token>`; public page reads live data via `GET /api/trace/:token`.
* scrypt password hashing, server-side sessions (expiring, revocable), httpOnly cookie, CSRF header, rate limiting, helmet.
* Real-time: Postgres `LISTEN/NOTIFY` → Server-Sent Events → React Query invalidation, with polling fallback.
* Versioned SQL migrations (drizzle-kit generate) + legacy-data migration that renames old tables to `legacy_*` rather than dropping them.
* Single deployable service (API also serves the built SPA) so QR URLs, cookies and SSE share one HTTPS origin.
