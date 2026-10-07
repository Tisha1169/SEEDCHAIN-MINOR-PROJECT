import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, farmerProfilesTable, usersTable, type User } from "@workspace/db";
import { LoginUserBody, RegisterUserBody, UpdateMyProfileBody } from "@workspace/api-zod";
import { createSession, hashPassword, requireAuth, revokeSession, verifyPassword } from "../lib/auth";
import { conflict, unauthorized } from "../lib/errors";
import { actorOf, parse } from "../lib/http";
import { authLimiter } from "../lib/rate-limit";
import { audit } from "../services/records";
import { notifyChange } from "../services/realtime";

const router = Router();

export async function serializeUser(u: User) {
  const [p] = await db.select().from(farmerProfilesTable).where(eq(farmerProfilesTable.userId, u.id));
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    status: u.status,
    location: u.location,
    createdAt: u.createdAt.toISOString(),
    farmerProfile: p
      ? {
          publicName: p.publicName,
          bio: p.bio,
          village: p.village,
          district: p.district,
          state: p.state,
          verifiedAt: p.verifiedAt?.toISOString() ?? null,
          reviewNote: p.reviewNote,
        }
      : null,
  };
}

// A real scrypt hash of a random string: verifying against it equalises
// timing between "unknown email" and "wrong password".
let timingEqualiserHash: Promise<string> | null = null;

router.post("/auth/register", authLimiter, async (req, res) => {
  const body = parse(RegisterUserBody, req.body);
  const email = body.email.trim().toLowerCase();
  const [exists] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  if (exists) throw conflict("An account with this email already exists", "EMAIL_TAKEN");
  const passwordHash = await hashPassword(body.password);
  // Role is limited to farmer|customer by the schema. Admins are created only by the bootstrap script.
  const user = await db.transaction(async (tx) => {
    const [u] = await tx
      .insert(usersTable)
      .values({
        name: body.name.trim(),
        email,
        passwordHash,
        phone: body.phone ?? null,
        role: body.role,
        status: body.role === "farmer" ? "pending" : "active",
        location: body.location ?? null,
      })
      .returning();
    if (u.role === "farmer") {
      await tx.insert(farmerProfilesTable).values({
        userId: u.id,
        publicName: body.farmerProfile?.publicName ?? u.name,
        bio: body.farmerProfile?.bio ?? null,
        village: body.farmerProfile?.village ?? null,
        district: body.farmerProfile?.district ?? null,
        state: body.farmerProfile?.state ?? null,
      });
    }
    await audit(tx, { user: { id: u.id, role: u.role }, requestId: String(req.id) }, "USER_REGISTERED", "user", u.id, null, { role: u.role, status: u.status });
    await notifyChange(tx, { topic: "users", adminOnly: true });
    return u;
  });
  await createSession(res, user.id, req.get("user-agent"));
  res.status(201).json({ user: await serializeUser(user) });
});

router.post("/auth/login", authLimiter, async (req, res) => {
  const body = parse(LoginUserBody, req.body);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, body.email.trim().toLowerCase()));
  if (!user) {
    timingEqualiserHash ??= hashPassword("timing-equaliser-" + Math.random());
    await verifyPassword(body.password, await timingEqualiserHash);
    throw unauthorized("Invalid email or password");
  }
  const v = await verifyPassword(body.password, user.passwordHash);
  if (!v.ok) throw unauthorized("Invalid email or password");
  if (user.status === "suspended" || user.status === "rejected") {
    throw unauthorized(user.status === "rejected" ? "This farmer application was rejected" : "This account is suspended");
  }
  if (v.needsRehash) {
    await db.update(usersTable).set({ passwordHash: await hashPassword(body.password), updatedAt: new Date() }).where(eq(usersTable.id, user.id));
  }
  await createSession(res, user.id, req.get("user-agent"));
  res.json({ user: await serializeUser(user) });
});

router.post("/auth/logout", async (req, res) => {
  await revokeSession(req, res);
  res.status(204).end();
});

router.get("/auth/me", requireAuth, async (req, res) => {
  res.json(await serializeUser(req.user!));
});

router.patch("/me/profile", requireAuth, async (req, res) => {
  const body = parse(UpdateMyProfileBody, req.body);
  const user = req.user!;
  await db.transaction(async (tx) => {
    const patch = Object.fromEntries(
      Object.entries({ name: body.name, phone: body.phone, location: body.location }).filter(([, v]) => v !== undefined),
    );
    if (Object.keys(patch).length) await tx.update(usersTable).set({ ...patch, updatedAt: new Date() }).where(eq(usersTable.id, user.id));
    if (body.farmerProfile && user.role === "farmer") {
      // verifiedAt / reviewNote are admin-only fields and are not accepted here.
      await tx
        .update(farmerProfilesTable)
        .set({ ...body.farmerProfile, updatedAt: new Date() })
        .where(eq(farmerProfilesTable.userId, user.id));
    }
    await audit(tx, actorOf(req), "PROFILE_UPDATED", "user", user.id, null, { fields: Object.keys(body) });
  });
  const [fresh] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));
  res.json(await serializeUser(fresh));
});

export default router;
