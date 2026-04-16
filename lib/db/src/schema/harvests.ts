import { pgTable, serial, text, timestamp, integer, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { seedBatchesTable } from "./batches";
import { qualityGradeEnum } from "./batches";

export const harvestsTable = pgTable("harvests", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => seedBatchesTable.id),
  farmerId: integer("farmer_id").notNull().references(() => usersTable.id),
  quantityKg: numeric("quantity_kg", { precision: 10, scale: 2 }).notNull(),
  qualityGrade: qualityGradeEnum("quality_grade").notNull(),
  harvestDate: date("harvest_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHarvestSchema = createInsertSchema(harvestsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertHarvest = z.infer<typeof insertHarvestSchema>;
export type Harvest = typeof harvestsTable.$inferSelect;
