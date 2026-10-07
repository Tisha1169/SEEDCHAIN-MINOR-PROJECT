import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

/**
 * Applies versioned SQL migrations and, once, imports data from the
 * pre-transformation five-role schema.
 *
 * Legacy handling is deliberately non-destructive: old tables and enum
 * types are renamed to `legacy_*` and kept for audit. Nothing is dropped.
 */
const LEGACY_TABLES = [
  "users",
  "farms",
  "seed_batches",
  "harvests",
  "storage_records",
  "transport_records",
  "orders",
  "shipment_tracking",
] as const;

const LEGACY_TYPES = [
  "user_role",
  "batch_status",
  "quality_grade",
  "storage_status",
  "transport_status",
  "order_status",
  "shipment_tracking_status",
] as const;

export function migrationsFolder(): string {
  if (process.env.MIGRATIONS_DIR) return process.env.MIGRATIONS_DIR;
  const here = path.dirname(fileURLToPath(import.meta.url));
  // Source layout (lib/db/src → lib/db/migrations) or bundled API (dist/migrations).
  const candidates = [path.resolve(here, "..", "migrations"), path.resolve(here, "migrations")];
  return candidates.find((c) => fs.existsSync(path.join(c, "meta", "_journal.json"))) ?? candidates[0];
}

async function tableExists(client: pg.PoolClient, name: string): Promise<boolean> {
  const r = await client.query(`SELECT to_regclass($1) IS NOT NULL AS ok`, [`public.${name}`]);
  return r.rows[0].ok;
}

/**
 * Index (and therefore primary/unique constraint) names are schema-global in
 * Postgres, so they must move out of the way too. Idempotent.
 */
async function renameLegacyIndexes(client: pg.PoolClient): Promise<void> {
  const r = await client.query(
    `SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename LIKE 'legacy\\_%' AND indexname NOT LIKE 'legacy\\_%'`,
  );
  for (const row of r.rows) {
    await client.query(`ALTER INDEX "${row.indexname}" RENAME TO "legacy_${row.indexname}"`);
  }
  const seqs = await client.query(
    `SELECT sequencename FROM pg_sequences WHERE schemaname='public' AND sequencename = ANY($1::text[])`,
    [LEGACY_TABLES.map((t) => `${t}_id_seq`)],
  );
  for (const row of seqs.rows) {
    await client.query(`ALTER SEQUENCE "${row.sequencename}" RENAME TO "legacy_${row.sequencename}"`);
  }
}

