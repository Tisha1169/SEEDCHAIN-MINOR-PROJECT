# Disaster recovery

PostgreSQL is the **only** stateful component. The API container holds no files and can be recreated at any time. Everything that makes a printed QR work (lot, token, version, status) and the full event/audit history lives in the database, so **restoring the database restores every QR and every trace page**.

## Targets (set yours and test them)

| | Suggested pilot value |
|---|---|
| RPO (max data loss) | ≤ 5 minutes with point-in-time recovery; ≤ 24 h with daily snapshots only |
| RTO (time to restore) | ≤ 1 hour |

## Backups

1. **Managed provider backups (primary).** Enable automated daily snapshots **and** point-in-time recovery (WAL archiving), retention ≥ 14 days, in a different region/zone from the primary where possible.
2. **Logical dump (secondary, independent of the provider)**, e.g. nightly from a scheduler:
   ```bash
   pg_dump --format=custom --no-owner --file=seedchain-$(date +%F).dump "$DATABASE_URL"
   ```
   Encrypt it (`age`/`gpg`) and copy it off-platform. The dump contains personal data (names, phone numbers, e-mails): store it as sensitive.
3. **Before every deploy that includes a migration:** take a snapshot (or a dump) and note its id in the release notes.

## Restore

```bash
createdb seedchain_restore
pg_restore --no-owner --dbname=seedchain_restore seedchain-2026-10-07.dump
# smoke-check before cutting over
psql seedchain_restore -c "select count(*) from lots; select count(*) from qr_codes where status='ACTIVE'; select count(*) from traceability_events;"
```
Then point `DATABASE_URL` at the restored database and restart the API (`/ready` must return 200). With provider PITR, restore to a new instance at the chosen timestamp and switch the URL.

Sessions are in the database: after restoring an old backup, users whose sessions did not exist at that time simply sign in again. The restored database must keep the **same `AUTH_SECRET`** only if you want existing sessions to remain valid (otherwise everyone signs in again; no data is lost).

## Migrations: recovery and rollback

* Migrations are forward-only and tracked in `drizzle.__drizzle_migrations`; applying is serialised by an advisory lock and pending migrations run inside a transaction.
* **Rollback = restore the pre-deploy snapshot and redeploy the previous image.** There are no automatic down-migrations. Prefer expand/contract changes so the previous image keeps working against the new schema.
* If a migration fails half-way the transaction rolls back and the API refuses to become ready; fix forward or restore.
* The one-time import from the old five-role schema never drops anything: old tables are renamed `legacy_*` (and their indexes/sequences/types), data is copied into the new tables once (`legacy_import_log` marks completion) and the originals stay for audit. Legacy storage-operator and logistics accounts are imported as **suspended customers** for an admin to review.

## QR persistence and event history

* QR tokens, versions and statuses are rows, never regenerated from anything; a restored database yields identical QR behaviour (including revoked/replaced states).
* The printed URL contains the **domain**. Keep `PUBLIC_TRACE_BASE_URL`'s domain (or a permanent redirect from it) for as long as labels exist in the field.
* `traceability_events` and `audit_logs` are append-only through the application and database triggers; restoring a backup restores them as they were. Do not "repair" history with manual SQL; add a correction event instead. If a restore loses recent events, farmers' offline queues may still hold unsynced actions, which replay idempotently.

## Drill checklist (do this before the pilot and quarterly)

- [ ] Restore last night's dump into a scratch database and run the smoke queries above
- [ ] Start a staging API against it; open a real printed QR → correct lot
- [ ] Confirm `/ready` is 200 and the admin dashboard numbers match expectations
- [ ] Record the time taken (RTO) and the age of the data (RPO)

## Other failure modes

| Failure | Behaviour |
|---|---|
| API instance dies | stateless; platform restarts it; SSE clients reconnect (EventSource) and refetch |
| Database unreachable | `/ready` 503; UI shows "Service unavailable" (never sample data); farmers' actions queue offline and replay |
| data.gov.in / Open-Meteo down | runs marked `FAILED`, alert raised, last successful time shown; nothing else affected |
| Lost `AUTH_SECRET` | sessions invalidated (re-login); no data loss |
| Leaked admin password | run `cli/create-admin.mjs` with the same e-mail and a new password: it updates the password and revokes all of that admin's sessions. Rotate `AUTH_SECRET` to invalidate every session platform-wide |
