# Security

This is an engineering audit of the pilot build, not a certification. No penetration test by an independent party has been performed.

## Audit results

| Area | Finding in the original repo | Now |
|---|---|---|
| Authentication | Unsalted `HMAC(password)` hashes; default secret `"seedchain-secret-key"`; tokens never expired and could not be revoked; frontend demo accounts logged in without a password | `scrypt` (N=32768, r=8, p=1, per-user salt, constant-time compare); server-side sessions (random 256-bit token, only its HMAC stored), 72 h expiry, logout revokes, suspend/reject revoke all sessions; no default secrets (production refuses to boot without a strong `AUTH_SECRET`); demo login removed; old password hashes are verified once and upgraded to scrypt |
| Authorization | Any logged-in user could edit any batch, order or user; admin could be self-registered | Role + approval status enforced per route from the DB row; ownership checked in every service (404 for other people's records, so ids cannot be probed); admin accounts only via CLI |
| IDOR / privilege escalation | `/dashboard/:userId`, `PUT /users/:id`, `PUT /orders/:id` etc. | Removed. Negative tests cover cross-farmer lot/event/QR/order access, customer attempts on every farmer/admin endpoint, role forgery headers |
| Mass assignment | Raw `req.body` inserts | Every body is parsed with the OpenAPI-generated Zod schema; unknown fields are dropped; role/status/inventory/owner/verification fields are never client-settable (tested) |
| SQL injection | n/a (Drizzle) | All queries are parameterised; ILIKE patterns escape `% _ \`; tests send injection strings |
| XSS | Several pages rendered unsanitised data | React text rendering only (no `dangerouslySetInnerHTML`/`innerHTML`/`eval` in app code); strict CSP (`script-src 'self'`, no inline scripts, `frame-ancestors 'none'`, `object-src 'none'`); user text returned as JSON and shown as text |
| CSRF | n/a (bearer in localStorage) | Cookie is `HttpOnly; SameSite=Lax; Secure` and every non-GET request needs `X-SeedChain-CSRF: 1`, which forms/cross-site requests cannot send; CORS is disabled unless `CORS_ORIGINS` is set |
| CORS | `cors()` open to all | Off by default (same origin); explicit allow-list with credentials otherwise |
| Rate limiting | None | API 300/min, public trace + scans 60/min, failed logins 20/15 min (per IP, in memory; see limitations) |
| Secrets | Supabase keys committed, `.env` files tracked | Removed from the repo; `.env.example` only; the SPA bundle was checked: it contains no `AUTH_SECRET`/`DATABASE_URL`/API keys; the external API key only exists server-side and is redacted from stored lineage |
| Public endpoint abuse / QR enumeration | Sequential `TRK-` ids on a public API | 256-bit random tokens, constant 404 for malformed/unknown, 410 without data for revoked/replaced, rate limit, scan/alert logging |
| Private data exposure | Driver names, internal ids, emails in list endpoints | Public trace uses an explicit allow-list projection; farmer phone only to customers with an order, customer phone only to the fulfilling farmer/admin; tests grep the public JSON for emails, phones, addresses, private notes |
| Unsafe file handling | n/a | The system accepts no uploads and writes no files |
| Dependencies | – | `pnpm audit --prod`: **0 known vulnerabilities** after pinning `proxy-addr ≥ 2.0.8` (critical IP-spoofing, relevant because rate limits use client IP), `qs ≥ 6.16`, `body-parser ≥ 2.3`; pnpm `minimumReleaseAge` supply-chain guard kept; CI should run `pnpm audit --prod` regularly |
| Transport / headers | – | Helmet: HSTS, `nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options`, `Permissions-Policy` (camera only for our origin) |
| Input size | – | JSON body limit 100 kB; field-level max lengths from OpenAPI |
| Integrity | – | CHECK constraints on inventory, append-only triggers for events and audit logs, idempotency keys, row locking, periodic reserved/sold reconciliation |
| Logging | – | Pino with request ids; `Authorization`/cookie headers redacted; public tokens and passwords are not logged (query strings are stripped from request logs) |

## Verified by automated tests

`artifacts/api-server/test/negative.test.ts` (38 tests) covers: wrong/unknown credentials, admin self-registration, CSRF, expired and revoked sessions, suspended users, forged role headers, legacy-password upgrade, cross-farmer access, customer attempts, pending/rejected farmers, order visibility, negative/zero/huge quantities, **12 concurrent buyers never over-reserving**, duplicate order submission, double cancel, illegal transitions, loss beyond stock, raw-SQL tampering blocked by triggers/constraints, idempotent and conflicting offline replays, future-dated events, unknown/malformed/SQLi/traversal tokens, duplicate scans, QR replace/revoke semantics, XSS strings, mass assignment, malformed/oversized JSON, SQL-injection strings, security headers.

## Known limitations (read before a real pilot)

1. **Rate limiting is per instance and in memory.** With several instances, add an edge limiter (CDN/WAF). It trusts `X-Forwarded-For` according to `TRUST_PROXY`; set it to your real proxy depth.
2. **No e-mail verification, password reset, MFA or account lockout** beyond rate limiting. Admin approval gates farmers, but customers can self-register with any e-mail. Recommended before wider rollout: password reset by e-mail/SMS and admin MFA. Until then, an admin must handle forgotten passwords out of band (a CLI/admin reset is not yet implemented).
3. **A printed QR proves a record exists, not that the physical produce matches** (labels can be copied). Mitigations are alerts, revocation and the printed lot details.
4. **Append-only is enforced by triggers**, which a database superuser can disable; restoring a doctored backup is also possible. Use least-privilege DB credentials (the app role should not own the schema or be a superuser), restrict access to backups, and keep database audit logging on at the provider. No hash-chaining or external anchoring is implemented, so the data is **not tamper-proof**.
5. **Self-reported data.** Farmers record quantities, grades and storage themselves; nobody independently inspects them. Admin approval verifies the farmer's identity process, not each lot.
6. The scheduler runs inside the API process (advisory-locked so only one instance runs a job). A dedicated worker would be cleaner at scale.
7. Orders carry no payment processing; `totalAmount` is a record of the agreed price only.
8. SSE change notices carry topic and ids only, but a signed-in user's stream receives notices for their own entities; clients always refetch through the authorised API.
9. No independent security review or penetration test has been done; do not describe the platform as "certified" or "secure by audit".
