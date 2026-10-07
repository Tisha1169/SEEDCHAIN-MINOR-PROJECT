import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

/**
 * DATABASE_SSL=require enables TLS (most managed Postgres providers need it).
 * DATABASE_SSL_REJECT_UNAUTHORIZED=false is only for providers with
 * self-signed chains; prefer leaving it unset.
 */
const ssl =
  process.env.DATABASE_SSL === "require"
    ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
    : undefined;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  ssl,
});

export const db = drizzle(pool, { schema });
export type Db = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;

export * from "./schema";
export type { PoolClient } from "pg";
