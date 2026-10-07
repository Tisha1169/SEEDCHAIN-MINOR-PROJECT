import { and, asc, desc, eq, gte, inArray, sql, lt, max } from "drizzle-orm";
import {
  db,
  farmsTable,
  lotsTable,
  lotStorageRecordsTable,
  lotQualityRecordsTable,
  qrScanEventsTable,
  marketPriceObservationsTable,
  orderItemsTable,
  ordersTable,
  productsTable,
  qrCodesTable,
  traceabilityEventsTable,
  usersTable,
  weatherObservationsTable,
  lotCodeSeq,
  type DbOrTx,
  type Lot,
  type LotStorageRecord,
  type QrCode,
  type TraceabilityEvent,
  type User,
} from "@workspace/db";
import { config } from "../config";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors";
import {
  assertLotTransition,
  availableOf,
  deriveLotStatus,
  round3,
  type InventoryCounters,
  type LotStatus,
} from "../domain/state-machine";
import { assessRisk, type RiskResult } from "../domain/risk";
import { buildTraceUrl, formatLotCode, generatePublicToken } from "../domain/qr";
import { appendEvent, audit, raiseAlert, resolveAlertsByKey, type Actor } from "./records";
import { notifyChange } from "./realtime";
import { notify } from "./notifications";
import { loadCompleteness } from "./lot-insights";

// ------------------------------------------------------------------ helpers

export function counters(l: Pick<Lot, "harvestedQty" | "reservedQty" | "soldQty" | "lossQty">): InventoryCounters {
  return { harvested: Number(l.harvestedQty), reserved: Number(l.reservedQty), sold: Number(l.soldQty), loss: Number(l.lossQty) };
}

export function serializeQr(q: QrCode) {
  return {
    id: q.id,
    lotId: q.lotId,
    version: q.version,
    status: q.status,
    publicToken: q.publicToken,
    traceUrl: buildTraceUrl(config.publicTraceBaseUrl, q.publicToken),
    createdAt: q.createdAt.toISOString(),
    revokedAt: q.revokedAt?.toISOString() ?? null,
    revokeReason: q.revokeReason,
    replacedById: q.replacedById,
  };
}

export function serializeEvent(e: TraceabilityEvent & { lotCode?: string | null; actorName?: string | null }) {
  return {
    id: e.id,
    lotId: e.lotId,
    lotCode: e.lotCode ?? undefined,
    orderId: e.orderId,
    eventType: e.eventType,
    eventTime: e.eventTime.toISOString(),
    recordedAt: e.recordedAt.toISOString(),
    actorUserId: e.actorUserId,
    actorName: e.actorName ?? null,
    actorRole: e.actorRole,
    location: e.location,
    latitude: e.latitude,
    longitude: e.longitude,
    quantityBefore: e.quantityBefore == null ? null : Number(e.quantityBefore),
    quantityChange: e.quantityChange == null ? null : Number(e.quantityChange),
    quantityAfter: e.quantityAfter == null ? null : Number(e.quantityAfter),
    status: e.status,
    reason: e.reason,
    source: e.source,
    clientEventId: e.clientEventId,
    previousEventId: e.previousEventId,
    correctsEventId: e.correctsEventId,
    isPublic: e.isPublic,
    metadata: e.metadata,
  };
}

export function serializeStorage(s: LotStorageRecord) {
  return {
    id: s.id,
    lotId: s.lotId,
    storageType: s.storageType,
    storageLocation: s.storageLocation,
    storageStart: s.storageStart.toISOString(),
    storageEnd: s.storageEnd?.toISOString() ?? null,
    temperatureC: s.temperatureC == null ? null : Number(s.temperatureC),
    humidityPct: s.humidityPct == null ? null : Number(s.humidityPct),
    storageCondition: s.storageCondition,
    notes: s.notes,
    createdAt: s.createdAt.toISOString(),
  };
}

const lotSelection = {
  lot: lotsTable,
  productName: productsTable.name,
  variety: productsTable.variety,
  farmName: farmsTable.name,
  farmState: farmsTable.state,
  farmerName: usersTable.name,
};

type LotRow = { lot: Lot; productName: string; variety: string; farmName: string; farmState: string; farmerName: string | null };

function lotBaseQuery(tx: DbOrTx) {
  return tx
    .select(lotSelection)
    .from(lotsTable)
    .innerJoin(productsTable, eq(lotsTable.productId, productsTable.id))
    .innerJoin(farmsTable, eq(lotsTable.farmId, farmsTable.id))
    .innerJoin(usersTable, eq(lotsTable.farmerId, usersTable.id));
}

async function activeQrFor(tx: DbOrTx, lotIds: string[]): Promise<Map<string, QrCode>> {
  if (!lotIds.length) return new Map();
  const rows = await tx
    .select()
    .from(qrCodesTable)
    .where(and(inArray(qrCodesTable.lotId, lotIds), eq(qrCodesTable.status, "ACTIVE")));
  return new Map(rows.map((r) => [r.lotId, r]));
}

