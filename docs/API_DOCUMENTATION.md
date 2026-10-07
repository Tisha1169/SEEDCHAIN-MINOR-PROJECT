# API documentation

The OpenAPI document `lib/api-spec/openapi.yaml` is the **source of truth**. `pnpm codegen` regenerates the Zod request validators (`lib/api-zod`) and the typed React Query client (`lib/api-client-react`); CI fails if they are stale. The same Zod schemas validate every request on the server, and unknown fields are stripped (no mass assignment).

## Conventions

* Base path `/api`. JSON in/out. Errors: `{ "error": string, "code": string, "details"?: …, "requestId": string }` (`X-Request-Id` is also returned).
* Auth: `sc_session` httpOnly cookie (SameSite=Lax, Secure in production, 72 h, server-side revocable). `Authorization: Bearer <token>` is accepted for non-browser clients.
* CSRF: every non-GET request must send `X-SeedChain-CSRF: 1` (cross-site forms cannot set it; cross-origin scripts need the CORS allow-list).
* Idempotency: `POST /orders` requires `Idempotency-Key`; order transitions accept it; farmer events and scans carry a `clientEventId` UUID. Offline replays add `X-Offline-Replay: 1`.
* Status codes: 400 validation, 401 not signed in, 403 role/approval/CSRF, 404 not found *or not yours* (no existence leak), 409 state-machine / inventory / duplicate conflict, 410 revoked/replaced QR, 413 body > 100 kB, 429 rate limited.
* Rate limits (per IP, per instance): API 300/min, public trace + scans 60/min, failed logins 20 per 15 min.

## Endpoints

| Area | Method | Path | operationId | Summary |
|---|---|---|---|---|
| health | GET | `/api/healthz` | `healthCheck` |  |
| auth | POST | `/api/auth/login` | `loginUser` |  |
| auth | POST | `/api/auth/logout` | `logoutUser` |  |
| auth | GET | `/api/auth/me` | `getCurrentUser` |  |
| auth | POST | `/api/auth/register` | `registerUser` | Register a farmer (pending admin approval) or a customer (active immediately) |
| auth | PATCH | `/api/me/profile` | `updateMyProfile` |  |
| admin | GET | `/api/admin/audit-logs` | `listAuditLogs` |  |
| admin | GET | `/api/admin/events` | `listAllTraceEvents` |  |
| admin | GET | `/api/admin/scans` | `listQrScans` |  |
| admin | GET | `/api/admin/users` | `listUsers` |  |
| admin | POST | `/api/admin/users/{id}/{action}` | `reviewUser` | Approve / reject a farmer, suspend / reactivate any non-admin user |
| farms | GET | `/api/farms` | `listFarms` |  |
| farms | POST | `/api/farms` | `createFarm` |  |
| farms | PATCH | `/api/farms/{id}` | `updateFarm` |  |
| products | GET | `/api/products` | `listProducts` |  |
| products | POST | `/api/products` | `createProduct` |  |
| lots | GET | `/api/inventory` | `getInventory` | Live inventory per lot with totals (farmer = own lots, admin = all) |
| lots | GET | `/api/lots` | `listLots` |  |
| lots | POST | `/api/lots` | `createLot` | Create a lot, its LOT_CREATED event and its first QR identity |
| lots | GET | `/api/lots/{id}` | `getLot` |  |
| lots | PATCH | `/api/lots/{id}` | `updateLot` |  |
| lots | GET | `/api/lots/{id}/events` | `listLotEvents` |  |
| lots | POST | `/api/lots/{id}/events` | `recordLotEvent` | Farmer records a real-world event. Idempotent on clientEventId. |
| lots | POST | `/api/lots/{id}/listing` | `setLotListing` |  |
| lots | GET | `/api/lots/{id}/storage` | `listLotStorage` |  |
| qr | GET | `/api/lots/{id}/qr` | `listLotQrCodes` |  |
| qr | POST | `/api/qr/generate` | `generateQr` | Issue a replacement QR for a lot (old ACTIVE QR becomes REPLACED) |
| qr | POST | `/api/qr/revoke` | `revokeQr` | Admin revokes a QR (compromised label). The lot keeps its identity and history. |
| trace | GET | `/api/me/scans` | `listMyScans` |  |
| trace | GET | `/api/public/overview` | `getPublicOverview` | Public landing-page aggregates and one featured public lot (live database values, cached 30 s) |
| trace | POST | `/api/scans` | `recordScan` | Record a QR scan (idempotent on clientEventId) |
| trace | GET | `/api/trace/{publicToken}` | `getPublicTrace` | Public, unauthenticated, rate-limited lot verification |
| marketplace | GET | `/api/farmers/{id}` | `getPublicFarmer` |  |
| marketplace | GET | `/api/marketplace/listings` | `listMarketplace` |  |
| marketplace | GET | `/api/marketplace/listings/{lotId}` | `getListing` |  |
| orders | GET | `/api/orders` | `listOrders` |  |
| orders | POST | `/api/orders` | `createOrder` | Customer places an order; inventory is reserved in the same transaction |
| orders | GET | `/api/orders/{id}` | `getOrder` |  |
| orders | POST | `/api/orders/{id}/feedback` | `submitOrderFeedback` |  |
| orders | POST | `/api/orders/{id}/{action}` | `transitionOrder` | Order state transitions. Farmer: accept, reject, prepare, ready, dispatch, complete. |
| dashboard | GET | `/api/dashboard/customer` | `getCustomerOverview` |  |
| dashboard | GET | `/api/dashboard/farmer` | `getFarmerOverview` |  |
| dashboard | GET | `/api/dashboard/overview` | `getAdminOverview` |  |
| alerts | GET | `/api/alerts` | `listAlerts` |  |
| alerts | POST | `/api/alerts/{id}/acknowledge` | `acknowledgeAlert` |  |
| alerts | POST | `/api/alerts/{id}/resolve` | `resolveAlert` |  |
| external | GET | `/api/admin/integrations` | `listIntegrations` |  |
| external | POST | `/api/admin/integrations/{source}/run` | `runIntegration` |  |
| external | GET | `/api/market-prices` | `getMarketPrices` |  |
| external | GET | `/api/weather` | `getWeather` |  |

Additional non-OpenAPI endpoints: `GET /api/stream` (SSE, authenticated change notices), `GET /api/stream/trace/:publicToken` (SSE for one lot's public page), `GET /health`, `GET /ready` (database + migrations + realtime).

## Mapping to the requested API

| Requested | Implemented |
|---|---|
| `POST /api/lots`, `GET /api/lots`, `GET /api/lots/:id`, `GET /api/lots/:id/events`, `POST /api/lots/:id/events` | as requested |
| `GET /api/trace/:publicToken` | as requested (public, rate-limited) |
| `POST /api/qr/generate`, `POST /api/qr/revoke`, `POST /api/scans` | as requested (`generate` = replace/issue; `revoke` is admin-only) |
| `GET /api/inventory` | per-lot live inventory + totals |
| `GET /api/orders`, `POST /api/orders`, `POST /api/orders/:id/{accept,reject,prepare,dispatch,complete,cancel,confirm-receipt}` | as requested; plus `ready` (preparing → ready) |
| `GET /api/dashboard/overview` | admin command center (`/dashboard/farmer`, `/dashboard/customer` for the other roles) |
| `GET /api/market-prices`, `GET /api/weather` | read stored, lineage-tagged external observations |
| `GET /api/alerts`, `POST /api/alerts/:id/acknowledge` | as requested; plus `resolve` (admin) |
