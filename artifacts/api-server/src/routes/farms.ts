import { Router } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, farmsTable, productsTable, usersTable, type Farm } from "@workspace/db";
import { CreateFarmBody, CreateProductBody, UpdateFarmBody, UpdateFarmParams } from "@workspace/api-zod";
import { requireRole } from "../lib/auth";
import { conflict, notFound } from "../lib/errors";
import { actorOf, parse } from "../lib/http";
import { audit } from "../services/records";
import { ingestWeather } from "../services/external/ingestion";

const router = Router();

function serializeFarm(f: Farm & { farmerName?: string | null }) {
  return {
    id: f.id,
    farmerId: f.farmerId,
    farmerName: f.farmerName ?? null,
    name: f.name,
    village: f.village,
    district: f.district,
    state: f.state,
    latitude: f.latitude == null ? null : Number(f.latitude),
    longitude: f.longitude == null ? null : Number(f.longitude),
    sizeHectares: f.sizeHectares == null ? null : Number(f.sizeHectares),
    soilType: f.soilType,
    createdAt: f.createdAt.toISOString(),
  };
}

router.get("/farms", requireRole(["farmer", "admin"], { active: false }), async (req, res) => {
  const user = req.user!;
  const rows = await db
    .select({ f: farmsTable, farmerName: usersTable.name })
    .from(farmsTable)
    .innerJoin(usersTable, eq(usersTable.id, farmsTable.farmerId))
    .where(user.role === "farmer" ? eq(farmsTable.farmerId, user.id) : undefined)
    .orderBy(desc(farmsTable.createdAt));
  res.json(rows.map((r) => serializeFarm({ ...r.f, farmerName: r.farmerName })));
});

router.post("/farms", requireRole(["farmer"], { active: false }), async (req, res) => {
  const body = parse(CreateFarmBody, req.body);
  const [farm] = await db.transaction(async (tx) => {
    const rows = await tx.insert(farmsTable).values({ ...body, farmerId: req.user!.id }).returning();
    await audit(tx, actorOf(req), "FARM_CREATED", "farm", rows[0].id, null, body);
    return rows;
  });
  // Fetch real weather for the new location in the background (never blocks or fabricates).
  if (farm.latitude != null && farm.longitude != null) void ingestWeather(farm.id).catch(() => undefined);
  res.status(201).json(serializeFarm(farm));
});

router.patch("/farms/:id", requireRole(["farmer"], { active: false }), async (req, res) => {
  const { id } = parse(UpdateFarmParams, req.params);
  const body = parse(UpdateFarmBody, req.body);
  const farm = await db.transaction(async (tx) => {
    const [f] = await tx.select().from(farmsTable).where(eq(farmsTable.id, id)).for("update");
    if (!f || f.farmerId !== req.user!.id) throw notFound("Farm not found");
    const [updated] = await tx.update(farmsTable).set({ ...body, updatedAt: new Date() }).where(eq(farmsTable.id, id)).returning();
    await audit(tx, actorOf(req), "FARM_UPDATED", "farm", id, serializeFarm(f), serializeFarm(updated));
    return updated;
  });
  res.json(serializeFarm(farm));
});

router.get("/products", requireRole(["farmer", "admin"], { active: false }), async (req, res) => {
  const user = req.user!;
  const rows = await db
    .select()
    .from(productsTable)
    .where(user.role === "farmer" ? eq(productsTable.farmerId, user.id) : undefined)
    .orderBy(productsTable.name, productsTable.variety);
  res.json(rows.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })));
});

router.post("/products", requireRole(["farmer"], { active: false }), async (req, res) => {
  const body = parse(CreateProductBody, req.body);
  const [dup] = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(and(eq(productsTable.farmerId, req.user!.id), sql`lower(${productsTable.name}) = lower(${body.name})`, sql`lower(${productsTable.variety}) = lower(${body.variety})`));
  if (dup) throw conflict("You already registered this product and variety", "DUPLICATE_PRODUCT");
  const [p] = await db
    .insert(productsTable)
    .values({ farmerId: req.user!.id, name: body.name.trim(), variety: body.variety.trim(), description: body.description ?? null, unit: body.unit ?? "kg" })
    .returning();
  await audit(db, actorOf(req), "PRODUCT_CREATED", "product", p.id, null, { name: p.name, variety: p.variety });
  res.status(201).json({ ...p, createdAt: p.createdAt.toISOString() });
});

export default router;