function summary(r: LotRow, qr: QrCode | undefined) {
  const c = counters(r.lot);
  return {
    id: r.lot.id,
    lotCode: r.lot.lotCode,
    productId: r.lot.productId,
    productName: r.productName,
    variety: r.variety,
    farmId: r.lot.farmId,
    farmName: r.farmName,
    farmerId: r.lot.farmerId,
    farmerName: r.farmerName,
    status: r.lot.status,
    listed: r.lot.listed,
    recalled: r.lot.recalled,
    pricePerUnit: r.lot.pricePerUnit == null ? null : Number(r.lot.pricePerUnit),
    qualityGrade: r.lot.qualityGrade,
    harvestDate: r.lot.harvestDate,
    inventory: { ...c, available: availableOf(c), unit: r.lot.unit },
    origin: r.lot.origin,
    activeQr: qr ? serializeQr(qr) : null,
    createdAt: r.lot.createdAt.toISOString(),
    updatedAt: r.lot.updatedAt.toISOString(),
  };
}

/** Visibility: farmers see their own lots, admins see all, customers use the public endpoints. */
function assertCanView(user: User, lot: Lot): void {
  if (user.role === "admin") return;
  if (user.role === "farmer" && lot.farmerId === user.id) return;
  // 404 rather than 403 so lot ids cannot be probed.
  throw notFound("Lot not found");
}

export async function listLots(user: User, status?: LotStatus) {
  const conds = [];
  if (user.role === "farmer") conds.push(eq(lotsTable.farmerId, user.id));
  else if (user.role !== "admin") throw forbidden();
  if (status) conds.push(eq(lotsTable.status, status));
  const rows = await lotBaseQuery(db)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(lotsTable.createdAt));
  const qrs = await activeQrFor(db, rows.map((r) => r.lot.id));
  return rows.map((r) => summary(r, qrs.get(r.lot.id)));
}

// ------------------------------------------------------------------ risk + indicative value

const UNIT_TO_QUINTAL: Record<string, number> = { kg: 0.01, quintal: 1, tonne: 10 };

export async function indicativeValue(tx: DbOrTx, productName: string, state: string, available: number, unit: string) {
  if (available <= 0) return null;
  const latest = (stateFilter: boolean) =>
    tx
      .select()
      .from(marketPriceObservationsTable)
      .where(
        and(
          sql`lower(${marketPriceObservationsTable.commodity}) = lower(${productName})`,
          sql`${marketPriceObservationsTable.modalPrice} IS NOT NULL`,
          stateFilter ? sql`lower(${marketPriceObservationsTable.state}) = lower(${state})` : undefined,
        ),
      )
      .orderBy(desc(marketPriceObservationsTable.observationDate))
      .limit(1);
  // Prefer a market in the farm's state; otherwise the latest observation anywhere.
  const [obs] = (await latest(true)).length ? await latest(true) : await latest(false);
  if (!obs || obs.modalPrice == null) return null;
  const quintals = available * (UNIT_TO_QUINTAL[unit] ?? 0.01);
  return {
    amount: Math.round(quintals * Number(obs.modalPrice)),
    currency: "INR",
    basis: `${available} ${unit} × modal ₹${obs.modalPrice}/quintal`,
    observationDate: obs.observationDate,
    market: `${obs.market}, ${obs.state}`,
    label: "INDICATIVE MARKET VALUE (external mandi modal price; not a SeedChain transaction price)",
  };
}

export async function computeRisk(tx: DbOrTx, lot: Lot, now = new Date()): Promise<RiskResult> {
  const c = counters(lot);
  const [storage] = await tx
    .select()
    .from(lotStorageRecordsTable)
    .where(eq(lotStorageRecordsTable.lotId, lot.id))
    .orderBy(desc(lotStorageRecordsTable.storageStart))
    .limit(1);
  const [quality] = await tx
    .select({ t: max(traceabilityEventsTable.eventTime) })
    .from(traceabilityEventsTable)
    .where(and(eq(traceabilityEventsTable.lotId, lot.id), eq(traceabilityEventsTable.eventType, "QUALITY_RECORDED")));
  const [spoil] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(traceabilityEventsTable)
    .where(
      and(
        eq(traceabilityEventsTable.lotId, lot.id),
        eq(traceabilityEventsTable.eventType, "SPOILAGE_RECORDED"),
        gte(traceabilityEventsTable.eventTime, new Date(now.getTime() - 30 * 86_400_000)),
      ),
    );
  const [stalled] = await tx
    .select({ n: sql<number>`count(distinct ${ordersTable.id})::int` })
    .from(ordersTable)
    .innerJoin(orderItemsTable, eq(orderItemsTable.orderId, ordersTable.id))
    .where(
      and(
        eq(orderItemsTable.lotId, lot.id),
        inArray(ordersTable.status, ["ACCEPTED", "PREPARING", "READY"]),
        lt(ordersTable.updatedAt, new Date(now.getTime() - 3 * 86_400_000)),
      ),
    );
  const [weather] = await tx
    .select()
    .from(weatherObservationsTable)
    .where(eq(weatherObservationsTable.farmId, lot.farmId))
    .orderBy(desc(weatherObservationsTable.observationTime))
    .limit(1);
  return assessRisk({
    now,
    harvested: c.harvested,
    available: availableOf(c),
    loss: c.loss,
    qualityGrade: lot.qualityGrade,
    qualityRecordedAt: quality?.t ?? null,
    harvestDate: lot.harvestDate ? new Date(lot.harvestDate) : null,
    storage: storage
      ? {
          storageType: storage.storageType,
          storageStart: storage.storageStart,
          storageEnd: storage.storageEnd,
          temperatureC: storage.temperatureC == null ? null : Number(storage.temperatureC),
          humidityPct: storage.humidityPct == null ? null : Number(storage.humidityPct),
          storageCondition: storage.storageCondition,
        }
      : null,
    spoilageEventsLast30d: spoil?.n ?? 0,
    stalledOrders: stalled?.n ?? 0,
    weather: weather ? { temperatureC: weather.temperatureC, humidityPct: weather.humidityPct, observationTime: weather.observationTime } : null,
  });
}

