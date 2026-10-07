import type { Request } from "express";
import type { ZodType, ZodTypeDef } from "zod";
import { and, eq } from "drizzle-orm";
import { db, idempotencyKeysTable, type User } from "@workspace/db";
import { badRequest } from "./errors";
import type { Actor } from "../services/records";

/** Validates input against an OpenAPI-generated zod schema. Unknown keys are stripped (no mass assignment). */
export function parse<T>(schema: ZodType<T, ZodTypeDef, unknown>, data: unknown): T {
  const r = schema.safeParse(data ?? {});
  if (!r.success) throw badRequest("Invalid request", "VALIDATION_ERROR", r.error.issues);
  return r.data;
}

export function actorOf(req: Request): Actor & { user: User } {
  return { user: req.user!, requestId: String(req.id), source: req.get("x-offline-replay") ? "offline_sync" : "web" };
}

export function isOfflineReplay(req: Request): boolean {
  return !!req.get("x-offline-replay");
}

/**
 * Generic Idempotency-Key support: the first response for (user, key, route)
 * is stored and replayed for retries.
 */
export async function withIdempotency<T>(
  req: Request,
  route: string,
  fn: () => Promise<{ status: number; body: T }>,
): Promise<{ status: number; body: T; replayed: boolean }> {
  const key = req.get("idempotency-key");
  if (!key || !req.user) return { ...(await fn()), replayed: false };
  if (key.length > 100) throw badRequest("Idempotency-Key too long");
  const [prior] = await db
    .select()
    .from(idempotencyKeysTable)
    .where(and(eq(idempotencyKeysTable.userId, req.user.id), eq(idempotencyKeysTable.key, key), eq(idempotencyKeysTable.route, route)));
  if (prior) return { status: prior.responseStatus, body: prior.responseBody as T, replayed: true };
  const result = await fn();
  await db
    .insert(idempotencyKeysTable)
    .values({ userId: req.user.id, key, route, responseStatus: result.status, responseBody: result.body as object })
    .onConflictDoNothing();
  return { ...result, replayed: false };
}
