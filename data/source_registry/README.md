# Source registry

One JSON file per external data source: publisher, canonical URL, dataset, geography, frequency, units, licence, usage notes, whether it is integrated automatically, imported from a file, or kept as a reference only, and the result of the last reachability check. The API syncs these files into the `data_sources` table at start-up; the admin "Data health" screen shows their live status and timestamps.

Add a source by adding a file here and (if automated) an adapter in `artifacts/api-server/src/services/external/adapters`. Do not add a source whose data cannot be fetched and validated; add it as `reference_only` with an honest `integrationNote` instead.
