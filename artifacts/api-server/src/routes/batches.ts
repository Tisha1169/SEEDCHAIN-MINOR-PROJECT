import { Router } from "express";
import { db } from "@workspace/db";
import { seedBatchesTable, usersTable, farmsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

function genBatchCode() {
  return `SC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
}

router.get("/batches", authMiddleware, async (req, res) => {
  try {
    const { farmerId, status } = req.query;
    let batches = await db.select({
      id: seedBatchesTable.id, batchCode: seedBatchesTable.batchCode,
      variety: seedBatchesTable.variety, farmerId: seedBatchesTable.farmerId,
      farmId: seedBatchesTable.farmId, plantingDate: seedBatchesTable.plantingDate,
      expectedHarvestDate: seedBatchesTable.expectedHarvestDate,
      quantityKg: seedBatchesTable.quantityKg, status: seedBatchesTable.status,
      qualityGrade: seedBatchesTable.qualityGrade, notes: seedBatchesTable.notes,
      createdAt: seedBatchesTable.createdAt, farmerName: usersTable.name, farmName: farmsTable.name,
    }).from(seedBatchesTable)
      .leftJoin(usersTable, eq(seedBatchesTable.farmerId, usersTable.id))
      .leftJoin(farmsTable, eq(seedBatchesTable.farmId, farmsTable.id));

    if (farmerId) {
      batches = batches.filter(b => b.farmerId === parseInt(farmerId as string));
    }
    if (status) {
      batches = batches.filter(b => b.status === status);
    }
    res.json(batches);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/batches", authMiddleware, async (req, res) => {
  try {
    const farmerId = (req as any).user.id;
    const { variety, farmId, plantingDate, expectedHarvestDate, quantityKg, notes } = req.body;
    const batchCode = genBatchCode();
    const [batch] = await db.insert(seedBatchesTable).values({
      batchCode, variety, farmerId, farmId, plantingDate, expectedHarvestDate, quantityKg, notes
    }).returning();
    res.status(201).json(batch);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/batches/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [batch] = await db.select({
      id: seedBatchesTable.id, batchCode: seedBatchesTable.batchCode,
      variety: seedBatchesTable.variety, farmerId: seedBatchesTable.farmerId,
      farmId: seedBatchesTable.farmId, plantingDate: seedBatchesTable.plantingDate,
      expectedHarvestDate: seedBatchesTable.expectedHarvestDate,
      quantityKg: seedBatchesTable.quantityKg, status: seedBatchesTable.status,
      qualityGrade: seedBatchesTable.qualityGrade, notes: seedBatchesTable.notes,
      createdAt: seedBatchesTable.createdAt, farmerName: usersTable.name, farmName: farmsTable.name,
    }).from(seedBatchesTable)
      .leftJoin(usersTable, eq(seedBatchesTable.farmerId, usersTable.id))
      .leftJoin(farmsTable, eq(seedBatchesTable.farmId, farmsTable.id))
      .where(eq(seedBatchesTable.id, id)).limit(1);
    if (!batch) {
      res.status(404).json({ error: "Batch not found" });
      return;
    }
    res.json(batch);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/batches/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, qualityGrade, notes } = req.body;
    const updateData: any = {};
    if (status) updateData.status = status;
    if (qualityGrade) updateData.qualityGrade = qualityGrade;
    if (notes !== undefined) updateData.notes = notes;
    const [batch] = await db.update(seedBatchesTable).set(updateData).where(eq(seedBatchesTable.id, id)).returning();
    if (!batch) {
      res.status(404).json({ error: "Batch not found" });
      return;
    }
    res.json(batch);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
