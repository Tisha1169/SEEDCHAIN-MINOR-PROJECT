import { pgTable, serial, text, timestamp, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { seedBatchesTable } from "./batches";

export const storageStatusEnum = pgEnum("storage_status", [
  "incoming",
  "stored",
  "released",
]);

export const storageRecordsTable = pgTable("storage_records", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => seedBatchesTable.id),
  operatorId: integer("operator_id").notNull().references(() => usersTable.id),
  facilityName: text("facility_name").notNull(),
  location: text("location"),
  slotId: text("slot_id"),
  temperatureCelsius: numeric("temperature_celsius", { precision: 5, scale: 2 }),
  quantityKg: numeric("quantity_kg", { precision: 10, scale: 2 }).notNull(),
  receivedAt: timestamp("received_at"),
  releasedAt: timestamp("released_at"),
  status: storageStatusEnum("status").notNull().default("incoming"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStorageRecordSchema = createInsertSchema(storageRecordsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertStorageRecord = z.infer<typeof insertStorageRecordSchema>;
export type StorageRecord = typeof storageRecordsTable.$inferSelect;
