import pg from "pg";

/** Recreates the test database schema from the real migrations once per run. */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgres://seedchain:seedchain@localhost:55432/seedchain_test";
  const pool = new pg.Pool({ connectionString: url });
  await pool.query("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
  const { runMigrations } = await import("@workspace/db/migrate");
  await runMigrations(pool, () => undefined);
  await pool.end();
}
