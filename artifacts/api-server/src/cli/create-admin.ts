/**
 * Creates (or promotes) the platform administrator. Admin accounts can never
 * be self-registered through the API.
 *
 *   ADMIN_EMAIL=... ADMIN_NAME=... ADMIN_PASSWORD=... node dist/create-admin.mjs
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool, usersTable } from "@workspace/db";
import { hashPassword, revokeAllSessions } from "../lib/auth";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.ADMIN_NAME?.trim() || "SeedChain Admin";
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters)");
  }
  const passwordHash = await hashPassword(password);
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    await db.update(usersTable).set({ role: "admin", status: "active", passwordHash, updatedAt: new Date() }).where(eq(usersTable.id, existing.id));
    await revokeAllSessions(existing.id); // a changed password must end every existing session
    console.log(`Updated ${email} as admin (all existing sessions revoked)`);
  } else {
    await db.insert(usersTable).values({ email, name, passwordHash, role: "admin", status: "active" });
    console.log(`Created admin ${email}`);
  }
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(err.message);
    await pool.end();
    process.exit(1);
  });
