import { sql } from "drizzle-orm";
import { pgTable, uuid, text, timestamp, pgEnum, integer, boolean, index, uniqueIndex, numeric, check, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { lotsTable } from "./lots";
import { ordersTable } from "./orders";

export const paymentStatusEnum = pgEnum("payment_status", ["CREATED", "PROCESSING", "PAID", "FAILED", "CANCELLED", "REFUND_PENDING", "REFUNDED"]);

/** One row per Razorpay order. Holds identifiers and status only: never card, UPI or bank details. */
export const paymentsTable = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => ordersTable.id),
    razorpayOrderId: text("razorpay_order_id").notNull().unique(),
    razorpayPaymentId: text("razorpay_payment_id").unique(),
    /** Integer paise, as sent to Razorpay. */
    amountPaise: integer("amount_paise").notNull(),
    currency: text("currency").notNull().default("INR"),
    status: paymentStatusEnum("status").notNull().default("CREATED"),
    /** card / upi / netbanking / wallet ... as reported by Razorpay. */
    method: text("method"),
    /** test or live, from the key id prefix. */
    mode: text("mode").notNull().default("test"),
    signatureVerified: boolean("signature_verified").notNull().default(false),
    webhookVerified: boolean("webhook_verified").notNull().default(false),
    failureCode: text("failure_code"),
    failureReason: text("failure_reason"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    refundId: text("refund_id"),
    refundAmountPaise: integer("refund_amount_paise"),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("payments_order_idx").on(t.orderId), index("payments_status_idx").on(t.status), check("payments_amount_positive", sql`${t.amountPaise} > 0`)],
);

/** Every webhook delivery, keyed by Razorpay's x-razorpay-event-id, so redelivery is a no-op. */
export const paymentEventsTable = pgTable(
  "payment_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    razorpayPaymentId: text("razorpay_payment_id"),
    razorpayOrderId: text("razorpay_order_id"),
    paymentId: uuid("payment_id").references(() => paymentsTable.id),
    /** APPLIED, DUPLICATE_STATE, IGNORED, MISMATCH, UNKNOWN_ORDER, LATE_PAYMENT. */
    outcome: text("outcome").notNull(),
    /** Whitelisted fields only (ids, status, method, amount, error code). Never the raw payload. */
    summary: jsonb("summary").$type<Record<string, unknown>>().notNull().default({}),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("payment_events_event_id_uq").on(t.eventId), index("payment_events_payment_idx").on(t.razorpayPaymentId)],
);

// ------------------------------------------------------------------ packages and tamper-evident seals

export const sealStatusEnum = pgEnum("seal_status", ["ASSIGNED", "DISPATCH_VERIFIED", "INTACT", "BROKEN", "REPORTED", "REPLACED"]);
export const integrityStatusEnum = pgEnum("integrity_status", ["NOT_CHECKED", "OK", "EXCEPTION"]);

/** A physical package of a lot, with its own QR token and a serialised tamper-evident seal. */
export const packagesTable = pgTable(
  "packages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => lotsTable.id),
    packageNumber: integer("package_number").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3, mode: "number" }).notNull(),
    /** 256-bit random token, same format as lot QR tokens. Never sequential, never derived from an id. */
    publicToken: text("public_token").notNull().unique(),
    sealId: text("seal_id").notNull().unique(),
    sealStatus: sealStatusEnum("seal_status").notNull().default("ASSIGNED"),
    integrityStatus: integrityStatusEnum("integrity_status").notNull().default("NOT_CHECKED"),
    replacedByPackageId: uuid("replaced_by_package_id"),
    createdBy: uuid("created_by").references(() => usersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("packages_lot_number_uq").on(t.lotId, t.packageNumber), index("packages_lot_idx").on(t.lotId), check("packages_quantity_positive", sql`${t.quantity} > 0`)],
);

/** Seal history, append-only. */
export const packageEventsTable = pgTable(
  "package_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    packageId: uuid("package_id")
      .notNull()
      .references(() => packagesTable.id),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => lotsTable.id),
    eventType: text("event_type").notNull(),
    fromStatus: sealStatusEnum("from_status"),
    toStatus: sealStatusEnum("to_status"),
    actorUserId: uuid("actor_user_id").references(() => usersTable.id),
    actorRole: text("actor_role"),
    /** For public reports, a short free-text note (length-limited); never contact details. */
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("package_events_package_idx").on(t.packageId), index("package_events_lot_idx").on(t.lotId)],
);

export type Payment = typeof paymentsTable.$inferSelect;
export type Package = typeof packagesTable.$inferSelect;
