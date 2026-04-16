import { pgTable, serial, text, timestamp, integer, numeric, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { farmsTable } from "./farms";

export const batchStatusEnum = pgEnum("batch_status", [
  "planted",
  "growing",
  "harvested",
  "in_storage",
  "in_transit",
  "delivered",
  "sold",
]);

export const qualityGradeEnum = pgEnum("quality_grade", ["A", "B", "C"]);

export const seedBatchesTable = pgTable("seed_batches", {
  id: serial("id").primaryKey(),
  batchCode: text("batch_code").notNull().unique(),
  variety: text("variety").notNull(),
  farmerId: integer("farmer_id").notNull().references(() => usersTable.id),
  farmId: integer("farm_id").references(() => farmsTable.id),
  plantingDate: date("planting_date").notNull(),
  expectedHarvestDate: date("expected_harvest_date"),
  quantityKg: numeric("quantity_kg", { precision: 10, scale: 2 }).notNull(),
  status: batchStatusEnum("status").notNull().default("planted"),
  qualityGrade: qualityGradeEnum("quality_grade"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSeedBatchSchema = createInsertSchema(seedBatchesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSeedBatch = z.infer<typeof insertSeedBatchSchema>;
export type SeedBatch = typeof seedBatchesTable.$inferSelect;
