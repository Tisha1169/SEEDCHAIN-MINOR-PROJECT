import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  integer,
  index,
  uniqueIndex,
  numeric,
  date,
  boolean,
  check,
  jsonb,
  doublePrecision,
  pgSequence,
} from "drizzle-orm/pg-core";
import { usersTable, farmsTable, productsTable, userRoleEnum } from "./users";

/** Global sequence used for the human-readable lot code (LOT-2026-PB-000001). */
export const lotCodeSeq = pgSequence("lot_code_seq", { startWith: 1, increment: 1 });

export const lotStatusEnum = pgEnum("lot_status", [
  "CREATED",
  "GROWING",
  "HARVESTED",
  "AVAILABLE",
  "RESERVED",
  "PARTIALLY_SOLD",
  "SOLD_OUT",
]);

export const qualityGradeEnum = pgEnum("quality_grade", ["A", "B", "C"]);

/**
 * One physical agricultural lot. Inventory is held as four non-negative
 * counters; `available_qty` is a generated column so it can never drift
 * from the formula AVAILABLE = HARVESTED - RESERVED - SOLD - LOSS.
 * The CHECK constraint makes overselling impossible at the database level.
 */
export const lotsTable = pgTable(
  "lots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lotCode: text("lot_code").notNull().unique(),
    farmerId: uuid("farmer_id")
      .notNull()
      .references(() => usersTable.id),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farmsTable.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id),
    unit: text("unit").notNull().default("kg"),
    plantingDate: date("planting_date"),
    expectedHarvestDate: date("expected_harvest_date"),
    harvestDate: date("harvest_date"),
    harvestedQty: numeric("harvested_qty", { precision: 12, scale: 3, mode: "number" }).notNull().default(0),
    reservedQty: numeric("reserved_qty", { precision: 12, scale: 3, mode: "number" }).notNull().default(0),
    soldQty: numeric("sold_qty", { precision: 12, scale: 3, mode: "number" }).notNull().default(0),
    lossQty: numeric("loss_qty", { precision: 12, scale: 3, mode: "number" }).notNull().default(0),
    availableQty: numeric("available_qty", { precision: 12, scale: 3, mode: "number" }).generatedAlwaysAs(
      sql`harvested_qty - reserved_qty - sold_qty - loss_qty`,
    ),
    pricePerUnit: numeric("price_per_unit", { precision: 12, scale: 2, mode: "number" }),
    listed: boolean("listed").notNull().default(false),
    /** Fast flag; the history lives in lot_recalls. A recalled lot cannot be listed or ordered. */
    recalled: boolean("recalled").notNull().default(false),
    qualityGrade: qualityGradeEnum("quality_grade"),
    qualityNotes: text("quality_notes"),
    origin: text("origin").notNull(),
    status: lotStatusEnum("status").notNull().default("CREATED"),
    publicNotes: text("public_notes"),
    privateNotes: text("private_notes"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("lots_farmer_idx").on(t.farmerId),
    index("lots_status_idx").on(t.status),
    index("lots_listed_idx").on(t.listed),
    index("lots_created_idx").on(t.createdAt),
    check(
      "lots_inventory_non_negative",
      sql`${t.harvestedQty} >= 0 AND ${t.reservedQty} >= 0 AND ${t.soldQty} >= 0 AND ${t.lossQty} >= 0`,
    ),
    check(
      "lots_inventory_balance",
      sql`${t.reservedQty} + ${t.soldQty} + ${t.lossQty} <= ${t.harvestedQty}`,
    ),
    check("lots_price_non_negative", sql`${t.pricePerUnit} IS NULL OR ${t.pricePerUnit} >= 0`),
  ],
);

/** DISABLED = temporarily switched off by an admin (reversible); REVOKED/REPLACED are final. */
export const qrStatusEnum = pgEnum("qr_status", ["ACTIVE", "REVOKED", "REPLACED", "DISABLED"]);

/**
 * A QR identity for a lot. The printed QR encodes only
 *   <PUBLIC_TRACE_BASE_URL>/trace/<public_token>
 * The token is 256 bits of CSPRNG output (base64url). At most one ACTIVE
 * QR exists per lot; replacement keeps the lot identity and history.
 */
