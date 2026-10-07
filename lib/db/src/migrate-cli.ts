import { pool } from "./index";
import { runMigrations } from "./migrate";

runMigrations(pool)
  .then(() => {
    console.log("Migrations applied");
    return pool.end();
  })
  .catch(async (err) => {
    console.error("Migration failed", err);
    await pool.end();
    process.exit(1);
  });
