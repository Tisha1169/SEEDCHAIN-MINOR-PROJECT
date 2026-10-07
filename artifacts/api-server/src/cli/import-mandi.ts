/**
 * Fallback for when api.data.gov.in is unreachable from the server's network: import a JSON or CSV file
 * downloaded from the data.gov.in portal for the "Current daily price of various commodities from various
 * markets (Mandi)" resource. Same validation, raw-payload retention and lineage as the API adapter.
 *
 *   node dist/cli/import-mandi.mjs /path/to/export.json
 */
import "dotenv/config";
import { pool } from "@workspace/db";
import { importMandiFile } from "../services/external/adapters/mandi";

const file = process.argv[2];
if (!file) {
  console.error("Usage: import-mandi <file.json|file.csv>");
  process.exit(1);
}
importMandiFile(file)
  .then(async (run) => {
    console.log(`${run.status}: fetched ${run.fetchedCount}, accepted ${run.recordCount}, rejected ${run.rejectedCount}${run.error ? ` (${run.error})` : ""}`);
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e.message);
    await pool.end();
    process.exit(1);
  });
