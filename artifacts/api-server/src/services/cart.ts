import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { cartItemsTable, db, farmerProfilesTable, lotsTable, productsTable, qrCodesTable, usersTable, type DbOrTx, type Lot, type User } from "@workspace/db";
import { badRequest, conflict, notFound } from "../lib/errors";
import { availableOf, round3 } from "../domain/state-machine";
import { counters } from "./lots";

/**
 * The cart is a convenience, never an authority. Every line is re-read from the live lot each time it is shown,
 * and checkout recomputes price and stock again on the server. A line can therefore carry issues ("sold out",
 * "only 20 kg left", "price changed") that the customer must resolve before paying for it.
 */

export const MAX_CART_LINES = 30;
const MAX_QTY = 100_000;

export type CartIssue = "NOT_LISTED" | "RECALLED" | "SOLD_OUT" | "EXCEEDS_STOCK" | "FARMER_UNAVAILABLE";

export interface PricedLine {
  lotId: string;
  lotCode: string;
  productName: string;
  variety: string;
  unit: string;
  quantity: number;
  unitPrice: number | null;
  lineTotal: number | null;
  available: number;
  qualityGrade: string | null;
  farmName: string | null;
  publicToken: string | null;
  farmer: { id: string; publicName: string; verified: boolean };
  priceAtAdd: number | null;
  priceChanged: boolean;
  issues: CartIssue[];
}

const money = (n: number) => Math.round(n * 100) / 100;

async function loadLots(tx: DbOrTx, lotIds: string[]) {
  if (!lotIds.length) return new Map<string, { lot: Lot; productName: string; variety: string; farmerName: string | null; farmerStatus: string; verified: boolean; publicToken: string | null; farmName: string | null }>();
  const rows = await tx
    .select({
      lot: lotsTable,
      productName: productsTable.name,
      variety: productsTable.variety,
      profile: farmerProfilesTable,
      farmerName: usersTable.name,
      farmerStatus: usersTable.status,
      publicToken: qrCodesTable.publicToken,
    })
    .from(lotsTable)
    .innerJoin(productsTable, eq(productsTable.id, lotsTable.productId))
    .innerJoin(usersTable, eq(usersTable.id, lotsTable.farmerId))
    .leftJoin(farmerProfilesTable, eq(farmerProfilesTable.userId, lotsTable.farmerId))
    .leftJoin(qrCodesTable, and(eq(qrCodesTable.lotId, lotsTable.id), eq(qrCodesTable.status, "ACTIVE")))
    .where(inArray(lotsTable.id, lotIds));
  const farms = await tx.execute(sql`SELECT l.id, f.name FROM lots l JOIN farms f ON f.id = l.farm_id WHERE l.id IN (${sql.join(lotIds.map((i) => sql`${i}`), sql`, `)})`);
  const farmName = new Map((farms.rows as { id: string; name: string }[]).map((r) => [r.id, r.name]));
  return new Map(
    rows.map((r) => [
      r.lot.id,
      {
        lot: r.lot,
        productName: r.productName,
        variety: r.variety,
        farmerName: r.profile?.publicName ?? r.farmerName,
        farmerStatus: r.farmerStatus,
        verified: r.farmerStatus === "active" && !!r.profile?.verifiedAt,
        publicToken: r.publicToken,
        farmName: farmName.get(r.lot.id) ?? null,
      },
    ]),
  );
}

