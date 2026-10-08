# Deployment

## Recommended shape

**One container + one managed PostgreSQL**, behind HTTPS on a domain you control.

* The API image also serves the built SPA, so the QR URL, session cookie and the live-update stream share one origin (no CORS, no third-party cookies).
* Database: managed PostgreSQL 16 (Neon, Supabase, AWS RDS, Render/Railway/Fly Postgres, …) with automated backups and TLS. **Do not** use a local database or an ephemeral container filesystem; the app writes no files, so the container can be stateless.
* Container hosts that work well: Render, Fly.io, Railway, Google Cloud Run (set min instances ≥ 1 for the live stream and scheduler), AWS ECS/App Runner, any VM with Docker.
* Vercel alone is **not** suitable for the API (persistent PostgreSQL `LISTEN` connection, long-lived SSE, in-process scheduler). A Vercel frontend with `/api/*` rewrites to the API origin keeps cookies same-origin but the SSE stream may be buffered or cut, in which case the UI transparently polls every 20 s. A split deployment with a different site for the SPA is **not supported** by the current cookie settings.

## Environment variables

| Variable | Required | Meaning |
|---|---|---|
| `DATABASE_URL` | ✔ | PostgreSQL connection string |
| `DATABASE_SSL` | managed DBs | `require` to enable TLS (`DATABASE_SSL_REJECT_UNAUTHORIZED=false` only for self-signed chains) |
| `AUTH_SECRET` | ✔ | ≥ 32 random chars (`openssl rand -base64 48`); keys the session-token HMAC |
| `PUBLIC_TRACE_BASE_URL` | ✔ | `https://your-domain`. Encoded into every printed QR. **Never change after printing labels.** |
| `PORT` | | default 8080 |
| `NODE_ENV=production` | ✔ | enables strict config validation, Secure cookies, JSON logs |
| `RUN_MIGRATIONS_ON_START` | | `true` applies migrations on boot (advisory-locked; safe with several instances) |
| `FRONTEND_DIST_DIR` | | set in the image (`/app/public`) |
| `COOKIE_SECURE`, `TRUST_PROXY` | | defaults `true` / `1` in production (one reverse proxy); adjust to your proxy depth |
| `CORS_ORIGINS` | | only if a different origin calls the API (not recommended) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | for online payment | See `PAYMENTS.md`. Payments stay off until key id and secret are set; webhook secret is required in production when on |
| `PAYMENT_HOLD_MINUTES` | | stock hold while paying, default 20 |
| `DATA_GOV_IN_API_KEY` | for prices | free key from data.gov.in |
| `DATA_GOV_IN_RESOURCE_ID`, `MARKET_COMMODITY`, `MARKET_INGEST_INTERVAL_MINUTES`, `WEATHER_INGEST_INTERVAL_MINUTES`, `INGESTION_ENABLED` | | tuning |
| `RATE_LIMIT_API_PER_MINUTE`, `RATE_LIMIT_TRACE_PER_MINUTE`, `RATE_LIMIT_AUTH_PER_15_MINUTES` | | defaults 300 / 60 / 20 |
| `SESSION_TTL_HOURS` | | default 72 |
| `LEGACY_SESSION_SECRET` | legacy import | old `SESSION_SECRET`, used once to verify imported old passwords |
| `VITE_API_BASE_URL`, `VITE_PUBLIC_TRACE_BASE_URL` | build-time, optional | only for non-same-origin builds; contain no secrets |

The app refuses to start in production with a short `AUTH_SECRET`, a non-HTTPS `PUBLIC_TRACE_BASE_URL` or insecure cookies. No secret is ever sent to the frontend.

## First deploy

1. Provision managed PostgreSQL; create a database and user. Take note of the URL.
2. Build and push the image: `docker build -t registry/seedchain:1 . && docker push …`
3. Run it with the variables above (`RUN_MIGRATIONS_ON_START=true`). `GET /ready` returns 200 only when the database answers and migrations are applied.
4. Create the first admin (admin accounts cannot be self-registered):
   `docker exec <container> env ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='…12+ chars…' node cli/create-admin.mjs`
