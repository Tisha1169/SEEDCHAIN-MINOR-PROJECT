import { pgTable, uuid, text, timestamp, pgEnum, index, numeric } from "drizzle-orm/pg-core";

/**
 * SeedChain has exactly three application roles. Storage, transport and
 * delivery are physical-world activities recorded by the farmer, never
 * separate accounts.
 */
export const userRoleEnum = pgEnum("user_role", ["admin", "farmer", "customer"]);

/**
 * pending   – farmer registered (or resubmitted), waiting for admin approval
 * correction_required – admin asked the farmer to fix details and resubmit
 * active    – may use the platform
 * rejected  – farmer application rejected by admin
 * suspended – disabled by admin
 */
export const userStatusEnum = pgEnum("user_status", ["pending", "correction_required", "active", "rejected", "suspended"]);

export const usersTable = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    phone: text("phone"),
    role: userRoleEnum("role").notNull(),
    status: userStatusEnum("status").notNull().default("active"),
    location: text("location"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("users_role_idx").on(t.role), index("users_status_idx").on(t.status)],
);

/** Public-facing farmer profile. Only these fields are ever shown on public pages. */
export const farmerProfilesTable = pgTable("farmer_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  publicName: text("public_name").notNull(),
  bio: text("bio"),
  village: text("village"),
  district: text("district"),
  state: text("state"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedBy: uuid("verified_by").references(() => usersTable.id),
  reviewNote: text("review_note"),
  /** Last time the farmer submitted (or resubmitted) the application for review. */
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Server-side sessions: tokens expire and can be revoked (logout). */
export const sessionsTable = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const farmsTable = pgTable(
  "farms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmerId: uuid("farmer_id")
      .notNull()
      .references(() => usersTable.id),
    name: text("name").notNull(),
    village: text("village"),
    district: text("district"),
    state: text("state").notNull(),
    latitude: numeric("latitude", { precision: 9, scale: 6, mode: "number" }),
    longitude: numeric("longitude", { precision: 9, scale: 6, mode: "number" }),
    sizeHectares: numeric("size_hectares", { precision: 10, scale: 2, mode: "number" }),
    soilType: text("soil_type"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("farms_farmer_idx").on(t.farmerId)],
);

export const productsTable = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmerId: uuid("farmer_id")
      .notNull()
      .references(() => usersTable.id),
    name: text("name").notNull(),
    variety: text("variety").notNull(),
    description: text("description"),
    unit: text("unit").notNull().default("kg"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("products_farmer_idx").on(t.farmerId)],
);

export type User = typeof usersTable.$inferSelect;
export type FarmerProfile = typeof farmerProfilesTable.$inferSelect;
export type Farm = typeof farmsTable.$inferSelect;
export type Product = typeof productsTable.$inferSelect;