/** Detects the legacy schema (serial ids + seed_batches) and renames it out of the way. */
async function quarantineLegacySchema(client: pg.PoolClient, log: (m: string) => void): Promise<boolean> {
  const hasLegacy = (await tableExists(client, "seed_batches")) && !(await tableExists(client, "lots"));
  if (!hasLegacy) {
    if (await tableExists(client, "legacy_seed_batches")) await renameLegacyIndexes(client);
    return false;
  }
  log("Legacy five-role schema detected; renaming legacy tables to legacy_*");
  await client.query("BEGIN");
  try {
    for (const t of LEGACY_TABLES) {
      if (await tableExists(client, t)) await client.query(`ALTER TABLE "${t}" RENAME TO "legacy_${t}"`);
    }
    for (const ty of LEGACY_TYPES) {
      const r = await client.query(`SELECT 1 FROM pg_type WHERE typname=$1`, [ty]);
      if (r.rowCount) await client.query(`ALTER TYPE "${ty}" RENAME TO "legacy_${ty}"`);
    }
    await renameLegacyIndexes(client);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
  return true;
}

const token = () => randomBytes(32).toString("base64url");

const STATE_CODES: Record<string, string> = {
  punjab: "PB", haryana: "HR", "uttar pradesh": "UP", "west bengal": "WB", bihar: "BR", gujarat: "GJ",
  "madhya pradesh": "MP", maharashtra: "MH", karnataka: "KA", "himachal pradesh": "HP", rajasthan: "RJ",
  delhi: "DL", assam: "AS", odisha: "OD", "tamil nadu": "TN", kerala: "KL", telangana: "TS",
  "andhra pradesh": "AP", jharkhand: "JH", chhattisgarh: "CG", uttarakhand: "UK", meghalaya: "ML",
  "jammu and kashmir": "JK", nagaland: "NL", sikkim: "SK", tripura: "TR", goa: "GA", manipur: "MN",
  mizoram: "MZ", "arunachal pradesh": "AR",
};

export function stateCode(state: string | null | undefined): string {
  if (!state) return "XX";
  const k = state.trim().toLowerCase();
  if (STATE_CODES[k]) return STATE_CODES[k];
  for (const [name, code] of Object.entries(STATE_CODES)) if (k.includes(name)) return code;
  return "XX";
}

/** Copies legacy rows into the new schema once (guarded by legacy_import_log). */
async function importLegacyData(client: pg.PoolClient, log: (m: string) => void): Promise<void> {
  if (!(await tableExists(client, "legacy_seed_batches"))) return;
  await client.query(`CREATE TABLE IF NOT EXISTS legacy_import_log (id int PRIMARY KEY, imported_at timestamptz NOT NULL DEFAULT now(), summary jsonb)`);
  const done = await client.query(`SELECT 1 FROM legacy_import_log WHERE id=1`);
  if (done.rowCount) return;

  log("Importing legacy data into the three-role schema");
  await client.query("BEGIN");
  try {
    const summary: Record<string, number> = {};
    const userMap = new Map<number, string>();
    const users = await client.query(`SELECT * FROM legacy_users ORDER BY id`);
    for (const u of users.rows) {
      // buyer → customer. storage/logistics roles no longer exist: those accounts
      // become suspended customers so they cannot act until an admin reviews them.
      const role = u.role === "admin" ? "admin" : u.role === "farmer" ? "farmer" : "customer";
      const status = u.role === "storage" || u.role === "logistics" ? "suspended" : "active";
      const r = await client.query(
        `INSERT INTO users (name, email, password_hash, phone, role, status, location, created_at)
         VALUES ($1, lower($2), $3, $4, $5, $6, $7, $8) RETURNING id`,
        [u.name, u.email, `legacy-hmac$${u.password_hash}`, u.phone, role, status, u.location, u.created_at],
      );
      userMap.set(u.id, r.rows[0].id);
      if (role === "farmer") {
        await client.query(
          `INSERT INTO farmer_profiles (user_id, public_name, state) VALUES ($1, $2, $3)`,
          [r.rows[0].id, u.name, u.location],
        );
      }
    }
    summary.users = users.rowCount ?? 0;

    const farmMap = new Map<number, string>();
    const farms = await client.query(`SELECT * FROM legacy_farms ORDER BY id`);
    for (const f of farms.rows) {
      const r = await client.query(
        `INSERT INTO farms (farmer_id, name, village, state, size_hectares, soil_type, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [userMap.get(f.farmer_id), f.name, f.location, f.location, f.size_hectares, f.soil_type, f.created_at],
      );
      farmMap.set(f.id, r.rows[0].id);
    }
    summary.farms = farms.rowCount ?? 0;

    const lotMap = new Map<number, string>();
    const batches = await client.query(`
      SELECT b.*, COALESCE((SELECT SUM(h.quantity_kg) FROM legacy_harvests h WHERE h.batch_id=b.id), 0) AS harvested_sum
      FROM legacy_seed_batches b ORDER BY b.id`);
    for (const b of batches.rows) {
      const farmerId = userMap.get(b.farmer_id)!;
      let farmId = b.farm_id ? farmMap.get(b.farm_id) : undefined;
      if (!farmId) {
        const existing = await client.query(`SELECT id FROM farms WHERE farmer_id=$1 ORDER BY created_at LIMIT 1`, [farmerId]);
        farmId = existing.rows[0]?.id;
        if (!farmId) {
          const r = await client.query(
            `INSERT INTO farms (farmer_id, name, state) VALUES ($1, 'Imported farm (legacy batch without farm)', 'Unknown') RETURNING id`,
            [farmerId],
          );
          farmId = r.rows[0].id as string;
        }
      }
      const farm = (await client.query(`SELECT state FROM farms WHERE id=$1`, [farmId])).rows[0];
      let productId = (
        await client.query(`SELECT id FROM products WHERE farmer_id=$1 AND name='Potato' AND variety=$2`, [farmerId, b.variety])
      ).rows[0]?.id;
      if (!productId) {
        productId = (
          await client.query(`INSERT INTO products (farmer_id, name, variety) VALUES ($1, 'Potato', $2) RETURNING id`, [farmerId, b.variety])
        ).rows[0].id;
      }
      const preHarvest = b.status === "planted" || b.status === "growing";
      const harvested = Number(b.harvested_sum) > 0 ? Number(b.harvested_sum) : preHarvest ? 0 : Number(b.quantity_kg);
      const sold = b.status === "sold" ? harvested : 0;
      const status = b.status === "planted" ? "CREATED" : b.status === "growing" ? "GROWING" : b.status === "sold" ? "SOLD_OUT" : "HARVESTED";
      const seq = (await client.query(`SELECT nextval('lot_code_seq') AS n`)).rows[0].n;
      const lotCode = `LOT-${new Date(b.created_at).getUTCFullYear()}-${stateCode(farm.state)}-${String(seq).padStart(6, "0")}`;
      const lot = await client.query(
        `INSERT INTO lots (lot_code, farmer_id, farm_id, product_id, planting_date, expected_harvest_date, harvested_qty, sold_qty,
                           quality_grade, origin, status, private_notes, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
        [lotCode, farmerId, farmId, productId, b.planting_date, b.expected_harvest_date, harvested, sold, b.quality_grade,
         farm.state ?? "Unknown", status, `Imported from legacy batch ${b.batch_code}. ${b.notes ?? ""}`.trim(), b.created_at],
      );
      const lotId = lot.rows[0].id;
      lotMap.set(b.id, lotId);
      await client.query(
        `INSERT INTO qr_codes (lot_id, public_token, version, status, created_by) VALUES ($1,$2,1,'ACTIVE',$3)`,
        [lotId, token(), farmerId],
      );
      await client.query(
        `INSERT INTO traceability_events (lot_id, event_type, event_time, actor_user_id, actor_role, quantity_after, status, reason, source, metadata)
         VALUES ($1,'LOT_CREATED',$2,$3,'farmer',0,$4,'Imported from legacy batch','legacy_migration',$5)`,
        [lotId, b.created_at, farmerId, status, JSON.stringify({ legacyBatchCode: b.batch_code })],
      );
      const hv = await client.query(`SELECT * FROM legacy_harvests WHERE batch_id=$1 ORDER BY id`, [b.id]);
      for (const h of hv.rows) {
        await client.query(
          `INSERT INTO traceability_events (lot_id, event_type, event_time, actor_user_id, actor_role, quantity_change, reason, source, metadata)
           VALUES ($1,'HARVEST_RECORDED',$2,$3,'farmer',$4,'Imported legacy harvest','legacy_migration',$5)`,
          [lotId, h.harvest_date, farmerId, h.quantity_kg, JSON.stringify({ qualityGrade: h.quality_grade })],
        );
      }
    }
    summary.lots = batches.rowCount ?? 0;

    const storage = await client.query(`SELECT * FROM legacy_storage_records ORDER BY id`);
    for (const s of storage.rows) {
      const lotId = lotMap.get(s.batch_id);
      if (!lotId) continue;
      const farmerId = (await client.query(`SELECT farmer_id FROM lots WHERE id=$1`, [lotId])).rows[0].farmer_id;
      await client.query(
        `INSERT INTO lot_storage_records (lot_id, farmer_id, storage_type, storage_location, storage_start, storage_end, temperature_c, notes)
         VALUES ($1,$2,'cold_storage',$3,$4,$5,$6,$7)`,
        [lotId, farmerId, [s.facility_name, s.location].filter(Boolean).join(", "), s.received_at ?? s.created_at, s.released_at,
         s.temperature_celsius, `Imported from legacy storage-operator record. ${s.notes ?? ""}`.trim()],
      );
    }
    summary.storageRecords = storage.rowCount ?? 0;

    // Legacy orders are imported as historical records. Inventory counters are
    // only moved when the lot can absorb them; otherwise the order is cancelled
    // with an explicit reason rather than silently violating constraints.
    const statusMap: Record<string, string> = {
      pending: "PENDING", confirmed: "ACCEPTED", dispatched: "DISPATCHED", delivered: "DELIVERED", cancelled: "CANCELLED",
    };
    const orders = await client.query(`SELECT * FROM legacy_orders ORDER BY id`);
    let i = 0;
    for (const o of orders.rows) {
      const lotId = lotMap.get(o.batch_id);
      if (!lotId) continue;
      const lot = (await client.query(`SELECT farmer_id, available_qty FROM lots WHERE id=$1`, [lotId])).rows[0];
      let status = statusMap[o.status] ?? "PENDING";
      let cancelReason: string | null = null;
      const qty = Number(o.quantity_kg);
      if (status !== "CANCELLED") {
        if (Number(lot.available_qty) >= qty) {
          await client.query(`UPDATE lots SET reserved_qty = reserved_qty + $2 WHERE id=$1`, [lotId, qty]);
        } else {
          status = "CANCELLED";
          cancelReason = "Legacy import: lot inventory could not cover this order";
        }
      }
      const total = o.total_price ?? qty * Number(o.price_per_kg);
      const ord = await client.query(
        `INSERT INTO orders (order_code, customer_id, farmer_id, status, fulfillment_method, total_amount, customer_notes, cancel_reason, created_at)
         VALUES ($1,$2,$3,$4,'FARMER_DELIVERY',$5,$6,$7,$8) RETURNING id`,
        [`ORD-LEGACY-${String(++i).padStart(5, "0")}`, userMap.get(o.buyer_id), lot.farmer_id, status, total, o.notes, cancelReason, o.created_at],
      );
      await client.query(
        `INSERT INTO order_items (order_id, lot_id, quantity, unit_price, line_total) VALUES ($1,$2,$3,$4,$5)`,
        [ord.rows[0].id, lotId, qty, o.price_per_kg, total],
      );
    }
    summary.orders = orders.rowCount ?? 0;

    await client.query(`INSERT INTO legacy_import_log (id, summary) VALUES (1, $1)`, [JSON.stringify(summary)]);
    await client.query("COMMIT");
    log(`Legacy import complete: ${JSON.stringify(summary)}`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}

export async function runMigrations(pool: pg.Pool, log: (m: string) => void = console.log): Promise<void> {
  const client = await pool.connect();
  try {
    // Serialise concurrent deploys.
    await client.query(`SELECT pg_advisory_lock(727274)`);
    try {
      await quarantineLegacySchema(client, log);
      await migrate(drizzle(client), { migrationsFolder: migrationsFolder() });
      await importLegacyData(client, log);
    } finally {
      await client.query(`SELECT pg_advisory_unlock(727274)`);
    }
  } finally {
    client.release();
  }
}