/** Prices requested items against the live lots. Side-effect free; used by both the cart and the checkout preview. */
export async function priceLines(tx: DbOrTx, items: { lotId: string; quantity: number; priceAtAdd?: number | null }[]): Promise<PricedLine[]> {
  const info = await loadLots(tx, [...new Set(items.map((i) => i.lotId))]);
  const out: PricedLine[] = [];
  for (const it of items) {
    const x = info.get(it.lotId);
    if (!x) continue; // the lot no longer exists: drop silently from view; the cart row is cleaned up on read
    const available = x.lot.recalled || !x.lot.listed ? 0 : availableOf(counters(x.lot));
    const price = x.lot.pricePerUnit == null ? null : Number(x.lot.pricePerUnit);
    const issues: CartIssue[] = [];
    if (x.lot.recalled) issues.push("RECALLED");
    else if (!x.lot.listed || price == null) issues.push("NOT_LISTED");
    else if (available <= 0) issues.push("SOLD_OUT");
    else if (it.quantity > available + 1e-9) issues.push("EXCEEDS_STOCK");
    if (x.farmerStatus !== "active") issues.push("FARMER_UNAVAILABLE");
    out.push({
      lotId: x.lot.id,
      lotCode: x.lot.lotCode,
      productName: x.productName,
      variety: x.variety,
      unit: x.lot.unit,
      quantity: it.quantity,
      unitPrice: price,
      lineTotal: price == null ? null : money(it.quantity * price),
      available,
      qualityGrade: x.lot.qualityGrade,
      farmName: x.farmName,
      publicToken: x.publicToken,
      farmer: { id: x.lot.farmerId, publicName: x.farmerName ?? "Farmer", verified: x.verified },
      priceAtAdd: it.priceAtAdd ?? null,
      priceChanged: it.priceAtAdd != null && price != null && Math.abs(it.priceAtAdd - price) > 0.005,
      issues,
    });
  }
  return out;
}

/** One group per farmer: each farmer is a separate seller, order and payment (there is no middleman holding a combined basket). */
export function groupByFarmer(lines: PricedLine[]) {
  const groups = new Map<string, { farmer: PricedLine["farmer"]; lines: PricedLine[] }>();
  for (const l of lines) {
    const g = groups.get(l.farmer.id) ?? { farmer: l.farmer, lines: [] };
    g.lines.push(l);
    groups.set(l.farmer.id, g);
  }
  return [...groups.values()].map((g) => {
    const blocking = g.lines.some((l) => l.issues.length > 0);
    return { farmer: g.farmer, lines: g.lines, subtotal: money(g.lines.reduce((s, l) => s + (l.lineTotal ?? 0), 0)), canCheckout: !blocking && g.lines.length > 0 };
  });
}

export async function getCart(user: User) {
  const rows = await db.select().from(cartItemsTable).where(eq(cartItemsTable.customerId, user.id)).orderBy(asc(cartItemsTable.createdAt));
  const lines = await priceLines(db, rows.map((r) => ({ lotId: r.lotId, quantity: Number(r.quantity), priceAtAdd: r.priceAtAdd == null ? null : Number(r.priceAtAdd) })));
  const gone = rows.filter((r) => !lines.some((l) => l.lotId === r.lotId)).map((r) => r.id);
  if (gone.length) await db.delete(cartItemsTable).where(inArray(cartItemsTable.id, gone));
  const groups = groupByFarmer(lines);
  return {
    itemCount: lines.length,
    groups,
    total: money(groups.reduce((s, g) => s + g.subtotal, 0)),
    hasIssues: lines.some((l) => l.issues.length > 0 || l.priceChanged),
  };
}

export async function cartCount(user: User): Promise<number> {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(cartItemsTable).where(eq(cartItemsTable.customerId, user.id));
  return n;
}

async function checkAddable(tx: DbOrTx, lotId: string, quantity: number) {
  if (!(quantity > 0) || quantity > MAX_QTY) throw badRequest("Quantity must be greater than zero");
  const [l] = await priceLines(tx, [{ lotId, quantity }]);
  if (!l) throw notFound("Lot not found");
  if (l.issues.includes("RECALLED")) throw conflict(`${l.lotCode} has been recalled and cannot be bought`, "LOT_RECALLED");
  if (l.issues.includes("NOT_LISTED")) throw conflict(`${l.lotCode} is not listed for sale`, "NOT_LISTED");
  if (l.issues.includes("FARMER_UNAVAILABLE")) throw conflict("This farmer is not currently accepting orders", "FARMER_UNAVAILABLE");
  if (l.issues.includes("SOLD_OUT")) throw conflict(`${l.lotCode} is sold out`, "SOLD_OUT");
  if (l.issues.includes("EXCEEDS_STOCK")) throw conflict(`Only ${l.available} ${l.unit} of ${l.lotCode} is available`, "INSUFFICIENT_INVENTORY", { lotId, available: l.available, requested: quantity });
  return l;
}

