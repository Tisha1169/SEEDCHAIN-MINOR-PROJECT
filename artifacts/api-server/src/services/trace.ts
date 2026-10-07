import { and, asc, desc, eq, gte, ilike, or, sql, gt } from "drizzle-orm";
import {
  db,
  farmerProfilesTable,
  farmsTable,
  lotsTable,
  lotStorageRecordsTable,
  productsTable,
  qrCodesTable,
  qrScanEventsTable,
  traceabilityEventsTable,
  usersTable,
  type User,
} from "@workspace/db";
import { HttpError, notFound } from "../lib/errors";
import { isWellFormedToken } from "../domain/qr";
import { toPublicTimeline } from "../domain/public-trace";
import { availableOf } from "../domain/state-machine";
import { counters } from "./lots";
import { appendEvent, raiseAlert } from "./records";
import { notifyChange } from "./realtime";

/**
 * Public, unauthenticated read model behind every printed QR.
 * Everything returned here is explicitly selected; no row is spread.
 */
export async function getPublicTrace(token: string) {
  if (!isWellFormedToken(token)) throw notFound("Unknown QR code");
  const [qr] = await db.select().from(qrCodesTable).where(eq(qrCodesTable.publicToken, token));
  if (!qr) throw notFound("Unknown QR code");
  if (qr.status !== "ACTIVE") {
    throw new HttpError(
      410,
      qr.status === "REVOKED"
        ? "This QR label has been revoked. Do not rely on it; contact the seller."
        : "This QR label has been replaced by a newer label. Scan the current label on the produce.",
      qr.status,
      { status: qr.status },
    );
  }
  const [row] = await db
    .select({
      lot: lotsTable,
      productName: productsTable.name,
      variety: productsTable.variety,
      farmName: farmsTable.name,
      userStatus: usersTable.status,
      profile: farmerProfilesTable,
    })
    .from(lotsTable)
    .innerJoin(productsTable, eq(productsTable.id, lotsTable.productId))
    .innerJoin(farmsTable, eq(farmsTable.id, lotsTable.farmId))
    .innerJoin(usersTable, eq(usersTable.id, lotsTable.farmerId))
    .leftJoin(farmerProfilesTable, eq(farmerProfilesTable.userId, lotsTable.farmerId))
    .where(eq(lotsTable.id, qr.lotId));
  if (!row) throw notFound("Unknown QR code");

  const events = await db
    .select()
    .from(traceabilityEventsTable)
    .where(eq(traceabilityEventsTable.lotId, row.lot.id))
    .orderBy(asc(traceabilityEventsTable.eventTime), asc(traceabilityEventsTable.recordedAt));
  const [storage] = await db
    .select()
    .from(lotStorageRecordsTable)
    .where(eq(lotStorageRecordsTable.lotId, row.lot.id))
    .orderBy(desc(lotStorageRecordsTable.storageStart))
    .limit(1);

  const c = counters(row.lot);
  const lastEventAt = events.reduce((m, e) => (e.recordedAt > m ? e.recordedAt : m), row.lot.updatedAt);
  const verified = row.userStatus === "active" && !!row.profile?.verifiedAt;
  return {
    verification: verified ? "VERIFIED" : "UNVERIFIED_FARMER",
    lotCode: row.lot.lotCode,
    lotId: row.lot.id,
    productName: row.productName,
    variety: row.variety,
    unit: row.lot.unit,
    farmer: {
      id: row.lot.farmerId,
      publicName: row.profile?.publicName ?? "Registered farmer",
      district: row.profile?.district ?? null,
      state: row.profile?.state ?? null,
      verified,
    },
    farmName: row.farmName,
    origin: row.lot.origin,
    harvestDate: row.lot.harvestDate,
    harvestedQuantity: c.harvested > 0 ? c.harvested : null,
    availableQuantity: row.lot.listed ? availableOf(c) : null,
    qualityGrade: row.lot.qualityGrade,
    qualityNotes: row.lot.qualityNotes,
    storage: storage
      ? {
          storageType: storage.storageType,
          storageStart: storage.storageStart.toISOString(),
          storageEnd: storage.storageEnd?.toISOString() ?? null,
          temperatureC: storage.temperatureC == null ? null : Number(storage.temperatureC),
          storageCondition: storage.storageCondition,
        }
      : null,
    status: row.lot.status,
    listed: row.lot.listed,
    publicNotes: row.lot.publicNotes,
    timeline: toPublicTimeline(
      events.map((e) => ({
        eventType: e.eventType,
        eventTime: e.eventTime,
        quantityChange: e.quantityChange == null ? null : Number(e.quantityChange),
        location: e.location,
        reason: e.reason,
        isPublic: e.isPublic,
        metadata: e.metadata,
      })),
      row.lot.unit,
    ),
    lastUpdatedAt: lastEventAt.toISOString(),
    qrVersion: qr.version,
    retrievedAt: new Date().toISOString(),
  };
}

export interface ScanInput {
  publicToken: string;
  scanSource: "in_app_scanner" | "camera_link" | "manual_entry";
  clientEventId: string;
  deviceType?: "mobile" | "tablet" | "desktop" | "unknown";
}

