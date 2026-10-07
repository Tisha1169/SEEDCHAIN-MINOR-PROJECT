/**
 * Creates clearly labelled PILOT / TEST data for staging walkthroughs.
 * Everything it creates is marked "[PILOT TEST]" (names, farm names, public
 * notes) and uses @pilot.seedchain.test e-mail addresses. It must NEVER be
 * described as real farmer data. Idempotent: re-running skips existing users.
 *
 *   PILOT_PASSWORD='…' node dist/seed-pilot.mjs   (refuses to run in production unless ALLOW_PILOT_SEED=true)
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, farmerProfilesTable, farmsTable, pool, usersTable } from "@workspace/db";
import { hashPassword } from "../lib/auth";
import { createLot, setListing } from "../services/lots";
import { config } from "../config";

const FARMERS = [
  { n: "Pilot Farmer A", state: "Punjab", district: "Jalandhar", village: "Nakodar", lat: 31.1253, lon: 75.4755, variety: "Kufri Jyoti", qty: 1000, price: 22 },
  { n: "Pilot Farmer B", state: "Punjab", district: "Hoshiarpur", village: "Dasuya", lat: 31.8142, lon: 75.6561, variety: "Kufri Pukhraj", qty: 800, price: 20 },
  { n: "Pilot Farmer C", state: "Uttar Pradesh", district: "Agra", village: "Fatehabad", lat: 27.0237, lon: 78.3027, variety: "Kufri Badshah", qty: 1500, price: 18 },
  { n: "Pilot Farmer D", state: "West Bengal", district: "Hooghly", village: "Singur", lat: 22.8109, lon: 88.2287, variety: "Kufri Jyoti", qty: 600, price: 19 },
  { n: "Pilot Farmer E", state: "Haryana", district: "Karnal", village: "Nilokheri", lat: 29.8346, lon: 76.9159, variety: "Kufri Chipsona", qty: 1200, price: 24 },
];

async function main() {
  if (config.isProduction && process.env.ALLOW_PILOT_SEED !== "true") throw new Error("Refusing to seed pilot data in production (set ALLOW_PILOT_SEED=true for a staging pilot)");
  const password = process.env.PILOT_PASSWORD;
  if (!password || password.length < 12) throw new Error("Set PILOT_PASSWORD (12+ chars); it is shared with pilot participants out of band");
  const hash = await hashPassword(password);
  const [admin] = await db.select().from(usersTable).where(eq(usersTable.role, "admin")).limit(1);
  if (!admin) throw new Error("Create an admin first (create-admin)");

  for (const [i, f] of FARMERS.entries()) {
    const email = `pilot-farmer${i + 1}@pilot.seedchain.test`;
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing) { console.log(`skip ${email} (exists)`); continue; }
    const [u] = await db.insert(usersTable).values({ name: `[PILOT TEST] ${f.n}`, email, passwordHash: hash, role: "farmer", status: "active", location: f.state }).returning();
    await db.insert(farmerProfilesTable).values({ userId: u.id, publicName: `[PILOT TEST] ${f.n}`, bio: "Simulated pilot account. Not a real farmer.", village: f.village, district: f.district, state: f.state, verifiedAt: new Date(), verifiedBy: admin.id, reviewNote: "Pilot seed" });
    const [farm] = await db.insert(farmsTable).values({ farmerId: u.id, name: `[PILOT TEST] ${f.village} plot`, village: f.village, district: f.district, state: f.state, latitude: f.lat, longitude: f.lon, sizeHectares: 2 }).returning();
    const actor = { user: u, requestId: "pilot-seed", source: "pilot_seed" };
    const { lot } = await createLot(actor, {
      farmId: farm.id, productName: "Potato", variety: f.variety, origin: `${f.village}, ${f.district}, ${f.state}`,
      harvestDate: new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10), harvestQuantity: f.qty, qualityGrade: "A",
      publicNotes: "PILOT / TEST DATA. Simulated lot, not produced by a real farmer.",
    });
    await setListing(actor, lot.id, { listed: true, pricePerUnit: f.price });
    console.log(`seeded ${email} → ${lot.lotCode}`);
  }
  for (const n of [1, 2, 3]) {
    const email = `pilot-customer${n}@pilot.seedchain.test`;
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing) continue;
    await db.insert(usersTable).values({ name: `[PILOT TEST] Customer ${n}`, email, passwordHash: hash, role: "customer", status: "active" });
    console.log(`seeded ${email}`);
  }
}

main().then(() => pool.end()).catch(async (e) => { console.error(e.message); await pool.end(); process.exit(1); });