/** Raises (or resolves) the SPOILAGE_RISK alert for a lot based on the rule engine. */
export async function syncRiskAlert(tx: DbOrTx, lot: Lot, risk: RiskResult): Promise<void> {
  const key = `SPOILAGE_RISK:${lot.id}`;
  if (risk.level === "HIGH" || risk.level === "CRITICAL") {
    await raiseAlert(tx, {
      type: "SPOILAGE_RISK",
      severity: risk.level,
      message: `${lot.lotCode}: ${risk.level} spoilage risk. ${risk.reasons.join("; ")}`,
      entityType: "lot",
      entityId: lot.id,
      farmerId: lot.farmerId,
      metadata: { reasons: risk.reasons, score: risk.score, engine: risk.engine },
      dedupeKey: key,
    });
  } else {
    await resolveAlertsByKey(tx, key);
  }
}

export async function getLotDetail(user: User, lotId: string) {
  const [row] = await lotBaseQuery(db).where(eq(lotsTable.id, lotId)).limit(1);
  if (!row) throw notFound("Lot not found");
  assertCanView(user, row.lot);
  return lotDetail(db, row);
}

async function lotDetail(tx: DbOrTx, row: LotRow) {
  const qrs = await activeQrFor(tx, [row.lot.id]);
  const [storage] = await tx
    .select()
    .from(lotStorageRecordsTable)
    .where(eq(lotStorageRecordsTable.lotId, row.lot.id))
    .orderBy(desc(lotStorageRecordsTable.storageStart))
    .limit(1);
  const s = summary(row, qrs.get(row.lot.id));
  const completeness = (await loadCompleteness([row.lot.id], tx)).get(row.lot.id)!;
  const [quality] = await tx.select().from(lotQualityRecordsTable).where(eq(lotQualityRecordsTable.lotId, row.lot.id)).orderBy(desc(lotQualityRecordsTable.inspectionDate), desc(lotQualityRecordsTable.createdAt)).limit(1);
  const [scan] = await tx
    .select({ total: sql<number>`count(*) FILTER (WHERE ${qrScanEventsTable.result} = 'OK')::int`, unique: sql<number>`count(DISTINCT coalesce(${qrScanEventsTable.sessionId}, ${qrScanEventsTable.userId}::text, ${qrScanEventsTable.id}::text)) FILTER (WHERE ${qrScanEventsTable.result} = 'OK')::int` })
    .from(qrScanEventsTable)
    .where(eq(qrScanEventsTable.lotId, row.lot.id));
  return {
    ...s,
    completeness: { percent: completeness.percent, missing: completeness.missing, components: completeness.components },
    latestQuality: quality
      ? { grade: quality.grade, appearance: quality.appearance, sizeCategory: quality.sizeCategory, defects: quality.defects, inspectionDate: quality.inspectionDate, notes: quality.notes, recordedBy: quality.recordedBy }
      : null,
    scanStats: { verifiedScans: scan?.total ?? 0, uniqueScanners: scan?.unique ?? 0 },
    plantingDate: row.lot.plantingDate,
    expectedHarvestDate: row.lot.expectedHarvestDate,
    qualityNotes: row.lot.qualityNotes,
    publicNotes: row.lot.publicNotes,
    privateNotes: row.lot.privateNotes,
    risk: await computeRisk(tx, row.lot),
    latestStorage: storage ? serializeStorage(storage) : null,
    estimatedMarketValue: await indicativeValue(tx, row.productName, row.farmState, s.inventory.available, row.lot.unit),
  };
}

async function loadLotDetailById(tx: DbOrTx, lotId: string) {
  const [row] = await lotBaseQuery(tx).where(eq(lotsTable.id, lotId)).limit(1);
  if (!row) throw notFound("Lot not found");
  return lotDetail(tx, row);
}

/** Locks a lot row (SELECT … FOR UPDATE) and checks the caller owns it. */
export async function lockOwnedLot(tx: DbOrTx, lotId: string, farmer: User): Promise<Lot> {
  const [lot] = await tx.select().from(lotsTable).where(eq(lotsTable.id, lotId)).for("update");
  if (!lot || lot.farmerId !== farmer.id) throw notFound("Lot not found");
  return lot;
}

/**
 * Writes new inventory counters + derived status. The database CHECK
 * constraints are the last line of defence; this function validates first
 * so callers get a clear error.
 */
