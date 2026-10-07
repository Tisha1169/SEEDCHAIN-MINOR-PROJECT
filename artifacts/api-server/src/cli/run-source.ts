/**
 * Run one automated source through the normal pipeline from the machine you are on. Use it when a source
 * refuses requests from the hosting provider's network (e.g. a 403 from a cloud IP) but answers from elsewhere.
 * Same fetch, validation, raw-payload retention and lineage as the scheduler; nothing is fabricated.
 *
 *   DATABASE_URL=... node dist/cli/run-source.mjs pau_potato_punjab
 */
import "dotenv/config";
import { pool } from "@workspace/db";
import { runSource } from "../services/external/ingestion";
import { syncRegistry } from "../services/external/registry";

const key = process.argv[2];
if (!key) {
  console.error("Usage: run-source <pau_potato_punjab|faostat_potato_india|datagov_mandi_daily|open_meteo_current>");
  process.exit(1);
}
syncRegistry()
  .then(() => runSource(key as Parameters<typeof runSource>[0]))
  .then(async (run) => {
    console.log(`${run.status}: fetched ${run.fetchedCount}, accepted ${run.recordCount}, rejected ${run.rejectedCount}${run.error ? ` (${run.error})` : ""}`);
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e.message);
    await pool.end();
    process.exit(1);
  });