/** Thresholds for the duplicate-scan heuristic (possible label copying). */
const BURST_WINDOW_MS = 10 * 60_000;
const BURST_LIMIT = 50;

export async function recordScan(input: ScanInput, user: User | undefined) {
  const [prior] = await db.select().from(qrScanEventsTable).where(eq(qrScanEventsTable.clientEventId, input.clientEventId));
  if (prior) return { result: prior.result, duplicate: true };

  const hour = new Date().toISOString().slice(0, 13);
  if (!isWellFormedToken(input.publicToken)) {
    await db.insert(qrScanEventsTable).values({
      scanSource: input.scanSource,
      result: "INVALID",
      userId: user?.id ?? null,
      deviceType: input.deviceType ?? null,
      clientEventId: input.clientEventId,
    });
    await raiseAlert(db, {
      type: "INVALID_QR",
      severity: "LOW",
      message: "A scanned code was not a SeedChain trace QR",
      dedupeKey: `INVALID_QR:${hour}`,
    });
    return { result: "INVALID" as const, duplicate: false };
  }

  const [qr] = await db.select().from(qrCodesTable).where(eq(qrCodesTable.publicToken, input.publicToken));
  if (!qr) {
    await db.insert(qrScanEventsTable).values({
      scanSource: input.scanSource,
      result: "UNKNOWN",
      userId: user?.id ?? null,
      deviceType: input.deviceType ?? null,
      clientEventId: input.clientEventId,
    });
    await raiseAlert(db, {
      type: "INVALID_QR",
      severity: "MEDIUM",
      message: "A well-formed but unknown SeedChain token was scanned (possible counterfeit label)",
      dedupeKey: `UNKNOWN_QR:${hour}`,
    });
    return { result: "UNKNOWN" as const, duplicate: false };
  }

  const [lot] = await db.select().from(lotsTable).where(eq(lotsTable.id, qr.lotId));
  const result = qr.status === "ACTIVE" ? "OK" : qr.status === "REVOKED" ? "REVOKED" : "REPLACED";
  let duplicate = false;

  await db.transaction(async (tx) => {
    if (user && result === "OK") {
      const [recent] = await tx
        .select({ id: qrScanEventsTable.id })
        .from(qrScanEventsTable)
        .where(and(eq(qrScanEventsTable.userId, user.id), eq(qrScanEventsTable.lotId, lot.id), gt(qrScanEventsTable.scannedAt, new Date(Date.now() - 2 * 60_000))))
        .limit(1);
      duplicate = !!recent;
    }
    await tx.insert(qrScanEventsTable).values({
      lotId: lot.id,
      qrId: qr.id,
      scanSource: input.scanSource,
      result,
      userId: user?.id ?? null,
      deviceType: input.deviceType ?? null,
      clientEventId: input.clientEventId,
    });

    if (result === "OK") {
      const [{ n }] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(qrScanEventsTable)
        .where(and(eq(qrScanEventsTable.qrId, qr.id), eq(qrScanEventsTable.result, "OK")));
      if (n === 1) {
        await appendEvent(
          tx,
          { user: user ? { id: user.id, role: user.role } : null, source: input.scanSource },
          { lotId: lot.id, eventType: "QR_SCANNED", reason: "First verified scan of this QR", metadata: { qrVersion: qr.version } },
        );
      }
      const [{ burst }] = await tx
        .select({ burst: sql<number>`count(*)::int` })
        .from(qrScanEventsTable)
        .where(and(eq(qrScanEventsTable.lotId, lot.id), gte(qrScanEventsTable.scannedAt, new Date(Date.now() - BURST_WINDOW_MS))));
      if (burst > BURST_LIMIT) {
        await raiseAlert(tx, {
          type: "DUPLICATE_SCAN",
          severity: "MEDIUM",
          message: `${lot.lotCode} was scanned ${burst} times in 10 minutes (possible copied label)`,
          entityType: "lot",
          entityId: lot.id,
          farmerId: lot.farmerId,
          dedupeKey: `DUPLICATE_SCAN:${lot.id}:${hour}`,
        });
      }
    } else {
      await raiseAlert(tx, {
        type: "REVOKED_QR",
        severity: result === "REVOKED" ? "HIGH" : "LOW",
        message: `A ${result.toLowerCase()} QR (v${qr.version}) of ${lot.lotCode} was scanned`,
        entityType: "lot",
        entityId: lot.id,
        farmerId: lot.farmerId,
        metadata: { qrId: qr.id },
        dedupeKey: `${result}_QR_SCAN:${qr.id}:${hour.slice(0, 10)}`,
      });
    }
    await notifyChange(tx, { topic: "scans", lotId: lot.id, farmerId: lot.farmerId, customerId: user?.id });
  });
  return { result, duplicate };
}