export async function applyLotState(
  tx: DbOrTx,
  lot: Lot,
  next: InventoryCounters,
  extra: Partial<Pick<Lot, "listed" | "pricePerUnit" | "qualityGrade" | "qualityNotes" | "harvestDate" | "status">> = {},
): Promise<Lot> {
  for (const [k, v] of Object.entries(next)) {
    if (v < 0) throw conflict(`Inventory ${k} cannot become negative`, "NEGATIVE_INVENTORY");
  }
  if (availableOf(next) < 0) throw conflict("Insufficient available inventory", "INSUFFICIENT_INVENTORY");
  const listed = extra.listed ?? lot.listed;
  const baseStatus = (extra.status ?? lot.status) as LotStatus;
  const status = deriveLotStatus(baseStatus, next, listed);
  assertLotTransition(lot.status as LotStatus, status);
  const [updated] = await tx
    .update(lotsTable)
    .set({
      harvestedQty: round3(next.harvested),
      reservedQty: round3(next.reserved),
      soldQty: round3(next.sold),
      lossQty: round3(next.loss),
      ...extra,
      status,
      version: sql`${lotsTable.version} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(lotsTable.id, lot.id))
    .returning();
  return updated;
}

/** Appends LOT_SOLD_OUT when a lot transitions into SOLD_OUT. */
export async function maybeSoldOut(tx: DbOrTx, actor: Actor, before: Lot, after: Lot, orderId?: string): Promise<void> {
  if (before.status !== "SOLD_OUT" && after.status === "SOLD_OUT") {
    await appendEvent(tx, actor, {
      lotId: after.id,
      eventType: "LOT_SOLD_OUT",
      orderId: orderId ?? null,
      quantityAfter: 0,
      status: "SOLD_OUT",
      reason: "No remaining available or reserved stock",
    });
  }
}

// ------------------------------------------------------------------ create

export interface StorageInput {
  storageType: string;
  storageLocation: string;
  storageStart: Date;
  storageEnd?: Date;
  temperatureC?: number;
  humidityPct?: number;
  storageCondition?: string;
  notes?: string;
}

export interface CreateLotInput {
  farmId: string;
  productId?: string;
  productName?: string;
  variety?: string;
  unit?: string;
  plantingDate?: string;
  expectedHarvestDate?: string;
  harvestDate?: string;
  harvestQuantity?: number;
  qualityGrade?: "A" | "B" | "C";
  qualityNotes?: string;
  origin: string;
  publicNotes?: string;
  privateNotes?: string;
  storage?: StorageInput;
  clientEventId?: string;
}

async function insertStorage(tx: DbOrTx, lot: Lot, s: StorageInput, clientEventId?: string | null) {
  // Close any open storage period of this lot (completing, not rewriting, history).
  await tx
    .update(lotStorageRecordsTable)
    .set({ storageEnd: s.storageStart })
    .where(and(eq(lotStorageRecordsTable.lotId, lot.id), sql`${lotStorageRecordsTable.storageEnd} IS NULL`, lt(lotStorageRecordsTable.storageStart, s.storageStart)));
  const [rec] = await tx
    .insert(lotStorageRecordsTable)
    .values({
      lotId: lot.id,
      farmerId: lot.farmerId,
      storageType: s.storageType,
      storageLocation: s.storageLocation,
      storageStart: s.storageStart,
      storageEnd: s.storageEnd ?? null,
      temperatureC: s.temperatureC ?? null,
      humidityPct: s.humidityPct ?? null,
      storageCondition: s.storageCondition ?? null,
      notes: s.notes ?? null,
      clientEventId: clientEventId ?? null,
    })
    .returning();
  return rec;
}

async function issueQr(tx: DbOrTx, actor: Actor, lotId: string, version: number) {
  const [qr] = await tx
    .insert(qrCodesTable)
    .values({ lotId, publicToken: generatePublicToken(), version, status: "ACTIVE", createdBy: actor.user?.id ?? null })
    .returning();
  await appendEvent(tx, actor, {
    lotId,
    eventType: "QR_GENERATED",
    metadata: { qrId: qr.id, qrVersion: version },
  });
  return qr;
}

export async function createLot(actor: Actor & { user: User }, input: CreateLotInput) {
  const farmer = actor.user;
  if (input.clientEventId) {
    const [existing] = await db
      .select({ lotId: traceabilityEventsTable.lotId })
      .from(traceabilityEventsTable)
      .where(eq(traceabilityEventsTable.clientEventId, input.clientEventId));
    if (existing) return { duplicate: true, lot: await getLotDetail(farmer, existing.lotId) };
  }
  if (input.harvestQuantity && !input.harvestDate) throw badRequest("harvestDate is required when harvestQuantity is given");
  if (input.qualityGrade && !input.harvestQuantity) throw badRequest("Quality can only be recorded for harvested produce");

  const lotId = await db.transaction(async (tx) => {
    const [farm] = await tx.select().from(farmsTable).where(eq(farmsTable.id, input.farmId));
    if (!farm || farm.farmerId !== farmer.id) throw notFound("Farm not found");

    let productId = input.productId;
    if (productId) {
      const [p] = await tx.select().from(productsTable).where(eq(productsTable.id, productId));
      if (!p || p.farmerId !== farmer.id) throw notFound("Product not found");
    } else {
      if (!input.productName || !input.variety) throw badRequest("Provide productId, or productName and variety");
      const [p] = await tx
        .select()
        .from(productsTable)
        .where(and(eq(productsTable.farmerId, farmer.id), sql`lower(${productsTable.name}) = lower(${input.productName})`, sql`lower(${productsTable.variety}) = lower(${input.variety})`));
      productId =
        p?.id ??
        (await tx.insert(productsTable).values({ farmerId: farmer.id, name: input.productName.trim(), variety: input.variety.trim(), unit: input.unit ?? "kg" }).returning())[0].id;
    }
    const [product] = await tx.select().from(productsTable).where(eq(productsTable.id, productId));

    const seq = (await tx.execute(sql`SELECT nextval(${lotCodeSeq.seqName}) AS n`)).rows[0].n as string;
    const lotCode = formatLotCode(new Date().getUTCFullYear(), farm.state, farm.district, BigInt(seq));
    const [lot] = await tx
      .insert(lotsTable)
      .values({
        lotCode,
        farmerId: farmer.id,
        farmId: farm.id,
        productId,
        unit: input.unit ?? product.unit,
        plantingDate: input.plantingDate ?? null,
        expectedHarvestDate: input.expectedHarvestDate ?? null,
        origin: input.origin,
        publicNotes: input.publicNotes ?? null,
        privateNotes: input.privateNotes ?? null,
        status: "CREATED",
      })
      .returning();
    const farmLocation = [farm.village, farm.district, farm.state].filter(Boolean).join(", ");
    const created = await appendEvent(tx, actor, {
      lotId: lot.id,
      eventType: "LOT_CREATED",
      clientEventId: input.clientEventId ?? null,
      location: farmLocation,
      latitude: farm.latitude ?? null,
      longitude: farm.longitude ?? null,
      quantityAfter: 0,
      status: "CREATED",
      reason: "Farmer registered a new lot",
      metadata: { lotCode, productName: product.name, variety: product.variety, farmId: farm.id },
    });

    let current = lot;
    if (input.harvestQuantity) {
      const before = counters(current);
      current = await applyLotState(tx, current, { ...before, harvested: before.harvested + input.harvestQuantity }, {
        harvestDate: input.harvestDate!,
        qualityGrade: input.qualityGrade ?? null,
        qualityNotes: input.qualityNotes ?? null,
      });
      await appendEvent(tx, actor, {
        lotId: lot.id,
        eventType: "HARVEST_RECORDED",
        eventTime: new Date(`${input.harvestDate}T00:00:00Z`),
        location: farmLocation,
        latitude: farm.latitude ?? null,
        longitude: farm.longitude ?? null,
        quantityBefore: availableOf(before),
        quantityChange: input.harvestQuantity,
        quantityAfter: availableOf(counters(current)),
        status: current.status,
        reason: "Harvest",
        metadata: { unit: current.unit },
      });
      if (input.qualityGrade) {
        await tx.insert(lotQualityRecordsTable).values({ lotId: lot.id, farmerId: farmer.id, grade: input.qualityGrade, inspectionDate: input.harvestDate!, notes: input.qualityNotes ?? null });
        await appendEvent(tx, actor, {
          lotId: lot.id,
          eventType: "QUALITY_RECORDED",
          status: current.status,
          reason: input.qualityNotes ?? "Quality grading at harvest",
          metadata: { qualityGrade: input.qualityGrade, recordedBy: "FARMER" },
        });
      }
    }
    if (input.storage) {
      const rec = await insertStorage(tx, current, input.storage);
      await appendEvent(tx, actor, {
        lotId: lot.id,
        eventType: "STORAGE_RECORDED",
        eventTime: input.storage.storageStart,
        location: input.storage.storageLocation,
        status: current.status,
        reason: "Farmer-managed storage",
        metadata: { storageRecordId: rec.id, storageType: rec.storageType, temperatureC: rec.temperatureC, humidityPct: rec.humidityPct },
      });
    }
    await issueQr(tx, actor, lot.id, 1);
    await audit(tx, actor, "LOT_CREATED", "lot", lot.id, null, { lotCode, harvested: Number(current.harvestedQty) }, created.id);
    await notifyChange(tx, { topic: "lots", entityId: lot.id, lotId: lot.id, farmerId: farmer.id });
    return lot.id;
  });
  return { duplicate: false, lot: await getLotDetail(farmer, lotId) };
}

// ------------------------------------------------------------------ update / listing

export async function updateLot(
  actor: Actor & { user: User },
  lotId: string,
  input: { plantingDate?: string; expectedHarvestDate?: string; publicNotes?: string; privateNotes?: string; origin?: string },
) {
  await db.transaction(async (tx) => {
    const lot = await lockOwnedLot(tx, lotId, actor.user);
    const changes = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
    if (!Object.keys(changes).length) throw badRequest("Nothing to update");
    const before = Object.fromEntries(Object.keys(changes).map((k) => [k, (lot as Record<string, unknown>)[k]]));
    await tx.update(lotsTable).set({ ...changes, version: sql`${lotsTable.version} + 1`, updatedAt: new Date() }).where(eq(lotsTable.id, lot.id));
    const ev = await appendEvent(tx, actor, {
      lotId: lot.id,
      eventType: "LOT_UPDATED",
      isPublic: false,
      status: lot.status,
      reason: "Farmer updated lot details",
      metadata: { changedFields: Object.keys(changes), before, after: changes },
    });
    await audit(tx, actor, "LOT_UPDATED", "lot", lot.id, before, changes, ev.id);
    await notifyChange(tx, { topic: "lots", entityId: lot.id, lotId: lot.id, farmerId: lot.farmerId });
  });
  return getLotDetail(actor.user, lotId);
}

export async function setListing(actor: Actor & { user: User }, lotId: string, input: { listed: boolean; pricePerUnit?: number }) {
  await db.transaction(async (tx) => {
    const lot = await lockOwnedLot(tx, lotId, actor.user);
    if (lot.recalled && input.listed) throw conflict("A recalled lot cannot be listed", "LOT_RECALLED");
    const c = counters(lot);
    const price = input.pricePerUnit ?? (lot.pricePerUnit == null ? null : Number(lot.pricePerUnit));
    if (input.listed) {
      if (c.harvested <= 0) throw conflict("Record a harvest before listing this lot", "INVALID_STATE_TRANSITION");
      if (price == null) throw badRequest("pricePerUnit is required to list a lot");
      if (availableOf(c) <= 0) throw conflict("No available stock to list", "INSUFFICIENT_INVENTORY");
    }
    const after = await applyLotState(tx, lot, c, { listed: input.listed, pricePerUnit: price });
    const ev = await appendEvent(tx, actor, {
      lotId: lot.id,
      eventType: input.listed ? "LOT_AVAILABLE" : "LOT_UNLISTED",
      quantityAfter: availableOf(c),
      status: after.status,
      reason: input.listed ? "Farmer listed produce for customers" : "Farmer paused listing",
      metadata: { pricePerUnit: price, previousPrice: lot.pricePerUnit, unit: lot.unit },
    });
    await audit(tx, actor, "LOT_LISTING_UPDATED", "lot", lot.id, { listed: lot.listed, pricePerUnit: lot.pricePerUnit }, { listed: input.listed, pricePerUnit: price }, ev.id);
    await notifyChange(tx, { topic: "lots", entityId: lot.id, lotId: lot.id, farmerId: lot.farmerId });
    await notifyChange(tx, { topic: "listings", lotId: lot.id });
  });
  return getLotDetail(actor.user, lotId);
}

// ------------------------------------------------------------------ farmer-recorded events

export interface RecordEventInput {
  eventType:
    | "GROWING_RECORDED"
    | "HARVEST_RECORDED"
    | "QUALITY_RECORDED"
    | "STORAGE_RECORDED"
    | "LOSS_RECORDED"
    | "SPOILAGE_RECORDED"
    | "CORRECTION_RECORDED";
  clientEventId: string;
  eventTime?: Date;
  quantity?: number;
  harvestAdjustment?: number;
  qualityGrade?: "A" | "B" | "C";
  appearance?: string;
  sizeCategory?: string;
  defects?: string;
  inspectionDate?: string;
  reason?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  correctsEventId?: string;
  storage?: StorageInput;
}

export async function findEventByClientId(clientEventId: string) {
  const [e] = await db.select().from(traceabilityEventsTable).where(eq(traceabilityEventsTable.clientEventId, clientEventId));
  return e ?? null;
}

export async function recordLotEvent(actor: Actor & { user: User }, lotId: string, input: RecordEventInput) {
  const existing = await findEventByClientId(input.clientEventId);
  if (existing) {
    if (existing.lotId !== lotId) throw conflict("clientEventId already used for another lot", "IDEMPOTENCY_KEY_REUSED");
    return { duplicate: true, event: serializeEvent(existing) };
  }
  const eventTime = input.eventTime ?? new Date();
  if (eventTime.getTime() > Date.now() + 5 * 60_000) throw badRequest("eventTime cannot be in the future");

  const event = await db.transaction(async (tx) => {
    const lot = await lockOwnedLot(tx, lotId, actor.user);
    const before = counters(lot);
    const next = { ...before };
    let extra: Parameters<typeof applyLotState>[3] = {};
    let quantityChange: number | null = null;
    const metadata: Record<string, unknown> = { unit: lot.unit };
    const base = {
      lotId: lot.id,
      eventType: input.eventType,
      eventTime,
      clientEventId: input.clientEventId,
      location: input.location ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      reason: input.reason ?? null,
    };

    switch (input.eventType) {
      case "GROWING_RECORDED":
        if (lot.status !== "CREATED") throw conflict(`Cannot mark a ${lot.status} lot as growing`, "INVALID_STATE_TRANSITION");
        extra = { status: "GROWING" };
        break;
      case "HARVEST_RECORDED":
        if (!input.quantity) throw badRequest("quantity is required for HARVEST_RECORDED");
        if (lot.status === "SOLD_OUT") throw conflict("Cannot add harvest to a sold-out lot; create a new lot", "INVALID_STATE_TRANSITION");
        next.harvested += input.quantity;
        quantityChange = input.quantity;
        extra = { harvestDate: lot.harvestDate ?? eventTime.toISOString().slice(0, 10) };
        if (input.qualityGrade) extra.qualityGrade = input.qualityGrade;
        break;
      case "QUALITY_RECORDED":
        if (!input.qualityGrade) throw badRequest("qualityGrade is required for QUALITY_RECORDED");
        if (before.harvested <= 0) throw conflict("Quality can only be recorded after harvest", "INVALID_STATE_TRANSITION");
        extra = { qualityGrade: input.qualityGrade, qualityNotes: input.reason ?? lot.qualityNotes };
        metadata.qualityGrade = input.qualityGrade;
        metadata.previousGrade = lot.qualityGrade;
        metadata.recordedBy = "FARMER";
        for (const k of ["appearance", "sizeCategory", "defects"] as const) if (input[k]) metadata[k] = input[k];
        await tx.insert(lotQualityRecordsTable).values({
          lotId: lot.id,
          farmerId: lot.farmerId,
          grade: input.qualityGrade,
          appearance: input.appearance ?? null,
          sizeCategory: input.sizeCategory ?? null,
          defects: input.defects ?? null,
          inspectionDate: input.inspectionDate ?? eventTime.toISOString().slice(0, 10),
          notes: input.reason ?? null,
          clientEventId: input.clientEventId,
        });
        break;
      case "STORAGE_RECORDED": {
        if (!input.storage) throw badRequest("storage is required for STORAGE_RECORDED");
        if (before.harvested <= 0) throw conflict("Storage can only be recorded after harvest", "INVALID_STATE_TRANSITION");
        const rec = await insertStorage(tx, lot, input.storage, input.clientEventId);
        base.eventTime = input.storage.storageStart;
        base.location = input.storage.storageLocation;
        Object.assign(metadata, {
          storageRecordId: rec.id,
          storageType: rec.storageType,
          temperatureC: rec.temperatureC,
          humidityPct: rec.humidityPct,
          storageCondition: rec.storageCondition,
        });
        break;
      }
      case "LOSS_RECORDED":
      case "SPOILAGE_RECORDED":
        if (!input.quantity) throw badRequest("quantity is required");
        if (!input.reason?.trim()) throw badRequest("reason is required for loss/spoilage");
        if (input.quantity > availableOf(before)) {
          throw conflict(`Loss of ${input.quantity} exceeds available stock ${availableOf(before)}`, "INSUFFICIENT_INVENTORY");
        }
        next.loss += input.quantity;
        quantityChange = -input.quantity;
        break;
      case "CORRECTION_RECORDED": {
        if (!input.correctsEventId) throw badRequest("correctsEventId is required for corrections");
        if (!input.reason?.trim()) throw badRequest("reason is required for corrections");
        const [orig] = await tx.select().from(traceabilityEventsTable).where(eq(traceabilityEventsTable.id, input.correctsEventId));
        if (!orig || orig.lotId !== lot.id) throw notFound("Event to correct not found on this lot");
        if (input.harvestAdjustment) {
          if (orig.eventType !== "HARVEST_RECORDED") throw badRequest("harvestAdjustment can only correct a HARVEST_RECORDED event");
          next.harvested += input.harvestAdjustment;
          quantityChange = input.harvestAdjustment;
          if (availableOf(next) < 0 || next.harvested <= 0) {
            throw conflict("Correction would make inventory negative (stock already reserved/sold/lost)", "NEGATIVE_INVENTORY");
          }
        }
        if (input.qualityGrade) extra = { qualityGrade: input.qualityGrade };
        metadata.correctedEventType = orig.eventType;
        break;
      }
    }

    const after = await applyLotState(tx, lot, next, extra);
    const ev = await appendEvent(tx, actor, {
      ...base,
      correctsEventId: input.correctsEventId ?? null,
      quantityBefore: availableOf(before),
      quantityChange,
      quantityAfter: availableOf(counters(after)),
      status: after.status,
      metadata,
    });
    if (input.eventType === "LOSS_RECORDED" || input.eventType === "SPOILAGE_RECORDED") {
      await audit(tx, actor, "INVENTORY_ADJUSTED", "lot", lot.id, before, counters(after), ev.id);
    }
    if (input.eventType === "CORRECTION_RECORDED") {
      await audit(tx, actor, "EVENT_CORRECTED", "traceability_event", input.correctsEventId!, before, counters(after), ev.id);
    }
    await maybeSoldOut(tx, actor, lot, after);
    await syncRiskAlert(tx, after, await computeRisk(tx, after));
    await notifyChange(tx, { topic: "lots", entityId: lot.id, lotId: lot.id, farmerId: lot.farmerId });
    return ev;
  });
  return { duplicate: false, event: serializeEvent(event) };
}

export async function listLotEvents(user: User, lotId: string) {
  const [lot] = await db.select().from(lotsTable).where(eq(lotsTable.id, lotId));
  if (!lot) throw notFound("Lot not found");
  assertCanView(user, lot);
  const rows = await db
    .select({ e: traceabilityEventsTable, actorName: usersTable.name })
    .from(traceabilityEventsTable)
    .leftJoin(usersTable, eq(traceabilityEventsTable.actorUserId, usersTable.id))
    .where(eq(traceabilityEventsTable.lotId, lotId))
    .orderBy(asc(traceabilityEventsTable.eventTime), asc(traceabilityEventsTable.recordedAt));
  return rows.map((r) => serializeEvent({ ...r.e, lotCode: lot.lotCode, actorName: r.actorName }));
}

export async function listLotStorage(user: User, lotId: string) {
  const [lot] = await db.select().from(lotsTable).where(eq(lotsTable.id, lotId));
  if (!lot) throw notFound("Lot not found");
  assertCanView(user, lot);
  const rows = await db.select().from(lotStorageRecordsTable).where(eq(lotStorageRecordsTable.lotId, lotId)).orderBy(desc(lotStorageRecordsTable.storageStart));
  return rows.map(serializeStorage);
}

// ------------------------------------------------------------------ QR lifecycle

export async function listLotQr(user: User, lotId: string) {
  const [lot] = await db.select().from(lotsTable).where(eq(lotsTable.id, lotId));
  if (!lot) throw notFound("Lot not found");
  assertCanView(user, lot);
  const rows = await db.select().from(qrCodesTable).where(eq(qrCodesTable.lotId, lotId)).orderBy(desc(qrCodesTable.version));
  return rows.map(serializeQr);
}

/** Issues a new QR for the same lot identity; the previous active QR becomes REPLACED. */
export async function replaceQr(actor: Actor & { user: User }, lotId: string, reason: string) {
  const qr = await db.transaction(async (tx) => {
    const [lot] = await tx.select().from(lotsTable).where(eq(lotsTable.id, lotId)).for("update");
    if (!lot) throw notFound("Lot not found");
    if (actor.user.role === "farmer" && lot.farmerId !== actor.user.id) throw notFound("Lot not found");
    if (actor.user.role === "customer") throw forbidden();
    const [{ v }] = await tx.select({ v: max(qrCodesTable.version) }).from(qrCodesTable).where(eq(qrCodesTable.lotId, lotId));
    const [old] = await tx.select().from(qrCodesTable).where(and(eq(qrCodesTable.lotId, lotId), inArray(qrCodesTable.status, ["ACTIVE", "DISABLED"])));
    if (old) await tx.update(qrCodesTable).set({ status: "REPLACED", revokedAt: new Date(), revokedBy: actor.user.id, revokeReason: reason }).where(eq(qrCodesTable.id, old.id));
    const fresh = await issueQr(tx, actor, lotId, (v ?? 0) + 1);
    if (old) await tx.update(qrCodesTable).set({ replacedById: fresh.id }).where(eq(qrCodesTable.id, old.id));
    const ev = await appendEvent(tx, actor, { lotId, eventType: "QR_REPLACED", reason, metadata: { oldQrId: old?.id ?? null, newQrId: fresh.id, newVersion: fresh.version } });
    await audit(tx, actor, "QR_REPLACED", "qr_code", fresh.id, old ? { id: old.id, version: old.version, status: "ACTIVE" } : null, { id: fresh.id, version: fresh.version }, ev.id);
    await notifyChange(tx, { topic: "lots", entityId: lotId, lotId, farmerId: lot.farmerId });
    return fresh;
  });
  return serializeQr(qr);
}

/** Admin revocation of a compromised label. History and lot identity stay intact. */
export async function revokeQr(actor: Actor & { user: User }, qrId: string, reason: string, issueReplacement: boolean) {
  await db.transaction(async (tx) => {
    const [qr] = await tx.select().from(qrCodesTable).where(eq(qrCodesTable.id, qrId)).for("update");
    if (!qr) throw notFound("QR not found");
    if (qr.status !== "ACTIVE" && qr.status !== "DISABLED") throw conflict(`QR is already ${qr.status}`, "INVALID_STATE_TRANSITION");
    const [lot] = await tx.select().from(lotsTable).where(eq(lotsTable.id, qr.lotId)).for("update");
    await tx.update(qrCodesTable).set({ status: "REVOKED", revokedAt: new Date(), revokedBy: actor.user.id, revokeReason: reason }).where(eq(qrCodesTable.id, qr.id));
    await notify(tx, [lot.farmerId], { type: "QR_REVOKED", params: { lotCode: lot.lotCode }, entityType: "lot", entityId: lot.id });
    const ev = await appendEvent(tx, actor, { lotId: qr.lotId, eventType: "QR_REVOKED", reason, metadata: { qrId: qr.id, qrVersion: qr.version } });
    await audit(tx, actor, "QR_REVOKED", "qr_code", qr.id, { status: "ACTIVE" }, { status: "REVOKED", reason }, ev.id);
    if (issueReplacement) {
      const [{ v }] = await tx.select({ v: max(qrCodesTable.version) }).from(qrCodesTable).where(eq(qrCodesTable.lotId, qr.lotId));
      const fresh = await issueQr(tx, actor, qr.lotId, (v ?? 0) + 1);
      await tx.update(qrCodesTable).set({ replacedById: fresh.id }).where(eq(qrCodesTable.id, qr.id));
    }
    await raiseAlert(tx, {
      type: "REVOKED_QR",
      severity: "MEDIUM",
      message: `QR v${qr.version} of ${lot.lotCode} was revoked by an admin: ${reason}`,
      entityType: "lot",
      entityId: lot.id,
      farmerId: lot.farmerId,
      metadata: { qrId: qr.id, reason },
    });
    await notifyChange(tx, { topic: "lots", entityId: lot.id, lotId: lot.id, farmerId: lot.farmerId });
  });
  const [qr] = await db.select().from(qrCodesTable).where(eq(qrCodesTable.id, qrId));
  return serializeQr(qr);
}

export { loadLotDetailById };
