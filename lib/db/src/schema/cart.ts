import { sql } from "drizzle-orm";
import { pgTable, uuid, timestamp, numeric, index, uniqueIndex, check } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { lotsTable } from "./lots";

/**
 * A customer's cart. Stores only what the customer chose (lot and quantity) plus the unit price they last saw, so the
 * UI can say "price changed". Prices and stock are ALWAYS re-read from the live lot at checkout; nothing here is trusted.
 * Stock is not reserved by the cart: it is held only when checkout starts.
 */
export const cartItemsTable = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => usersTable.id),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => lotsTable.id),
    quantity: numeric("quantity", { precision: 12, scale: 3, mode: "number" }).notNull(),
    /** Unit price when the customer last added or changed this line. */
    priceAtAdd: numeric("price_at_add", { precision: 12, scale: 2, mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("cart_items_customer_lot_uq").on(t.customerId, t.lotId), index("cart_items_customer_idx").on(t.customerId), check("cart_items_quantity_positive", sql`${t.quantity} > 0`)],
);

export type CartItem = typeof cartItemsTable.$inferSelect;
