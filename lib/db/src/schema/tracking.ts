import { pgTable, serial, text, timestamp, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { seedBatchesTable } from "./batches";
import { transportRecordsTable } from "./transport";

export const shipmentTrackingStatusEnum = pgEnum("shipment_tracking_status", [
  "order_created",
  "accepted_by_logistics",
  "picked_up_from_farm",
  "arrived_at_cold_storage",
  "stored",
  "picked_up_for_delivery",
  "in_transit",
  "delivered_to_buyer",
]);

export const shipmentTrackingTable = pgTable("shipment_tracking", {
  id: serial("id").primaryKey(),
  trackingId: text("tracking_id").notNull().unique(),
  batchId: integer("batch_id").notNull().references(() => seedBatchesTable.id),
  transportId: integer("transport_id").references(() => transportRecordsTable.id),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  status: shipmentTrackingStatusEnum("status").notNull().default("order_created"),
  location: text("location"),
  notes: text("notes"),
  updatedBy: integer("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertShipmentTrackingSchema = createInsertSchema(shipmentTrackingTable).omit({
  id: true,
  createdAt: true,
});
export type InsertShipmentTracking = z.infer<typeof insertShipmentTrackingSchema>;
export type ShipmentTracking = typeof shipmentTrackingTable.$inferSelect;
