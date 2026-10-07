# SeedChain

**Direct farmer-to-customer agricultural traceability.** Every lot gets one permanent digital identity and one secure QR. Scan it with any phone to see the lot's live, database-backed provenance, then order straight from the farmer. No middlemen.

> Status: pilot-ready build. Logic, security and the full farmer → QR → customer → admin flow are covered by automated tests against real PostgreSQL. **Field testing on real phones and with real farmers still has to be done**; see [docs/PILOT_RUNBOOK.md](docs/PILOT_RUNBOOK.md) and [docs/TESTING.md](docs/TESTING.md).

## Three roles, nothing else

```
                 ADMIN  (governs, approves, monitors, revokes QR)
                   │
        ┌──────────┴──────────┐
     FARMER ──── direct ───► CUSTOMER
  creates lots, QR,        browses, scans QR,
  inventory, fulfils       orders, confirms receipt
```

There are **no** logistics, storage, driver, distributor, retailer or "buyer" accounts. Storage and delivery are *information the farmer records* (cold-storage entries, own delivery, customer pickup, or a courier the farmer arranges, recorded as plain text).

## How it works

1. A farmer registers; an **admin approves** them.
2. The farmer adds a farm and crop, creates a **lot**, records harvest/quality/storage. SeedChain issues `LOT-2026-PB-000001` and a **256-bit random public token**.
3. The printed label's QR contains **only** `https://YOUR-DOMAIN/trace/<token>`, never quantities, contacts or JSON.
4. Anyone scanning it lands on `/trace/<token>`, a public page that reads the **live database**: origin, harvest, quality, storage, status, an append-only timeline, last-updated time.
5. A customer orders from the farmer's listing; stock is **reserved transactionally**. The farmer accepts → prepares → marks ready → dispatches/hands over; the customer confirms receipt and reserved stock becomes sold. Every step is a permanent trace event and updates screens live.
6. Admins see farmers, lots, inventory, orders, scans, events, alerts, data-source health and an audit log, and can revoke a compromised QR (the lot and its history stay; a new label is issued).

## Quick start (development)

Requirements: Node ≥ 22, pnpm 10, Docker (for PostgreSQL).

```bash
docker run -d --name seedchain-pg -e POSTGRES_USER=seedchain -e POSTGRES_PASSWORD=seedchain -e POSTGRES_DB=seedchain_dev -p 55432:5432 postgres:16-alpine
pnpm install
cp .env.example .env            # edit if needed; defaults match the command above
pnpm build                       # typecheck + build SPA and API
set -a && . ./.env && set +a
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-password' pnpm --filter @workspace/api-server run create-admin
pnpm start                       # http://localhost:8080  (API + SPA, migrations applied on boot)
```
Hot-reload frontend: `pnpm --filter @workspace/seedchain dev` (proxies `/api` to :8080).
Production-like container: `AUTH_SECRET=$(openssl rand -base64 48) docker compose up --build`.

## Commands

| | |
|---|---|
| `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm build` | quality gate (also run in CI) |
| `pnpm codegen` | regenerate Zod validators + React Query client from `lib/api-spec/openapi.yaml` |
| `pnpm db:migrate` | apply SQL migrations (also automatic with `RUN_MIGRATIONS_ON_START=true`) |
| `pnpm --filter @workspace/db run generate` | create a new migration after changing `lib/db/src/schema` |

## Repository layout

```
artifacts/api-server   Express API, services, domain rules (state machine, risk, QR), CLIs, tests
artifacts/seedchain    React SPA (public trace + scanner, marketplace, farmer/customer/admin workspaces)
lib/db                 Drizzle schema + versioned SQL migrations + one-time legacy import
lib/api-spec           OpenAPI 3.1 (source of truth) + Orval config
lib/api-zod            generated request/response validators
lib/api-client-react   generated typed hooks
docs/                  architecture, QR, events, schema, API, data sources, deployment, security, testing, pilot, DR
```

## Real data, honestly labelled

* Operational data comes only from real use of the app. Seeded pilot data is marked `[PILOT TEST]`.
* **Market prices** come from data.gov.in (needs a free API key; without it the source is reported `SKIPPED`, never faked). **Weather** comes from Open-Meteo for farms with GPS. Both are ingested by the backend with full lineage and shown with source and "last updated" time. See [docs/REAL_DATA_SOURCES.md](docs/REAL_DATA_SOURCES.md).
* The risk rating is a **transparent rule set**, not AI. "Real-time" means the specific SSE/polling mechanism described in the docs, and the UI shows which one is active.
* Traceability is **database-backed and append-only**. It is not a blockchain, not tamper-proof against a database administrator, and farmers' entries are self-reported. See [docs/SECURITY.md](docs/SECURITY.md).

## Documentation

[Architecture audit (before)](docs/CURRENT_ARCHITECTURE_AUDIT.md) · [Production architecture](docs/PRODUCTION_ARCHITECTURE.md) · [QR traceability](docs/QR_TRACEABILITY.md) · [Event model](docs/TRACEABILITY_EVENT_MODEL.md) · [Database schema](docs/DATABASE_SCHEMA.md) · [API](docs/API_DOCUMENTATION.md) · [Real data sources](docs/REAL_DATA_SOURCES.md) · [Deployment](docs/DEPLOYMENT.md) · [Security](docs/SECURITY.md) · [Testing](docs/TESTING.md) · [Pilot runbook](docs/PILOT_RUNBOOK.md) · [Disaster recovery](docs/DISASTER_RECOVERY.md) · [Design system](docs/DESIGN_SYSTEM.md)

## Known limitations (summary)

No password reset / e-mail verification / MFA yet · rate limits are per instance · a printed QR can be physically copied (alerts + revocation mitigate) · no payment processing · scanner and print behaviour still need real-device validation · market prices need an API key. Full list in [docs/SECURITY.md](docs/SECURITY.md).

## License

MIT
