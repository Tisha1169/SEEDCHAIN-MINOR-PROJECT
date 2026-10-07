# Production architecture

SeedChain is a **direct farmer-to-customer** traceability platform. There are exactly three application roles (`admin`, `farmer`, `customer`). Storage, transport and delivery are physical-world activities that the *farmer records*; they never have accounts, dashboards or permissions.

```
                    ┌──────────────────────────── one HTTPS origin ───────────────────────────┐
 Phone camera ───►  │  https://YOUR-DOMAIN/trace/<token>                                      │
 Browser (SPA) ──►  │  API service (Node 22, Express 5)                                       │
                    │   ├─ serves the built React SPA (index.html, /assets)                   │
                    │   ├─ /api/*  REST (OpenAPI is the source of truth)                      │
                    │   ├─ /api/stream, /api/stream/trace/:token   Server-Sent Events         │
                    │   ├─ /health /ready                                                     │
                    │   └─ in-process scheduler (external data, integrity checks, risk sweep) │
                    └───────────────┬────────────────────────────────────────┬───────────────┘
                                    │ SQL (pg pool, TLS)                     │ HTTPS (server side only)
                           Managed PostgreSQL 16                     data.gov.in · Open-Meteo
```

## Components

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 19, Vite 7, Tailwind 4, shadcn/ui, TanStack Query, wouter, Recharts, `@zxing/browser`, `qrcode.react` | Business state is never stored in the browser. `localStorage` holds only the *offline action queue* (pending, un-synced actions). |
| API | Express 5, Pino (request IDs), Helmet, express-rate-limit, Zod validation generated from OpenAPI | One bundled file (`esbuild`); no `node_modules` at runtime. |
| Database | PostgreSQL 16 via Drizzle ORM, versioned SQL migrations | CHECK/UNIQUE/FK constraints, append-only triggers, partial unique indexes. |
| API contract | `lib/api-spec/openapi.yaml` → Orval → `lib/api-zod` (request validation) + `lib/api-client-react` (typed hooks) | CI fails if generated code is stale. |
| Real-time | PostgreSQL `LISTEN/NOTIFY` → SSE → React Query invalidation | Falls back to 20 s polling; the UI shows which mode is active. |

## Roles and permissions (enforced in the backend)

| Capability | Admin | Farmer (approved) | Customer |
|---|---|---|---|
| Approve/reject/suspend users | ✔ | – | – |
| Farms, products, lots, harvest, quality, storage, loss | read all | own only | – |
| Generate/replace QR | ✔ | own lots | – |
| Revoke QR | ✔ | – | – |
| List produce / set price | – | own lots | – |
| Browse listings, public farmer profile, public trace | ✔ | ✔ | ✔ (also anonymous) |
| Place order | – | – | ✔ |
| Accept / reject / prepare / ready / dispatch / complete | – | own orders | – |
| Cancel / confirm receipt | with reason | – | own orders |
| Dashboards | command center | farm dashboard | customer dashboard |
| Alerts, audit log, trace events, integrations | all | own alerts | – |

Identity and role always come from the database row behind the session; nothing role-related is read from the client. Pending/rejected/suspended farmers cannot mutate anything.

## Core principle

```
ONE LOT → ONE PERMANENT DIGITAL IDENTITY → ONE ACTIVE QR (versioned) → MANY APPEND-ONLY EVENTS → LIVE DATABASE → CUSTOMER VERIFICATION
```

See [QR_TRACEABILITY.md](QR_TRACEABILITY.md), [TRACEABILITY_EVENT_MODEL.md](TRACEABILITY_EVENT_MODEL.md) and [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).

## Inventory

`lots.harvested_qty / reserved_qty / sold_qty / loss_qty` are numeric counters; `available_qty` is a **generated column** `harvested − reserved − sold − loss`. CHECK constraints reject negative values and `reserved + sold + loss > harvested`. Every inventory change happens inside a transaction that first locks the lot row (`SELECT … FOR UPDATE`; multi-lot orders lock in sorted id order), appends an event and writes an audit row.

| Action | Effect |
|---|---|
| Order placed | `reserved += qty` |
| Order rejected / cancelled | `reserved -= qty` (exactly once; second attempt is refused) |
| Customer confirms receipt | `reserved -= qty`, `sold += qty` |
| Loss / spoilage | `loss += qty` (cannot exceed available) |

A background job re-derives reserved/sold from order lines every 30 minutes and raises `INVENTORY_MISMATCH` alerts on any drift.

## Order state machine

```
PENDING ─accept→ ACCEPTED ─prepare→ PREPARING ─ready→ READY ─dispatch→ DISPATCHED ─complete→ DELIVERED ─confirm→ CUSTOMER_CONFIRMED
   │reject→ REJECTED       (pickup: READY ─complete→ DELIVERED, or customer confirms directly from READY)
   └ customer/admin cancel (PENDING…READY; customers only before PREPARING) → CANCELLED
```
Defined once in `artifacts/api-server/src/domain/state-machine.ts`; the API returns `allowedActions` per order and the UI renders only those buttons.

## Fulfilment (no logistics role)

`CUSTOMER_PICKUP`, `FARMER_DELIVERY`, `THIRD_PARTY_DELIVERY`. For third-party delivery the farmer records the courier name/reference as plain text; the courier has no account. The farmer is responsible for updating status.

## Environments

`development` (local, Docker Postgres) · `staging` (HTTPS, real phones, pilot data labelled `[PILOT TEST]`) · `production`. They differ only by environment variables; see [DEPLOYMENT.md](DEPLOYMENT.md).
