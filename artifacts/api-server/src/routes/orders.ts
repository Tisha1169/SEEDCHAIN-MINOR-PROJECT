import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, usersTable, seedBatchesTable, harvestsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/orders", authMiddleware, async (req, res) => {
  try {
    const { buyerId, status } = req.query;
    let orders = await db.select({
      id: ordersTable.id, buyerId: ordersTable.buyerId,
      batchId: ordersTable.batchId, quantityKg: ordersTable.quantityKg,
      pricePerKg: ordersTable.pricePerKg, totalPrice: ordersTable.totalPrice,
      status: ordersTable.status, transportId: ordersTable.transportId,
      notes: ordersTable.notes, createdAt: ordersTable.createdAt,
      buyerName: usersTable.name, batchCode: seedBatchesTable.batchCode,
      variety: seedBatchesTable.variety,
    }).from(ordersTable)
      .leftJoin(usersTable, eq(ordersTable.buyerId, usersTable.id))
      .leftJoin(seedBatchesTable, eq(ordersTable.batchId, seedBatchesTable.id));
    if (buyerId) {
      orders = orders.filter(o => o.buyerId === parseInt(buyerId as string));
    }
    if (status) {
      orders = orders.filter(o => o.status === status);
    }
    res.json(orders);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/orders", authMiddleware, async (req, res) => {
  try {
    const buyerId = (req as any).user.id;
    const { batchId, quantityKg, pricePerKg, notes } = req.body;
    const totalPrice = (parseFloat(quantityKg) * parseFloat(pricePerKg)).toFixed(2);
    const [order] = await db.insert(ordersTable).values({
      buyerId, batchId, quantityKg, pricePerKg, totalPrice, notes
    }).returning();
    res.status(201).json(order);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/orders/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [order] = await db.select({
      id: ordersTable.id, buyerId: ordersTable.buyerId,
      batchId: ordersTable.batchId, quantityKg: ordersTable.quantityKg,
      pricePerKg: ordersTable.pricePerKg, totalPrice: ordersTable.totalPrice,
      status: ordersTable.status, transportId: ordersTable.transportId,
      notes: ordersTable.notes, createdAt: ordersTable.createdAt,
      buyerName: usersTable.name, batchCode: seedBatchesTable.batchCode,
      variety: seedBatchesTable.variety,
    }).from(ordersTable)
      .leftJoin(usersTable, eq(ordersTable.buyerId, usersTable.id))
      .leftJoin(seedBatchesTable, eq(ordersTable.batchId, seedBatchesTable.id))
      .where(eq(ordersTable.id, id)).limit(1);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json(order);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/orders/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const { status, transportId } = req.body;
    const updateData: any = {};
    if (status) updateData.status = status;
    if (transportId) updateData.transportId = transportId;
    const [order] = await db.update(ordersTable).set(updateData).where(eq(ordersTable.id, id)).returning();
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    if (status === "delivered") {
      await db.update(seedBatchesTable).set({ status: "sold" }).where(eq(seedBatchesTable.id, order.batchId));
    }
    res.json(order);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/marketplace", authMiddleware, async (req, res) => {
  try {
    const batches = await db.select({
      batchId: seedBatchesTable.id, batchCode: seedBatchesTable.batchCode,
      variety: seedBatchesTable.variety, quantityKg: seedBatchesTable.quantityKg,
      qualityGrade: seedBatchesTable.qualityGrade, farmerName: usersTable.name,
      location: usersTable.location,
    }).from(seedBatchesTable)
      .leftJoin(usersTable, eq(seedBatchesTable.farmerId, usersTable.id))
      .where(eq(seedBatchesTable.status, "harvested"));

    const listings = batches.map(b => ({
      ...b,
      pricePerKg: b.qualityGrade === "A" ? 25 : b.qualityGrade === "B" ? 20 : 15,
      harvestDate: new Date().toISOString().split("T")[0],
    }));
    res.json(listings);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
