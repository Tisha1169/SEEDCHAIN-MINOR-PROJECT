# Testing

## Commands

```bash
docker run -d --name seedchain-pg -e POSTGRES_USER=seedchain -e POSTGRES_PASSWORD=seedchain -e POSTGRES_DB=seedchain_test -p 55432:5432 postgres:16-alpine
pnpm install
pnpm lint && pnpm typecheck && pnpm test      # TEST_DATABASE_URL defaults to localhost:55432/seedchain_test
pnpm build
```
The backend suites run against a **real PostgreSQL**: the global setup drops and recreates the schema from the real migrations, then drives the real Express app with supertest. Nothing is mocked except the network in the frontend queue tests.

## Automated suites (all green at the time of writing)

| Suite | Tests | What it proves |
|---|---|---|
| `api-server/test/unit.test.ts` | 20 | QR token entropy/uniqueness, URL building/parsing (rejects foreign origins and JSON payloads), lot-code format, **every (role × status × fulfilment × action) combination of the order state machine**, lot status derivation, risk engine reasons, public-timeline allow-list (no private fields), external-data normalisation/redaction |
| `api-server/test/acceptance.test.ts` | 2 | The full scenario: farmer registers → admin approves → farm/product/lot/harvest/storage → QR created → **QR PNG rendered and decoded back to the exact HTTPS URL** → public trace without login → customer registers/browses/orders (stock reserved) → farmer accept/prepare/ready/dispatch/complete → customer confirms (reserved → sold) → inventory report → same QR shows updated status and no private data → admin dashboard/audit/events. Plus the pickup variant ending in `LOT_SOLD_OUT`. |
| `api-server/test/negative.test.ts` | 38 | Security, IDOR, concurrency, idempotency, offline replay, QR replace/revoke, injection/XSS, malformed input, headers, public landing overview leaks nothing (details in SECURITY.md) |
| `seedchain/src/lib/*.test.ts` | 8 | Scanner payload parsing; offline queue: queue on network failure, ordered replay with idempotent bodies, `SYNC_CONFLICT` on 4xx without auto-retry, hold on 5xx, validation errors not queued |
| CI (`.github/workflows/ci.yml`) | – | lint, typecheck, tests with a Postgres service, "generated client is up to date", production build, Docker build |

## Manual verification already performed (local, production bundle against PostgreSQL 16)

* Registered a farmer and a customer through the real forms; admin approval; farm + lot created; the farmer dashboard updated **without reload** over the SSE stream; the customer's open order page flipped to *Dispatched* and offered *Confirm I received it* when the farmer progressed it from another client; confirmation produced `PARTIALLY_SOLD`, 850 kg available on the public page, no private data in the JSON.
* The printed label (SVG → canvas) was decoded with the browser's native `BarcodeDetector` and returned exactly the trace URL.
* Public trace page and scanner page inspected at 375×812 (phone size).
* Real weather retrieved from Open-Meteo for a farm with GPS; market-price source correctly reported `SKIPPED` without an API key.
* Docker image built and run as a non-root user with no `node_modules`; migrations applied at boot; CLIs and pilot seed ran inside the container.

## Not done by the author (needs people and devices; see PILOT_RUNBOOK.md)

The acceptance tests prove the logic. The following **must still be done on real hardware before calling the QR flow "field-proven"** (the camera cannot be exercised from CI or from the development sandbox):

| Matrix | Procedure | Pass criterion |
|---|---|---|
| Android Chrome in-app `/scan` | HTTPS staging, grant camera, scan a printed label | opens the right `/trace/…` page ≤ 3 s |
| Android native camera | scan the same label | opens the same page |
| iPhone Safari `/scan` and iPhone camera app | same | same |
| Desktop browser (webcam) | `/scan` | same |
| Printed vs on-screen; small (2 cm) and large (10 cm) labels; dim light/glare; slightly damaged label | scan each | resolves, or fails safely with a clear message |
| Slow network (throttled 3G) | scan, open trace | spinner then data; no stale data shown |
| Invalid / unknown / revoked / duplicate QR | scan crafted codes | clear messages; revoked shows no lot data; duplicate scan not double-counted |
| Different lots | scan 5+ labels | each opens its own lot, never another |
| Offline farmer | airplane mode: record loss, reconnect | "Saved offline — waiting for synchronization." then applied once |

Record results in the pilot log; do not mark Phase 33/46 complete without them.
