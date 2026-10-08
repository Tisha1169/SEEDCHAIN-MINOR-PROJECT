import { asc, desc, eq, sql } from "drizzle-orm";
import { db, lotsTable, packageEventsTable, packagesTable, qrCodesTable, type DbOrTx, type Package, type User } from "@workspace/db";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors";
import { cleanNote, canTransitionSeal, integrityOf, newSealId, summarizePhysical, type SealStatus } from "../domain/seals";
import { generatePublicToken } from "../domain/qr";
import { round3 } from "../domain/state-machine";
import { appendEvent, audit, raiseAlert, type Actor } from "./records";
import { counters } from "./lots";
import { notify, notifyAdmins } from "./notifications";
import { notifyChange } from "./realtime";

const roleOf = (u: User): "farmer" | "admin" => (u.role === "admin" ? "admin" : "farmer");

async function loadLotFor(tx: DbOrTx, user: User, lotId: string, lock = false) {
  const q = tx.select().from(lotsTable).where(eq(lotsTable.id, lotId));
  const [lot] = lock ? await q.for("update") : await q;
  if (!lot || (user.role === "farmer" && lot.farmerId !== user.id)) throw notFound("Lot not found");
  if (user.role !== "farmer" && user.role !== "admin") throw forbidden();
  return lot;
}

export const serializePackage = (p: Package) => ({
  id: p.id,
  lotId: p.lotId,
  packageNumber: p.packageNumber,
  label: `PKG-${String(p.packageNumber).padStart(3, "0")}`,
  quantity: Number(p.quantity),
  sealId: p.sealId,
  sealStatus: p.sealStatus,
  integrityStatus: p.integrityStatus,
  publicToken: p.publicToken, // the package's own QR token; owner/admin only
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
});

export interface CreatePackagesInput {
  /** Either explicit quantities, or count + quantityEach. */
  quantities?: number[];
  count?: number;
  quantityEach?: number;
}

/** Splits part of a lot into sealed packages, each with its own QR token and seal id. Atomic and bounded by the harvested quantity. */
export async function createPackages(actor: Actor & { user: User }, lotId: string, input: CreatePackagesInput) {
  const quantities = input.quantities ?? Array.from({ length: input.count ?? 0 }, () => input.quantityEach ?? 0);
  if (!quantities.length || quantities.length > 200) throw badRequest("Provide between 1 and 200 packages");
  if (quantities.some((q) => !(q > 0) || q > 1_000_000)) throw badRequest("Each package needs a positive quantity");

  return db.transaction(async (tx) => {
    const lot = await loadLotFor(tx, actor.user, lotId, true);
    if (lot.recalled) throw conflict("A recalled lot cannot be packaged", "LOT_RECALLED");
    const harvested = counters(lot).harvested;
    if (!(harvested > 0)) throw conflict("Record the harvest before creating packages", "NOT_HARVESTED");
    const existing = await tx.select().from(packagesTable).where(eq(packagesTable.lotId, lotId)).orderBy(asc(packagesTable.packageNumber));
    const packaged = round3(existing.reduce((s, p) => s + Number(p.quantity), 0));
    const adding = round3(quantities.reduce((s, q) => s + q, 0));
    if (packaged + adding > harvested + 1e-9) throw conflict(`Only ${round3(harvested - packaged)} ${lot.unit} of this lot is not yet packaged`, "EXCEEDS_LOT_QUANTITY", { unpackaged: round3(harvested - packaged), requested: adding });

    const usedSeals = new Set((await tx.select({ s: packagesTable.sealId }).from(packagesTable)).map((r) => r.s));
    let n = existing.length ? existing[existing.length - 1].packageNumber : 0;
    const created: Package[] = [];
    for (const q of quantities) {
      let sealId = newSealId();
      while (usedSeals.has(sealId)) sealId = newSealId();
      usedSeals.add(sealId);
      const [p] = await tx.insert(packagesTable).values({ lotId, packageNumber: ++n, quantity: q, publicToken: generatePublicToken(), sealId, createdBy: actor.user.id }).returning();
      await tx.insert(packageEventsTable).values({ packageId: p.id, lotId, eventType: "SEAL_ASSIGNED", toStatus: "ASSIGNED", actorUserId: actor.user.id, actorRole: actor.user.role, note: null });
      created.push(p);
    }
    await appendEvent(tx, actor, { lotId, eventType: "PACKAGES_CREATED", reason: `${created.length} package(s) prepared with serialised seals`, metadata: { count: created.length, quantity: adding, totalPackages: existing.length + created.length } });
    await audit(tx, actor, "PACKAGES_CREATED", "lot", lotId, null, { count: created.length, quantity: adding });
    await notifyChange(tx, { topic: "lots", entityId: lotId, lotId, farmerId: lot.farmerId });
    return created.map(serializePackage);
  });
}

