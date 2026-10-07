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
  jsonb,
  date,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { usersTable, userRoleEnum, farmsTable } from "./users";

export const alertSeverityEnum = pgEnum("alert_severity", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const alertsTable = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(),
    severity: alertSeverityEnum("severity").notNull(),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    /** Farmer the alert concerns (so farmers can see their own alerts). */
    farmerId: uuid("farmer_id").references(() => usersTable.id),
    message: text("message").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    /** Prevents the same open condition from producing duplicate alerts. */
    dedupeKey: text("dedupe_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    acknowledgedBy: uuid("acknowledged_by").references(() => usersTable.id),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: uuid("resolved_by").references(() => usersTable.id),
  },
  (t) => [
    index("alerts_created_idx").on(t.createdAt),
    index("alerts_type_idx").on(t.type),
    index("alerts_farmer_idx").on(t.farmerId),
    uniqueIndex("alerts_open_dedupe_uq").on(t.dedupeKey).where(sql`resolved_at IS NULL AND dedupe_key IS NOT NULL`),
  ],
);

/** Append-only (enforced by trigger) audit trail of privileged actions. */
export const auditLogsTable = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => usersTable.id),
    role: userRoleEnum("role"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    requestId: text("request_id"),
    eventId: uuid("event_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("audit_created_idx").on(t.createdAt),
    index("audit_entity_idx").on(t.entityType, t.entityId),
    index("audit_user_idx").on(t.userId),
  ],
);

/** Stored responses for Idempotency-Key replays. */
export const idempotencyKeysTable = pgTable(
  "idempotency_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id),
    key: text("key").notNull(),
    route: text("route").notNull(),
    responseStatus: integer("response_status").notNull(),
    responseBody: jsonb("response_body"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("idempotency_user_key_route_uq").on(t.userId, t.key, t.route)],
);

export const ingestionStatusEnum = pgEnum("ingestion_status", ["RUNNING", "SUCCESS", "PARTIAL", "FAILED", "SKIPPED"]);

/** Lineage for every external data pull. */
export const externalIngestionRunsTable = pgTable(
  "external_ingestion_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: text("source").notNull(),
    sourceEndpoint: text("source_endpoint").notNull(),
    requestParams: jsonb("request_params").$type<Record<string, unknown>>().notNull().default({}),
    processingVersion: text("processing_version").notNull(),
    status: ingestionStatusEnum("status").notNull(),
    recordCount: integer("record_count").notNull().default(0),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("ingestion_source_idx").on(t.source, t.startedAt)],
);

/** Government mandi price observations (e.g. data.gov.in / AGMARKNET). */
export const marketPriceObservationsTable = pgTable(
  "market_price_observations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => externalIngestionRunsTable.id),
    source: text("source").notNull(),
    sourceEndpoint: text("source_endpoint").notNull(),
    observationDate: date("observation_date").notNull(),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull(),
    state: text("state").notNull(),
    district: text("district"),
    market: text("market").notNull(),
    commodity: text("commodity").notNull(),
    /** Empty string when the source publishes no variety/grade (keeps the natural key unique). */
    variety: text("variety").notNull().default(""),
    grade: text("grade").notNull().default(""),
    /** Not every source publishes arrivals; null when unavailable. */
    arrivalQuantityTonnes: numeric("arrival_quantity_tonnes", { precision: 12, scale: 2, mode: "number" }),
    minPrice: numeric("min_price", { precision: 12, scale: 2, mode: "number" }),
    maxPrice: numeric("max_price", { precision: 12, scale: 2, mode: "number" }),
    modalPrice: numeric("modal_price", { precision: 12, scale: 2, mode: "number" }),
    /** Unit of the price columns as published by the source. */
    priceUnit: text("price_unit").notNull().default("INR/quintal"),
    processingVersion: text("processing_version").notNull(),
  },
  (t) => [
    uniqueIndex("market_obs_natural_uq").on(t.source, t.observationDate, t.state, t.market, t.commodity, t.variety, t.grade),
    index("market_obs_date_idx").on(t.observationDate),
    index("market_obs_commodity_idx").on(t.commodity),
  ],
);

/** Weather observations for a farm location (e.g. Open-Meteo). */
export const weatherObservationsTable = pgTable(
  "weather_observations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => externalIngestionRunsTable.id),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farmsTable.id),
    source: text("source").notNull(),
    sourceEndpoint: text("source_endpoint").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    observationTime: timestamp("observation_time", { withTimezone: true }).notNull(),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull(),
    temperatureC: doublePrecision("temperature_c"),
    precipitationMm: doublePrecision("precipitation_mm"),
    humidityPct: doublePrecision("humidity_pct"),
    weatherCode: integer("weather_code"),
    condition: text("condition"),
    processingVersion: text("processing_version").notNull(),
  },
  (t) => [
    index("weather_farm_time_idx").on(t.farmId, t.observationTime),
    uniqueIndex("weather_farm_obs_uq").on(t.farmId, t.observationTime, t.source),
  ],
);

export type Alert = typeof alertsTable.$inferSelect;
export type AuditLog = typeof auditLogsTable.$inferSelect;