export const qrCodesTable = pgTable(
  "qr_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => lotsTable.id),
    publicToken: text("public_token").notNull().unique(),
    version: integer("version").notNull(),
    status: qrStatusEnum("status").notNull().default("ACTIVE"),
    createdBy: uuid("created_by").references(() => usersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedBy: uuid("revoked_by").references(() => usersTable.id),
    revokeReason: text("revoke_reason"),
    replacedById: uuid("replaced_by_id"),
  },
  (t) => [
    index("qr_lot_idx").on(t.lotId),
    uniqueIndex("qr_one_active_per_lot").on(t.lotId).where(sql`status = 'ACTIVE'`),
    uniqueIndex("qr_lot_version_uq").on(t.lotId, t.version),
  ],
);

/**
 * Append-only traceability log. A database trigger (see migrations) rejects
 * UPDATE and DELETE. Corrections are new events that reference the original.
 */
export const traceabilityEventsTable = pgTable(
  "traceability_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => lotsTable.id),
    orderId: uuid("order_id"),
    eventType: text("event_type").notNull(),
    eventTime: timestamp("event_time", { withTimezone: true }).notNull(),
    /** clock_timestamp() (not now()) so events written in one transaction keep their order. */
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .default(sql`clock_timestamp()`)
      .notNull(),
    actorUserId: uuid("actor_user_id").references(() => usersTable.id),
    actorRole: userRoleEnum("actor_role"),
    location: text("location"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    quantityBefore: numeric("quantity_before", { precision: 12, scale: 3, mode: "number" }),
    quantityChange: numeric("quantity_change", { precision: 12, scale: 3, mode: "number" }),
    quantityAfter: numeric("quantity_after", { precision: 12, scale: 3, mode: "number" }),
    status: text("status"),
    reason: text("reason"),
    source: text("source").notNull().default("web"),
    clientEventId: uuid("client_event_id"),
    /** Whether this event may be shown on the public QR trace page. */
    isPublic: boolean("is_public").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    previousEventId: uuid("previous_event_id"),
    correctsEventId: uuid("corrects_event_id"),
  },
  (t) => [
    index("events_lot_time_idx").on(t.lotId, t.eventTime),
    index("events_type_idx").on(t.eventType),
    index("events_recorded_idx").on(t.recordedAt),
    index("events_order_idx").on(t.orderId),
    uniqueIndex("events_client_event_uq").on(t.clientEventId),
  ],
);

/** Farmer-managed storage information. There is no storage operator role. */
export const lotStorageRecordsTable = pgTable(
  "lot_storage_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => lotsTable.id),
    farmerId: uuid("farmer_id")
      .notNull()
      .references(() => usersTable.id),
    storageType: text("storage_type").notNull(),
    storageLocation: text("storage_location").notNull(),
    storageStart: timestamp("storage_start", { withTimezone: true }).notNull(),
    storageEnd: timestamp("storage_end", { withTimezone: true }),
    temperatureC: numeric("temperature_c", { precision: 5, scale: 2, mode: "number" }),
    humidityPct: numeric("humidity_pct", { precision: 5, scale: 2, mode: "number" }),
    storageCondition: text("storage_condition"),
    notes: text("notes"),
    clientEventId: uuid("client_event_id").unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("storage_lot_idx").on(t.lotId),
    check(
      "storage_humidity_range",
      sql`${t.humidityPct} IS NULL OR (${t.humidityPct} >= 0 AND ${t.humidityPct} <= 100)`,
    ),
  ],
);

export const scanResultEnum = pgEnum("scan_result", ["OK", "UNKNOWN", "REVOKED", "REPLACED", "DISABLED", "INVALID"]);

/** QR scans. No IP address or precise location is stored. */
export const qrScanEventsTable = pgTable(
  "qr_scan_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lotId: uuid("lot_id").references(() => lotsTable.id),
    qrId: uuid("qr_id").references(() => qrCodesTable.id),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).defaultNow().notNull(),
    userId: uuid("user_id").references(() => usersTable.id),
    scanSource: text("scan_source").notNull(),
    result: scanResultEnum("result").notNull(),
    deviceType: text("device_type"),
    /** Coarse, user-consented location only (e.g. "Ludhiana, Punjab"). */
    location: text("location"),
    clientEventId: uuid("client_event_id").unique(),
    /** Random per-browser id (no fingerprinting) used only to tell repeat scans from distinct scanners. */
    sessionId: text("session_id"),
    /** Coarse position (rounded to 0.1°, about 11 km), only when the scanner explicitly shared it. */
    approxLat: doublePrecision("approx_lat"),
    approxLon: doublePrecision("approx_lon"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("scans_lot_idx").on(t.lotId),
    index("scans_time_idx").on(t.scannedAt),
    index("scans_qr_time_idx").on(t.qrId, t.scannedAt),
  ],
);

