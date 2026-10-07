# Pilot guide (Jalandhar, potato)

Read `PILOT_RUNBOOK.md` for operations. This page is the honest checklist of what is ready and what only you can do.

## Ready
- Three roles, admin approval of farmers, lots, secure random-token QR, append-only events, transactional inventory, order state machine, live trace page, QR disable/replace/revoke, anomaly review, recall, reviews with moderation.
- Authentic reference data: PAU district table, FAOSTAT India series (see `DATA_SOURCES.md`).
- 102 backend tests, 11 frontend tests, typecheck clean.

## Only you can do
1. **Real-phone QR test:** print a label from a lot, scan with iPhone camera and Android camera, plus the in-app scanner, over mobile data (needs an https URL, i.e. a deployed `PUBLIC_TRACE_BASE_URL`, and https for camera access).
2. **data.gov.in:** register for an API key, set `DATA_GOV_IN_API_KEY`, run the `datagov_mandi_daily` source and check the Punjab/Jalandhar potato rows.
3. **Real farmers:** onboard 3-5 real farmers and verify them as admin. The app contains no invented farmers; local `*.test` accounts are for development only.
4. **Language review** by native speakers (`I18N.md`).
5. **Production secrets, domain, TLS, backups** per `DEPLOYMENT.md` and `DISASTER_RECOVERY.md`.

## Not built (honestly)
Punjab map, farm/customer intelligence screens, demand forecasting, database-grounded assistant, PWA/offline shell, full-page translation, and UIs for recall/anomaly/review moderation (APIs exist).