export async function listPackages(user: User, lotId: string) {
  await loadLotFor(db, user, lotId);
  const rows = await db.select().from(packagesTable).where(eq(packagesTable.lotId, lotId)).orderBy(asc(packagesTable.packageNumber));
  const events = await db.select().from(packageEventsTable).where(eq(packageEventsTable.lotId, lotId)).orderBy(desc(packageEventsTable.createdAt));
  return rows.map((p) => ({
    ...serializePackage(p),
    history: events.filter((e) => e.packageId === p.id).map((e) => ({ eventType: e.eventType, from: e.fromStatus, to: e.toStatus, actorRole: e.actorRole, note: e.note, at: e.createdAt.toISOString() })),
  }));
}

const EXCEPTIONS: SealStatus[] = ["BROKEN", "REPORTED", "REPLACED"];

/** Applies one seal transition inside a transaction. `actorRole` is "public" for customer reports. */
async function applySeal(tx: DbOrTx, actor: Actor, pkg: Package, to: SealStatus, note: string | null, actorRole: string): Promise<Package> {
  const lot = (await tx.select().from(lotsTable).where(eq(lotsTable.id, pkg.lotId)))[0];
  const now = new Date();
  const set: Partial<typeof packagesTable.$inferInsert> = { sealStatus: to, integrityStatus: integrityOf(to), updatedAt: now };
  let eventNote = note;
  if (to === "REPLACED") {
    const old = pkg.sealId;
    set.sealId = newSealId();
    eventNote = `Seal ${old} replaced by ${set.sealId}${note ? `: ${note}` : ""}`;
  }
  const [updated] = await tx.update(packagesTable).set(set).where(eq(packagesTable.id, pkg.id)).returning();
  await tx.insert(packageEventsTable).values({ packageId: pkg.id, lotId: pkg.lotId, eventType: `SEAL_${to}`, fromStatus: pkg.sealStatus, toStatus: to, actorUserId: actor.user?.id ?? null, actorRole, note: eventNote });

  if (EXCEPTIONS.includes(to)) {
    // Exceptions are public by design: a seal problem must never be quietly hidden.
    await appendEvent(tx, actor, { lotId: pkg.lotId, eventType: to === "REPLACED" ? "SEAL_REPLACED" : "SEAL_INTEGRITY_EXCEPTION", reason: `Package PKG-${String(pkg.packageNumber).padStart(3, "0")}: seal ${to.toLowerCase()}`, metadata: { packageNumber: pkg.packageNumber, status: to } });
    if (to !== "REPLACED") {
      await raiseAlert(tx, { type: "SEAL_EXCEPTION", severity: "HIGH", message: `${lot.lotCode} PKG-${String(pkg.packageNumber).padStart(3, "0")}: seal ${to.toLowerCase()}${eventNote ? ` (${eventNote})` : ""}`, entityType: "lot", entityId: lot.id, farmerId: lot.farmerId, metadata: { packageId: pkg.id, to }, dedupeKey: `SEAL_EXCEPTION:${pkg.id}:${to}` });
      await notifyAdmins(tx, { type: "SEAL_EXCEPTION", params: { lotCode: lot.lotCode, packageNumber: pkg.packageNumber }, entityType: "lot", entityId: lot.id });
      await notify(tx, [lot.farmerId], { type: "SEAL_EXCEPTION", params: { lotCode: lot.lotCode, packageNumber: pkg.packageNumber }, entityType: "lot", entityId: lot.id });
    }
  }
  if (to === "DISPATCH_VERIFIED") {
    const [{ open }] = await tx.select({ open: sql<number>`count(*) FILTER (WHERE ${packagesTable.sealStatus} IN ('ASSIGNED','REPLACED'))::int` }).from(packagesTable).where(eq(packagesTable.lotId, pkg.lotId));
    if (open === 0) await appendEvent(tx, actor, { lotId: pkg.lotId, eventType: "SEAL_VERIFIED_AT_DISPATCH", reason: "All package seals verified at dispatch", metadata: {} });
  }
  await notifyChange(tx, { topic: "lots", entityId: pkg.lotId, lotId: pkg.lotId, farmerId: lot.farmerId });
  return updated;
}