export type Lot = typeof lotsTable.$inferSelect;
export type QrCode = typeof qrCodesTable.$inferSelect;
export type TraceabilityEvent = typeof traceabilityEventsTable.$inferSelect;
export type LotStorageRecord = typeof lotStorageRecordsTable.$inferSelect;
export type QrScanEvent = typeof qrScanEventsTable.$inferSelect;


export const recallStatusEnum = pgEnum("recall_status", ["ACTIVE", "CLEARED"]);

/** Recall history for a lot. At most one ACTIVE recall per lot. */
export const lotRecallsTable = pgTable(
  "lot_recalls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => lotsTable.id),
    status: recallStatusEnum("status").notNull().default("ACTIVE"),
    /** Internal reason (admins only). */
    reason: text("reason").notNull(),
    /** Short message shown on the public trace page (no customer or personal data). */
    publicMessage: text("public_message").notNull(),
    initiatedBy: uuid("initiated_by")
      .notNull()
      .references(() => usersTable.id),
    initiatedAt: timestamp("initiated_at", { withTimezone: true }).defaultNow().notNull(),
    clearedBy: uuid("cleared_by").references(() => usersTable.id),
    clearedAt: timestamp("cleared_at", { withTimezone: true }),
    clearNote: text("clear_note"),
    /** Snapshot at initiation: affected quantity, open orders, customers notified. */
    impact: jsonb("impact").$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [index("recalls_lot_idx").on(t.lotId), uniqueIndex("recalls_one_active_per_lot").on(t.lotId).where(sql`status = 'ACTIVE'`)],
);

export const anomalyStatusEnum = pgEnum("anomaly_status", ["OPEN", "INVESTIGATING", "DISMISSED", "CONFIRMED"]);

/**
 * Potential QR anomalies. These are signals for a human, never a verdict:
 * the UI says "potential anomaly" and an admin decides what to do.
 */
export const qrAnomaliesTable = pgTable(
  "qr_anomalies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    qrId: uuid("qr_id")
      .notNull()
      .references(() => qrCodesTable.id),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => lotsTable.id),
    kind: text("kind").notNull(),
    status: anomalyStatusEnum("status").notNull().default("OPEN"),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
    detectedAt: timestamp("detected_at", { withTimezone: true }).defaultNow().notNull(),
    handledBy: uuid("handled_by").references(() => usersTable.id),
    handledAt: timestamp("handled_at", { withTimezone: true }),
    note: text("note"),
  },
  (t) => [
    index("anomalies_status_idx").on(t.status, t.detectedAt),
    index("anomalies_lot_idx").on(t.lotId),
    uniqueIndex("anomalies_open_dedupe_uq").on(t.qrId, t.kind).where(sql`status IN ('OPEN','INVESTIGATING')`),
  ],
);

/** Farmer-recorded quality inspections. Always labelled "recorded by farmer" unless independently verified. */
export const lotQualityRecordsTable = pgTable(
  "lot_quality_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => lotsTable.id),
    farmerId: uuid("farmer_id")
      .notNull()
      .references(() => usersTable.id),
    grade: qualityGradeEnum("grade").notNull(),
    appearance: text("appearance"),
    sizeCategory: text("size_category"),
    defects: text("defects"),
    inspectionDate: date("inspection_date").notNull(),
    notes: text("notes"),
    /** "FARMER" until an independent verifier exists in the product. */
    recordedBy: text("recorded_by").notNull().default("FARMER"),
    clientEventId: uuid("client_event_id").unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("quality_lot_idx").on(t.lotId, t.inspectionDate)],
);

export type LotRecall = typeof lotRecallsTable.$inferSelect;
export type QrAnomaly = typeof qrAnomaliesTable.$inferSelect;
export type LotQualityRecord = typeof lotQualityRecordsTable.$inferSelect;
