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
  check,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { lotsTable } from "./lots";

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "PREPARING",
  "READY",
  "DISPATCHED",
  "DELIVERED",
  "CUSTOMER_CONFIRMED",
  "CANCELLED",
]);

/** Third-party couriers are recorded as text only; they never get an account. */
export const fulfillmentMethodEnum = pgEnum("fulfillment_method", [
  "CUSTOMER_PICKUP",
  "FARMER_DELIVERY",
  "THIRD_PARTY_DELIVERY",
]);

export const ordersTable = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderCode: text("order_code").notNull().unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => usersTable.id),
    farmerId: uuid("farmer_id")
      .notNull()
      .references(() => usersTable.id),
    status: orderStatusEnum("status").notNull().default("PENDING"),
    fulfillmentMethod: fulfillmentMethodEnum("fulfillment_method").notNull(),
    deliveryAddress: text("delivery_address"),
    customerNotes: text("customer_notes"),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2, mode: "number" }).notNull(),
    idempotencyKey: text("idempotency_key"),
    rejectionReason: text("rejection_reason"),
    cancelReason: text("cancel_reason"),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    preparedAt: timestamp("prepared_at", { withTimezone: true }),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    deliveryLocation: text("delivery_location"),
    deliveryLatitude: doublePrecision("delivery_latitude"),
    deliveryLongitude: doublePrecision("delivery_longitude"),
    deliveryNotes: text("delivery_notes"),
    thirdPartyName: text("third_party_name"),
    thirdPartyReference: text("third_party_reference"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("orders_customer_idx").on(t.customerId),
    index("orders_farmer_idx").on(t.farmerId),
    index("orders_status_idx").on(t.status),
    index("orders_created_idx").on(t.createdAt),
    uniqueIndex("orders_idempotency_uq").on(t.customerId, t.idempotencyKey),
    check("orders_total_non_negative", sql`${t.totalAmount} >= 0`),
  ],
);

export const orderItemsTable = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => ordersTable.id),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => lotsTable.id),
    quantity: numeric("quantity", { precision: 12, scale: 3, mode: "number" }).notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2, mode: "number" }).notNull(),
    lineTotal: numeric("line_total", { precision: 14, scale: 2, mode: "number" }).notNull(),
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    index("order_items_lot_idx").on(t.lotId),
    check("order_items_quantity_positive", sql`${t.quantity} > 0`),
  ],
);

export const orderFeedbackTable = pgTable(
  "order_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .unique()
      .references(() => ordersTable.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => usersTable.id),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [check("feedback_rating_range", sql`${t.rating} BETWEEN 1 AND 5`)],
);

export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