/** Adds to the quantity already in the cart (so tapping "Add to cart" twice adds twice). */
export async function addToCart(user: User, lotId: string, quantity: number) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`cart:${user.id}`}, 0))`);
    const [existing] = await tx.select().from(cartItemsTable).where(and(eq(cartItemsTable.customerId, user.id), eq(cartItemsTable.lotId, lotId)));
    const next = round3((existing ? Number(existing.quantity) : 0) + quantity);
    const line = await checkAddable(tx, lotId, next);
    if (!existing) {
      const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(cartItemsTable).where(eq(cartItemsTable.customerId, user.id));
      if (n >= MAX_CART_LINES) throw conflict(`A cart can hold at most ${MAX_CART_LINES} different lots`, "CART_FULL");
    }
    const now = new Date();
    await tx
      .insert(cartItemsTable)
      .values({ customerId: user.id, lotId, quantity: next, priceAtAdd: line.unitPrice })
      .onConflictDoUpdate({ target: [cartItemsTable.customerId, cartItemsTable.lotId], set: { quantity: next, priceAtAdd: line.unitPrice, updatedAt: now } });
  });
  return getCart(user);
}

export async function setCartQuantity(user: User, lotId: string, quantity: number) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`cart:${user.id}`}, 0))`);
    const [existing] = await tx.select().from(cartItemsTable).where(and(eq(cartItemsTable.customerId, user.id), eq(cartItemsTable.lotId, lotId)));
    if (!existing) throw notFound("That lot is not in your cart");
    const line = await checkAddable(tx, lotId, round3(quantity));
    await tx.update(cartItemsTable).set({ quantity: round3(quantity), priceAtAdd: line.unitPrice, updatedAt: new Date() }).where(eq(cartItemsTable.id, existing.id));
  });
  return getCart(user);
}

export async function removeFromCart(user: User, lotId: string) {
  await db.delete(cartItemsTable).where(and(eq(cartItemsTable.customerId, user.id), eq(cartItemsTable.lotId, lotId)));
  return getCart(user);
}

export async function clearCart(user: User) {
  await db.delete(cartItemsTable).where(eq(cartItemsTable.customerId, user.id));
  return getCart(user);
}

/** Called when lots are actually bought (paid, or placed without online payment). Not when a checkout is abandoned. */
export async function removeBoughtFromCart(tx: DbOrTx, customerId: string, lotIds: string[]) {
  if (!lotIds.length) return;
  await tx.delete(cartItemsTable).where(and(eq(cartItemsTable.customerId, customerId), inArray(cartItemsTable.lotId, lotIds)));
}

/** What the server would charge for exactly these items right now. No side effects; powers the checkout page. */
export async function previewCheckout(items: { lotId: string; quantity: number }[]) {
  const merged = new Map<string, number>();
  for (const i of items) merged.set(i.lotId, round3((merged.get(i.lotId) ?? 0) + i.quantity));
  const lines = await priceLines(db, [...merged].map(([lotId, quantity]) => ({ lotId, quantity })));
  if (!lines.length) throw notFound("Nothing to check out");
  const groups = groupByFarmer(lines);
  return {
    lines,
    farmer: groups[0].farmer,
    subtotal: groups[0].subtotal,
    singleFarmer: groups.length === 1,
    canCheckout: groups.length === 1 && groups[0].canCheckout,
    farmerCount: groups.length,
  };
}
