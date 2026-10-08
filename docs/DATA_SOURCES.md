# Data sources and honesty rules

Every external datum in SeedChain has: **source, organisation, URL, geography, frequency, observation date, last sync, licence/attribution, and a freshness label.** Registry files live in `data/source_registry/*.json` and are synced into the database at server start.

| Source | Status | Class | What we take | Cadence |
|---|---|---|---|---|
| PAU "Potato Cultivation in Punjab" (Dept. of Horticulture table) | **Automated, verified** | historical | district area, production, yield, rank, share (2023-24) | weekly check; annual data |
| FAOSTAT QCL bulk file | **Automated, verified** | historical | India potato area, production, yield 1961-2024 | monthly check; annual data |
| data.gov.in mandi prices | Automated, **needs `DATA_GOV_IN_API_KEY`** | operational_external | latest available daily mandi observations | daily; *not real-time* |
| Open-Meteo | Automated, only for farms with coordinates | operational_external | current temperature, precipitation, humidity | hourly fetch; model output |
| AGMARKNET, DES, NHB, ICAR-CPRI, IMD | **Not integrated** (reference links only) | – | nothing is ingested | – |

## Rules the code enforces
- Pipeline: `SOURCE → FETCH → RAW (sha256) → VALIDATE → NORMALISE → MASTER`. Raw payloads are stored untouched; rejected rows are counted, never silently dropped.
- Freshness labels: `CURRENT`, `CACHED` (last run failed, older validated data shown with an alert), `STALE`, `NO_DATA`, `NOT_INTEGRATED`.
- "Live"/"real-time" is only used for the SSE stream of our own database. Daily and annual data are never called live.
- No source → the UI shows "No data yet" / "Data unavailable". Nothing is estimated or invented.
- Validation: plausibility bounds (e.g. yield cross-checked against production/area), unit checks, date checks.
- We make **no claim of government verification**. PAU and FAO figures are republished with attribution and citation.

## Verified on 2026-10-07 (local run)
- PAU: 23 records, 0 rejected; Jalandhar ranks first (25,125 ha, 707,018 t).
- FAOSTAT: 192 records, 0 rejected.
- Not verified here: data.gov.in (no key supplied), Open-Meteo against a real farm with coordinates.

Admin can trigger a run at `POST /api/admin/integrations/{source}/run` and see health at `/api/data/sources`.

## Mandi prices: how to switch them on (status 2026-10-08: NO DATA YET)

Why we want them: farmers and customers see what wholesale mandis paid for potato recently, as outside context next to SeedChain's own listing prices. It is always labelled *External market information*; it is not a SeedChain transaction price and is never used to set one.

**Checked on 2026-10-08, honest findings**
* The source is data.gov.in resource `9ef84268-d588-465a-a308-a864a43d0070` (AGMARKNET daily prices, published by the Ministry of Agriculture). It needs a free personal API key. Nothing can be fetched without one, so the sync is *skipped* (see the Ingestion_Runs sheet).
* From the development Mac, `api.data.gov.in` drops the TLS connection (ECONNRESET), so it may also refuse non-Indian hosting. If the Render service cannot reach it, use the CSV route below.
* The newer portal `agmarknet.gov.in` has its own API, but its report endpoint demands a CAPTCHA. SeedChain does not bypass CAPTCHAs, so it is not used.

**Route A: API key (live, daily)**
1. Register at https://data.gov.in, then *My Account → Generate API key*.
2. Render dashboard → service `seedchain-tisha` → Environment → add `DATA_GOV_IN_API_KEY` → save (redeploys).
3. Sign in as admin → Data sources → run *Current daily price…*. Status must become SUCCESS with records. If it shows a network error, use Route B.

**Route B: CSV you download yourself (real records, not live)**
1. On the data.gov.in resource page (or the AGMARKNET portal, where you solve the CAPTCHA yourself) download a CSV for potato in Punjab.
2. `DATABASE_URL='<external url>?sslmode=require' DATABASE_SSL=require node artifacts/api-server/dist/cli/import-mandi.mjs prices.csv`
3. Same validation, raw-payload retention and lineage as the API route. Rows outside plausible ranges are rejected and counted.

After either route, rebuild the workbook (`scripts/build-workbook.py build …`): the `Mandi_Prices` sheet fills with the records and `Ingestion_Runs` shows the run.
