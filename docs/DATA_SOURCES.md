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
