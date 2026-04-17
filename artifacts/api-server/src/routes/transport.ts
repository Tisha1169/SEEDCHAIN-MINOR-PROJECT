import { Router } from "express";
import { db } from "@workspace/db";
import { transportRecordsTable, usersTable, seedBatchesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/transport", authMiddleware, async (req, res) => {
  try {
    const { driverId, status } = req.query;
    let records = await db.select({
      id: transportRecordsTable.id, batchId: transportRecordsTable.batchId,
      driverId: transportRecordsTable.driverId, vehicleNumber: transportRecordsTable.vehicleNumber,
      originLocation: transportRecordsTable.originLocation,
      destinationLocation: transportRecordsTable.destinationLocation,
      quantityKg: transportRecordsTable.quantityKg,
      scheduledPickup: transportRecordsTable.scheduledPickup,
      actualPickup: transportRecordsTable.actualPickup,
      deliveredAt: transportRecordsTable.deliveredAt,
      status: transportRecordsTable.status, notes: transportRecordsTable.notes,
      createdAt: transportRecordsTable.createdAt, driverName: usersTable.name,
      batchCode: seedBatchesTable.batchCode,
    }).from(transportRecordsTable)
      .leftJoin(usersTable, eq(transportRecordsTable.driverId, usersTable.id))
      .leftJoin(seedBatchesTable, eq(transportRecordsTable.batchId, seedBatchesTable.id));
    if (driverId) {
      records = records.filter(r => r.driverId === parseInt(driverId as string));
    }
    if (status) {
      records = records.filter(r => r.status === status);
    }
    res.json(records);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/transport", authMiddleware, async (req, res) => {
  try {
    const driverId = (req as any).user.id;
    const { batchId, vehicleNumber, originLocation, destinationLocation, quantityKg, scheduledPickup, notes } = req.body;
    const [record] = await db.insert(transportRecordsTable).values({
      batchId, driverId, vehicleNumber, originLocation, destinationLocation,
      quantityKg, scheduledPickup: scheduledPickup ? new Date(scheduledPickup) : undefined, notes
    }).returning();
    res.status(201).json(record);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/transport/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [record] = await db.select({
      id: transportRecordsTable.id, batchId: transportRecordsTable.batchId,
      driverId: transportRecordsTable.driverId, vehicleNumber: transportRecordsTable.vehicleNumber,
      originLocation: transportRecordsTable.originLocation,
      destinationLocation: transportRecordsTable.destinationLocation,
      quantityKg: transportRecordsTable.quantityKg,
      scheduledPickup: transportRecordsTable.scheduledPickup,
      actualPickup: transportRecordsTable.actualPickup,
      deliveredAt: transportRecordsTable.deliveredAt,
      status: transportRecordsTable.status, notes: transportRecordsTable.notes,
      createdAt: transportRecordsTable.createdAt, driverName: usersTable.name,
      batchCode: seedBatchesTable.batchCode,
    }).from(transportRecordsTable)
      .leftJoin(usersTable, eq(transportRecordsTable.driverId, usersTable.id))
      .leftJoin(seedBatchesTable, eq(transportRecordsTable.batchId, seedBatchesTable.id))
      .where(eq(transportRecordsTable.id, id)).limit(1);
    if (!record) {
      res.status(404).json({ error: "Transport record not found" });
      return;
    }
    res.json(record);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/transport/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const { status, actualPickup, deliveredAt, notes } = req.body;
    const updateData: any = {};
    if (status) updateData.status = status;
    if (actualPickup) updateData.actualPickup = new Date(actualPickup);
    if (deliveredAt) updateData.deliveredAt = new Date(deliveredAt);
    if (notes !== undefined) updateData.notes = notes;
    const [record] = await db.update(transportRecordsTable).set(updateData).where(eq(transportRecordsTable.id, id)).returning();
    if (!record) {
      res.status(404).json({ error: "Transport record not found" });
      return;
    }
    if (status === "in_transit") {
      await db.update(seedBatchesTable).set({ status: "in_transit" }).where(eq(seedBatchesTable.id, record.batchId));
    } else if (status === "delivered") {
      await db.update(seedBatchesTable).set({ status: "delivered" }).where(eq(seedBatchesTable.id, record.batchId));
    }
    res.json(record);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
