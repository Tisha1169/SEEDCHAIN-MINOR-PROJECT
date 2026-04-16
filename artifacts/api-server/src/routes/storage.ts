import { Router } from "express";
import { db } from "@workspace/db";
import { storageRecordsTable, usersTable, seedBatchesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/storage", authMiddleware, async (req, res) => {
  try {
    const { operatorId } = req.query;
    let records = await db.select({
      id: storageRecordsTable.id, batchId: storageRecordsTable.batchId,
      operatorId: storageRecordsTable.operatorId, facilityName: storageRecordsTable.facilityName,
      location: storageRecordsTable.location, slotId: storageRecordsTable.slotId,
      temperatureCelsius: storageRecordsTable.temperatureCelsius,
      quantityKg: storageRecordsTable.quantityKg, receivedAt: storageRecordsTable.receivedAt,
      releasedAt: storageRecordsTable.releasedAt, status: storageRecordsTable.status,
      notes: storageRecordsTable.notes, createdAt: storageRecordsTable.createdAt,
      operatorName: usersTable.name, batchCode: seedBatchesTable.batchCode,
    }).from(storageRecordsTable)
      .leftJoin(usersTable, eq(storageRecordsTable.operatorId, usersTable.id))
      .leftJoin(seedBatchesTable, eq(storageRecordsTable.batchId, seedBatchesTable.id));
    if (operatorId) {
      records = records.filter(r => r.operatorId === parseInt(operatorId as string));
    }
    res.json(records);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/storage", authMiddleware, async (req, res) => {
  try {
    const operatorId = (req as any).user.id;
    const { batchId, facilityName, location, slotId, temperatureCelsius, quantityKg, notes } = req.body;
    const [record] = await db.insert(storageRecordsTable).values({
      batchId, operatorId, facilityName, location, slotId, temperatureCelsius,
      quantityKg, notes, receivedAt: new Date(), status: "incoming"
    }).returning();
    await db.update(seedBatchesTable).set({ status: "in_storage" }).where(eq(seedBatchesTable.id, batchId));
    res.status(201).json(record);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/storage/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [record] = await db.select({
      id: storageRecordsTable.id, batchId: storageRecordsTable.batchId,
      operatorId: storageRecordsTable.operatorId, facilityName: storageRecordsTable.facilityName,
      location: storageRecordsTable.location, slotId: storageRecordsTable.slotId,
      temperatureCelsius: storageRecordsTable.temperatureCelsius,
      quantityKg: storageRecordsTable.quantityKg, receivedAt: storageRecordsTable.receivedAt,
      releasedAt: storageRecordsTable.releasedAt, status: storageRecordsTable.status,
      notes: storageRecordsTable.notes, createdAt: storageRecordsTable.createdAt,
      operatorName: usersTable.name, batchCode: seedBatchesTable.batchCode,
    }).from(storageRecordsTable)
      .leftJoin(usersTable, eq(storageRecordsTable.operatorId, usersTable.id))
      .leftJoin(seedBatchesTable, eq(storageRecordsTable.batchId, seedBatchesTable.id))
      .where(eq(storageRecordsTable.id, id)).limit(1);
    if (!record) {
      res.status(404).json({ error: "Storage record not found" });
      return;
    }
    res.json(record);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/storage/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, slotId, temperatureCelsius, releasedAt, notes } = req.body;
    const updateData: any = {};
    if (status) updateData.status = status;
    if (slotId) updateData.slotId = slotId;
    if (temperatureCelsius !== undefined) updateData.temperatureCelsius = temperatureCelsius;
    if (releasedAt) updateData.releasedAt = releasedAt;
    if (notes !== undefined) updateData.notes = notes;
    const [record] = await db.update(storageRecordsTable).set(updateData).where(eq(storageRecordsTable.id, id)).returning();
    if (!record) {
      res.status(404).json({ error: "Storage record not found" });
      return;
    }
    res.json(record);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