export async function listMyScans(user: User) {
  const rows = await db
    .select({
      lotCode: lotsTable.lotCode,
      productName: productsTable.name,
      variety: productsTable.variety,
      scannedAt: sql<Date>`max(${qrScanEventsTable.scannedAt})`,
      publicToken: qrCodesTable.publicToken,
    })
    .from(qrScanEventsTable)
    .innerJoin(qrCodesTable, eq(qrCodesTable.id, qrScanEventsTable.qrId))
    .innerJoin(lotsTable, eq(lotsTable.id, qrScanEventsTable.lotId))
    .innerJoin(productsTable, eq(productsTable.id, lotsTable.productId))
    .where(and(eq(qrScanEventsTable.userId, user.id), eq(qrScanEventsTable.result, "OK")))
    .groupBy(lotsTable.lotCode, productsTable.name, productsTable.variety, qrCodesTable.publicToken)
    .orderBy(desc(sql`max(${qrScanEventsTable.scannedAt})`))
    .limit(20);
  return rows.map((r) => ({ ...r, scannedAt: new Date(r.scannedAt).toISOString() }));
}

// ------------------------------------------------------------------ marketplace (public)

const listingSelect = {
  lot: lotsTable,
  productName: productsTable.name,
  variety: productsTable.variety,
  farmName: farmsTable.name,
  profile: farmerProfilesTable,
  publicToken: qrCodesTable.publicToken,
};

function listingQuery() {
  return db
    .select(listingSelect)
    .from(lotsTable)
    .innerJoin(productsTable, eq(productsTable.id, lotsTable.productId))
    .innerJoin(farmsTable, eq(farmsTable.id, lotsTable.farmId))
    .innerJoin(usersTable, eq(usersTable.id, lotsTable.farmerId))
    .leftJoin(farmerProfilesTable, eq(farmerProfilesTable.userId, lotsTable.farmerId))
    .leftJoin(qrCodesTable, and(eq(qrCodesTable.lotId, lotsTable.id), eq(qrCodesTable.status, "ACTIVE")));
}

type ListingRow = Awaited<ReturnType<ReturnType<typeof listingQuery>["execute"]>>[number];

function serializeListing(r: ListingRow) {
  return {
    lotId: r.lot.id,
    lotCode: r.lot.lotCode,
    productName: r.productName,
    variety: r.variety,
    unit: r.lot.unit,
    pricePerUnit: r.lot.pricePerUnit == null ? null : Number(r.lot.pricePerUnit),
    available: availableOf(counters(r.lot)),
    qualityGrade: r.lot.qualityGrade,
    harvestDate: r.lot.harvestDate,
    origin: r.lot.origin,
    status: r.lot.status,
    farmer: {
      id: r.lot.farmerId,
      publicName: r.profile?.publicName ?? "Registered farmer",
      district: r.profile?.district ?? null,
      state: r.profile?.state ?? null,
      verified: !!r.profile?.verifiedAt,
    },
    farmName: r.farmName,
    publicToken: r.publicToken,
    publicNotes: r.lot.publicNotes,
  };
}

/** Only listed lots with stock, from active (admin-approved) farmers. */
const sellable = () => and(eq(lotsTable.listed, true), sql`${lotsTable.availableQty} > 0`, eq(usersTable.status, "active"));

export async function listMarketplace(q?: string, state?: string) {
  const conds = [sellable()];
  if (q?.trim()) {
    const term = `%${q.trim().replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    conds.push(or(ilike(productsTable.name, term), ilike(productsTable.variety, term), ilike(farmerProfilesTable.publicName, term), ilike(lotsTable.origin, term))!);
  }
  if (state?.trim()) conds.push(ilike(farmsTable.state, state.trim()));
  const rows = await listingQuery().where(and(...conds)).orderBy(desc(lotsTable.updatedAt)).limit(200);
  return rows.map(serializeListing);
}

export async function getListing(lotId: string) {
  const [row] = await listingQuery().where(and(eq(lotsTable.id, lotId), eq(lotsTable.listed, true), eq(usersTable.status, "active")));
  if (!row) throw notFound("Listing not found");
  return serializeListing(row);
}

export async function getPublicFarmer(farmerId: string) {
  const [u] = await db
    .select({ user: usersTable, profile: farmerProfilesTable })
    .from(usersTable)
    .leftJoin(farmerProfilesTable, eq(farmerProfilesTable.userId, usersTable.id))
    .where(and(eq(usersTable.id, farmerId), eq(usersTable.role, "farmer"), eq(usersTable.status, "active")));
  if (!u) throw notFound("Farmer not found");
  const farms = await db.select({ name: farmsTable.name, district: farmsTable.district, state: farmsTable.state }).from(farmsTable).where(eq(farmsTable.farmerId, farmerId));
  const listings = await listingQuery().where(and(sellable(), eq(lotsTable.farmerId, farmerId)));
  return {
    id: farmerId,
    publicName: u.profile?.publicName ?? "Registered farmer",
    bio: u.profile?.bio ?? null,
    village: u.profile?.village ?? null,
    district: u.profile?.district ?? null,
    state: u.profile?.state ?? null,
    verified: !!u.profile?.verifiedAt,
    memberSince: u.user.createdAt.toISOString(),
    farms,
    listings: listings.map(serializeListing),
  };
}
