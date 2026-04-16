import { pgTable, serial, text, timestamp, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { seedBatchesTable } from "./batches";
import { transportRecordsTable } from "./transport";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "dispatched",
  "delivered",
  "cancelled",
]);

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").notNull().references(() => usersTable.id),
  batchId: integer("batch_id").notNull().references(() => seedBatchesTable.id),
  quantityKg: numeric("quantity_kg", { precision: 10, scale: 2 }).notNull(),
  pricePerKg: numeric("price_per_kg", { precision: 10, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }),
  status: orderStatusEnum("status").notNull().default("pending"),
  transportId: integer("transport_id").references(() => transportRecordsTable.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
