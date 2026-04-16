import { pgTable, serial, text, timestamp, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { seedBatchesTable } from "./batches";

export const transportStatusEnum = pgEnum("transport_status", [
  "pending",
  "accepted",
  "picked_up",
  "in_transit",
  "delivered",
]);

export const transportRecordsTable = pgTable("transport_records", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => seedBatchesTable.id),
  driverId: integer("driver_id").notNull().references(() => usersTable.id),
  vehicleNumber: text("vehicle_number"),
  originLocation: text("origin_location").notNull(),
  destinationLocation: text("destination_location").notNull(),
  quantityKg: numeric("quantity_kg", { precision: 10, scale: 2 }).notNull(),
  scheduledPickup: timestamp("scheduled_pickup"),
  actualPickup: timestamp("actual_pickup"),
  deliveredAt: timestamp("delivered_at"),
  status: transportStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTransportRecordSchema = createInsertSchema(transportRecordsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertTransportRecord = z.infer<typeof insertTransportRecordSchema>;
export type TransportRecord = typeof transportRecordsTable.$inferSelect;