export async function setSealStatus(actor: Actor & { user: User }, packageId: string, to: SealStatus, noteIn?: string) {
  const note = cleanNote(noteIn);
  return db.transaction(async (tx) => {
    const [pkg] = await tx.select().from(packagesTable).where(eq(packagesTable.id, packageId)).for("update");
    if (!pkg) throw notFound("Package not found");
    await loadLotFor(tx, actor.user, pkg.lotId);
    const role = roleOf(actor.user);
    if (!canTransitionSeal(pkg.sealStatus as SealStatus, to, role)) {
      throw conflict(`A seal cannot go from ${pkg.sealStatus} to ${to} for your role`, "SEAL_TRANSITION_NOT_ALLOWED");
    }
    if ((to === "BROKEN" || to === "REPLACED" || to === "REPORTED") && !note) throw badRequest("A short note is required for this seal change");
    const updated = await applySeal(tx, actor, pkg, to, note, actor.user.role);
    await audit(tx, actor, `SEAL_${to}`, "package", pkg.id, { sealStatus: pkg.sealStatus }, { sealStatus: to });
    return serializePackage(updated);
  });
}

// ------------------------------------------------------------------ public side

/** The lot a public token belongs to: a package token (own seal) or null when it is not a package. */
export async function findPackageByToken(token: string): Promise<Package | null> {
  const [p] = await db.select().from(packagesTable).where(eq(packagesTable.publicToken, token));
  return p ?? null;
}

/** The QR row that governs a lot's current state (active preferred, else the latest), used for package tokens. */
export async function governingQr(lotId: string) {
  const rows = await db.select().from(qrCodesTable).where(eq(qrCodesTable.lotId, lotId)).orderBy(desc(qrCodesTable.version));
  return rows.find((r) => r.status === "ACTIVE") ?? rows[0] ?? null;
}

export async function physicalIntegrityFor(lotId: string, pkg: Package | null) {
  if (pkg) {
    const s = summarizePhysical([{ sealStatus: pkg.sealStatus as SealStatus }]);
    return {
      scope: "PACKAGE" as const,
      state: s.state,
      packagesTotal: 1,
      counts: s.counts,
      package: { label: `PKG-${String(pkg.packageNumber).padStart(3, "0")}`, sealId: pkg.sealId, sealStatus: pkg.sealStatus, quantity: Number(pkg.quantity) },
    };
  }
  const rows = await db.select({ sealStatus: packagesTable.sealStatus }).from(packagesTable).where(eq(packagesTable.lotId, lotId));
  const s = summarizePhysical(rows.map((r) => ({ sealStatus: r.sealStatus as SealStatus })));
  return { scope: "LOT" as const, state: s.state, packagesTotal: rows.length, counts: s.counts, package: null };
}

export type SealReportKind = "SEAL_BROKEN" | "SEAL_MISSING" | "SEAL_MISMATCH" | "OTHER";

/** Anyone holding a package can report a problem. Never auto-concludes tampering: it records an exception for review. */
export async function reportSealIssue(token: string, kind: SealReportKind, noteIn: string | undefined, user: User | undefined) {
  const note = cleanNote(noteIn);
  const pkg = await findPackageByToken(token);
  if (pkg) {
    return db.transaction(async (tx) => {
      const [p] = await tx.select().from(packagesTable).where(eq(packagesTable.id, pkg.id)).for("update");
      const label = `${kind}${note ? `: ${note}` : ""}`;
      if (p.sealStatus === "REPORTED" || p.sealStatus === "BROKEN" || p.sealStatus === "REPLACED") {
        await tx.insert(packageEventsTable).values({ packageId: p.id, lotId: p.lotId, eventType: "ISSUE_REPORTED", fromStatus: p.sealStatus, toStatus: p.sealStatus, actorUserId: user?.id ?? null, actorRole: "public", note: label });
        return { recorded: true, scope: "PACKAGE" as const, alreadyUnderReview: true };
      }
      await applySeal(tx, { user: user ?? null, source: "public_report" }, p, "REPORTED", label, "public");
      return { recorded: true, scope: "PACKAGE" as const, alreadyUnderReview: false };
    });
  }
  // A lot-level QR cannot say which package; record it for an admin without changing any seal.
  const qr = await db.select().from(qrCodesTable).where(eq(qrCodesTable.publicToken, token));
  if (!qr[0]) throw notFound("Unknown QR code");
  const [lot] = await db.select().from(lotsTable).where(eq(lotsTable.id, qr[0].lotId));
  await raiseAlert(db, { type: "SEAL_EXCEPTION", severity: "HIGH", message: `${lot.lotCode}: a customer reported a packaging problem (${kind})${note ? `: ${note}` : ""}`, entityType: "lot", entityId: lot.id, farmerId: lot.farmerId, metadata: { kind, scope: "LOT" }, dedupeKey: `SEAL_REPORT_LOT:${lot.id}:${new Date().toISOString().slice(0, 13)}` });
  await notifyAdmins(db, { type: "SEAL_EXCEPTION", params: { lotCode: lot.lotCode, packageNumber: 0 }, entityType: "lot", entityId: lot.id });
  return { recorded: true, scope: "LOT" as const, alreadyUnderReview: false };
}

