import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const farmsTable = pgTable("farms", {
  id: serial("id").primaryKey(),
  farmerId: integer("farmer_id").notNull().references(() => usersTable.id),
  name: text("name").notNull(),
  location: text("location").notNull(),
  sizeHectares: numeric("size_hectares", { precision: 10, scale: 2 }).notNull(),
  soilType: text("soil_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFarmSchema = createInsertSchema(farmsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertFarm = z.infer<typeof insertFarmSchema>;
export type Farm = typeof farmsTable.$inferSelect;
