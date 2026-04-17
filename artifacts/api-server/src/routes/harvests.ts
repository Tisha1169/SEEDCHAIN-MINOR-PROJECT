import { Router } from "express";
import { db } from "@workspace/db";
import { harvestsTable, usersTable, seedBatchesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/harvests", authMiddleware, async (req, res) => {
  try {
    const { farmerId } = req.query;
    let harvests = await db.select({
      id: harvestsTable.id, batchId: harvestsTable.batchId,
      farmerId: harvestsTable.farmerId, quantityKg: harvestsTable.quantityKg,
      qualityGrade: harvestsTable.qualityGrade, harvestDate: harvestsTable.harvestDate,
      notes: harvestsTable.notes, createdAt: harvestsTable.createdAt,
      farmerName: usersTable.name, batchCode: seedBatchesTable.batchCode,
    }).from(harvestsTable)
      .leftJoin(usersTable, eq(harvestsTable.farmerId, usersTable.id))
      .leftJoin(seedBatchesTable, eq(harvestsTable.batchId, seedBatchesTable.id));
    if (farmerId) {
      harvests = harvests.filter(h => h.farmerId === parseInt(farmerId as string));
    }
    res.json(harvests);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/harvests", authMiddleware, async (req, res) => {
  try {
    const farmerId = (req as any).user.id;
    const { batchId, quantityKg, qualityGrade, harvestDate, notes } = req.body;
    const [harvest] = await db.insert(harvestsTable).values({ batchId, farmerId, quantityKg, qualityGrade, harvestDate, notes }).returning();
    await db.update(seedBatchesTable).set({ status: "harvested", qualityGrade }).where(eq(seedBatchesTable.id, batchId));
    res.status(201).json(harvest);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/harvests/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [harvest] = await db.select({
      id: harvestsTable.id, batchId: harvestsTable.batchId,
      farmerId: harvestsTable.farmerId, quantityKg: harvestsTable.quantityKg,
      qualityGrade: harvestsTable.qualityGrade, harvestDate: harvestsTable.harvestDate,
      notes: harvestsTable.notes, createdAt: harvestsTable.createdAt,
      farmerName: usersTable.name, batchCode: seedBatchesTable.batchCode,
    }).from(harvestsTable)
      .leftJoin(usersTable, eq(harvestsTable.farmerId, usersTable.id))
      .leftJoin(seedBatchesTable, eq(harvestsTable.batchId, seedBatchesTable.id))
      .where(eq(harvestsTable.id, id)).limit(1);
    if (!harvest) {
      res.status(404).json({ error: "Harvest not found" });
      return;
    }
    res.json(harvest);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
