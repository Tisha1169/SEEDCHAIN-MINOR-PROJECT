import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, sessionsTable, usersTable, type User } from "@workspace/db";
import { config } from "../config";
import { forbidden, unauthorized } from "./errors";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, keylen: number, opts: object) => Promise<Buffer>;

/** scrypt parameters (N=2^15, r=8, p=1, 64-byte key). Stored self-describing for future upgrades. */
const SCRYPT = { N: 32768, r: 8, p: 1, keylen: 64, maxmem: 64 * 1024 * 1024 };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, SCRYPT.keylen, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export interface VerifyResult {
  ok: boolean;
  /** True when the stored hash uses an outdated scheme and should be replaced. */
  needsRehash: boolean;
}

export async function verifyPassword(password: string, stored: string): Promise<VerifyResult> {
  if (stored.startsWith("scrypt$")) {
    const [, n, r, p, saltB64, keyB64] = stored.split("$");
    const expected = Buffer.from(keyB64, "base64");
    const key = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: SCRYPT.maxmem,
    });
    return { ok: key.length === expected.length && timingSafeEqual(key, expected), needsRehash: Number(n) < SCRYPT.N };
  }
  // Accounts imported from the pre-transformation schema used unsalted
  // HMAC-SHA256(SESSION_SECRET, password). Verify once, then upgrade.
  if (stored.startsWith("legacy-hmac$") && config.legacySessionSecret) {
    const expected = Buffer.from(stored.slice("legacy-hmac$".length), "hex");
    const actual = createHmac("sha256", config.legacySessionSecret).update(password).digest();
    return { ok: expected.length === actual.length && timingSafeEqual(expected, actual), needsRehash: true };
  }
  return { ok: false, needsRehash: false };
}

/** Session tokens are random; only an HMAC of the token is stored. */
function hashToken(token: string): string {
  return createHmac("sha256", config.authSecret).update(token).digest("base64url");
}

export async function createSession(res: Response, userId: string, userAgent?: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + config.sessionTtlHours * 3_600_000);
  await db.insert(sessionsTable).values({ userId, tokenHash: hashToken(token), expiresAt, userAgent: userAgent?.slice(0, 300) });
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

function readToken(req: Request): string | null {
  const cookie = req.cookies?.[config.cookieName];
  if (typeof cookie === "string" && cookie) return cookie;
  // Bearer is accepted for non-browser clients (scripts, tests).
  const h = req.headers.authorization;
  if (h?.startsWith("Bearer ")) return h.slice(7);
  return null;
}

export async function revokeSession(req: Request, res: Response): Promise<void> {
  const token = readToken(req);
  if (token) {
    await db.update(sessionsTable).set({ revokedAt: new Date() }).where(eq(sessionsTable.tokenHash, hashToken(token)));
  }
  res.clearCookie(config.cookieName, { path: "/" });
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await db
    .update(sessionsTable)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessionsTable.userId, userId), isNull(sessionsTable.revokedAt)));
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Resolves the caller from the session. The role always comes from the
 * database row, never from anything the client sends.
 */
export const loadUser: RequestHandler = async (req, _res, next) => {
  const token = readToken(req);
  if (!token) return next();
  const [row] = await db
    .select({ user: usersTable })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(and(eq(sessionsTable.tokenHash, hashToken(token)), isNull(sessionsTable.revokedAt), gt(sessionsTable.expiresAt, new Date())))
    .limit(1);
  if (row && row.user.status !== "suspended" && row.user.status !== "rejected") req.user = row.user;
  next();
};

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(unauthorized());
  next();
}

type Role = User["role"];

/** Requires one of the roles. `active` also requires an approved account (farmers start as pending). */
export function requireRole(roles: Role[], opts: { active?: boolean } = { active: true }): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    if (opts.active !== false && req.user.status !== "active") {
      return next(forbidden("Your account is awaiting admin approval"));
    }
    next();
  };
}

export function currentUser(req: Request): User {
  if (!req.user) throw unauthorized();
  return req.user;
}