5. Put the platform behind HTTPS (the host's managed TLS is fine). Confirm `https://YOUR-DOMAIN/ready`.
6. Staging only: `PILOT_PASSWORD=… ALLOW_PILOT_SEED=true node cli/seed-pilot.mjs` creates five `[PILOT TEST]` farmers/lots and three customers. **Never run it against a database holding real data.**

## Proxy requirements

* Terminate TLS at the proxy; pass `X-Forwarded-For/Proto` and set `TRUST_PROXY` to the number of proxies.
* Disable response buffering and allow idle timeouts ≥ 60 s for `/api/stream*` (the server sends a heartbeat every 25 s and sets `X-Accel-Buffering: no`).
* Health probes: `/health` (liveness), `/ready` (readiness).

## Upgrading

Migrations are forward-only SQL under `lib/db/migrations`, applied automatically at boot or with `pnpm db:migrate`. Take a database snapshot first; rollback = redeploy the previous image **and** restore the snapshot if a migration had changed the schema (see DISASTER_RECOVERY.md). Prefer expand/contract migrations (add → backfill → switch → remove) so old and new images can overlap.

## Local production-like run

```bash
AUTH_SECRET=$(openssl rand -base64 48) docker compose up --build   # http://localhost:8080
```
(compose sets `ALLOW_INSECURE_LOCAL=true` so cookies work over plain HTTP locally; never use that flag on a real domain.)

## Observability

Structured Pino JSON logs with a request id on every line (`X-Request-Id` is echoed to clients; every trace event stores the request id in metadata). Alerts cover integrity, delays, scans and external-data health. Add your platform's log shipping and uptime monitor on `/ready`.

## Render (what is deployed now)

`render.yaml` defines one Docker web service (`seedchain-tisha`) and one PostgreSQL database (`seedchain-db`). Live URL: **https://seedchain-tisha.onrender.com** (also the `PUBLIC_TRACE_BASE_URL`, so every QR points there).

* **Free plans are for testing.** The free web service sleeps when idle (first request can take about 50 s) and the free database is **deleted after 30 days**. Switch both `plan:` values in `render.yaml` to a paid plan before real farmers use it, and take backups.
* Created from the public repo URL, so pushes do **not** auto-deploy: use *Manual Deploy → Deploy latest commit* in the Render dashboard (or connect the GitHub account to Render to enable auto-deploy).
* Free Render has no shell. Create an admin by running the CLI locally against the database's *External Database URL*:
  `DATABASE_URL='<external url>?sslmode=require' DATABASE_SSL=require ADMIN_EMAIL=… ADMIN_NAME=… ADMIN_PASSWORD=… node artifacts/api-server/dist/cli/create-admin.mjs`
* PAU (pau.edu) answers **403 to Render's network**. Its weekly check will therefore fail (the last good data stays visible as *Cached* with an alert). Refresh it from a machine that can reach PAU:
  `DATABASE_URL='<external url>?sslmode=require' DATABASE_SSL=require node artifacts/api-server/dist/cli/run-source.mjs pau_potato_punjab`
* FAOSTAT works from Render. Mandi prices need `DATA_GOV_IN_API_KEY` set in the service's environment; weather needs farms with coordinates.
* The Vercel project hosts only the static frontend with no API, so it cannot sign anyone in. Use the Render URL.

### Verified on production (2026-10-08)
28 of 29 automated checks pass against the live URL: readiness, SPA, admin login, FAOSTAT ingestion from Render, farmer registration, admin approval, farm/lot/listing, QR URL on the production host, public trace with no private data leaked, scan recording, customer order with stock reservation, order transitions to delivered, role-based blocking, bad-login rejection, security headers. The 29th is the PAU 403 above.
Data from that run is labelled `[E2E TEST]` (accounts `e2e-*@e2e.seedchain.test`); remove it before onboarding real farmers.
