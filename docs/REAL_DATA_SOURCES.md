# Real data sources

Three kinds of data are kept strictly separate:

| Kind | Origin | Where it lives |
|---|---|---|
| **Operational data** | created by actual SeedChain use (farmers, customers, admins) | `lots`, `traceability_events`, `orders`, … |
| **External live data** | pulled by the backend from outside sources | `market_price_observations`, `weather_observations` |
| **Historical data** | accumulated external observations (used for the dashboard trend line) | same tables, queried by date |

External data never writes into traceability events, and operational history never depends on an external API being up.

## Ingestion pipeline (backend only)

```
external API → fetch (20 s timeout) → validate → normalise → upsert → run record (lineage) → NOTIFY → UI
```
The browser never calls third-party APIs, so no API key reaches the frontend. Every pull creates one `external_ingestion_runs` row: `source`, `source_endpoint` (secrets redacted), `request_params`, `processing_version`, `status` (`SUCCESS`/`PARTIAL`/`FAILED`/`SKIPPED`), `record_count`, `error`, `started_at`, `finished_at`. Every observation row references its run and stores `retrieved_at`, the source's own observation time and the processing version.

**Failure behaviour:** the run is stored as `FAILED`, an `EXTERNAL_DATA_FAILURE` alert is raised (auto-resolved on the next success), and screens show *"Last successful update: …"*. There are **no fallback or fabricated values**: with no data the UI says so ("No market prices stored yet", "Weather data temporarily unavailable").

## 1. Government mandi prices: data.gov.in (AGMARKNET daily prices)

* Endpoint: `GET {DATA_GOV_IN_BASE_URL}/resource/{DATA_GOV_IN_RESOURCE_ID}?api-key=…&format=json&limit=500&filters[commodity]=Potato`
* Default resource id `9ef84268-d588-465a-a308-a864a43d0070` ("Current daily price of various commodities from various markets (mandis)"). **Verify the id and the field names against the current data.gov.in catalogue before the pilot**; if the resource changes, set `DATA_GOV_IN_RESOURCE_ID`.
* **Requires a free API key** (`DATA_GOV_IN_API_KEY`). Without it the run is recorded as `SKIPPED` (visible on *Admin → Data sources*) and no prices are shown. Obtaining the key is a manual step that must be done by the account owner.
* Stored: observation date, state, district, market, commodity, variety, grade, min/max/modal price (INR per quintal as published), arrival quantity only if the source provides it (otherwise `NULL`).
* Validation: rejects rows without date/state/market/commodity, non-numeric or negative prices, and `min > max`. Rejections make the run `PARTIAL` with the count.
* Schedule: every `MARKET_INGEST_INTERVAL_MINUTES` (default 360) + on demand by an admin. Idempotent upsert on (source, date, state, market, commodity, variety, grade).
* Used for: the farmer *Market & weather* page (labelled **"External market information"** with the source and last-updated time), the admin price-trend chart, and the lot's **INDICATIVE MARKET VALUE** = available quantity × latest modal price (preferring the farm's state). That figure is explicitly *not* a SeedChain transaction price.

## 2. Weather: Open-Meteo

* Endpoint: `GET {OPEN_METEO_BASE_URL}/v1/forecast?latitude=…&longitude=…&current=temperature_2m,relative_humidity_2m,precipitation,weather_code`. No API key. Check Open-Meteo's terms for your usage tier (free tier is for non-commercial use; a commercial plan or self-hosting may be required in production).
* Per farm with GPS coordinates, hourly (`WEATHER_INGEST_INTERVAL_MINUTES`) and immediately when a farm with coordinates is created. Stored: temperature, humidity, precipitation, WMO weather code and description, observation time, retrieval time.
* Used for: farmer weather cards and one rule in the risk engine (hot weather with non-cold storage).
* Verified live during development: a Nakodar (Punjab) farm returned a real current observation with source, time and processing version recorded.

## 3. Device location (optional)

The browser Geolocation API is used only when the user presses "Use my location" (farm form) or ticks "attach GPS" when recording a delivery, and only after the browser permission prompt. Coordinates are never fabricated; they are optional.

## Not claimed

* Weather and prices are labelled with their source and age. Nothing is called "live" unless the page shows when it was retrieved.
* The risk rating is a transparent rule set (`rules-v1`), **not** machine learning, and no forecast is produced.
