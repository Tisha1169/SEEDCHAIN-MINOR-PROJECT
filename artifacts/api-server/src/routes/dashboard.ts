import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, seedBatchesTable, harvestsTable, storageRecordsTable, transportRecordsTable, ordersTable } from "@workspace/db";
import { eq, count, sum, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/dashboard/summary", authMiddleware, async (req, res) => {
  try {
    const [totalUsersResult] = await db.select({ count: count() }).from(usersTable);
    const [totalBatchesResult] = await db.select({ count: count() }).from(seedBatchesTable);
    const [totalHarvestResult] = await db.select({ total: sum(harvestsTable.quantityKg) }).from(harvestsTable);
    const [storageResult] = await db.select({ count: count() }).from(storageRecordsTable).where(eq(storageRecordsTable.status, "stored"));
    const [transportResult] = await db.select({ count: count() }).from(transportRecordsTable).where(eq(transportRecordsTable.status, "in_transit"));
    const [ordersResult] = await db.select({ count: count() }).from(ordersTable).where(eq(ordersTable.status, "pending"));

    const batchStatuses = await db.select({ status: seedBatchesTable.status, cnt: count() }).from(seedBatchesTable).groupBy(seedBatchesTable.status);
    const batchesByStatus: Record<string, number> = {};
    batchStatuses.forEach(s => { batchesByStatus[s.status] = s.cnt; });

    const totalHarvestKg = parseFloat(totalHarvestResult?.total || "0");
    const monthlyVolumeTons = Math.round(totalHarvestKg / 1000 * 10) / 10;

    res.json({
      totalUsers: totalUsersResult.count,
      totalBatches: totalBatchesResult.count,
      totalHarvestKg,
      activeStorageRecords: storageResult.count,
      activeTransports: transportResult.count,
      pendingOrders: ordersResult.count,
      monthlyVolumeTons,
      batchesByStatus,
      recentActivity: [
        { id: 1, type: "harvest", description: "New harvest recorded", timestamp: new Date().toISOString() },
        { id: 2, type: "order", description: "New order placed", timestamp: new Date().toISOString() },
      ],
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/dashboard/farmer/:userId", authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(String(req.params.userId));
    const batches = await db.select().from(seedBatchesTable).where(eq(seedBatchesTable.farmerId, userId));
    const harvests = await db.select().from(harvestsTable).where(eq(harvestsTable.farmerId, userId));
    const activeCrops = batches.filter(b => ["planted", "growing"].includes(b.status)).length;
    const totalHarvestKg = harvests.reduce((sum, h) => sum + parseFloat(h.quantityKg || "0"), 0);
    const inStorageBatches = batches.filter(b => b.status === "in_storage");
    const soldBatches = batches.filter(b => b.status === "sold");

    res.json({
      activeCrops,
      totalHarvestKg,
      inStorageKg: inStorageBatches.reduce((s, b) => s + parseFloat(b.quantityKg || "0"), 0),
      soldKg: soldBatches.reduce((s, b) => s + parseFloat(b.quantityKg || "0"), 0),
      recentBatches: batches.slice(-5).reverse(),
      recentHarvests: harvests.slice(-5).reverse(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/dashboard/storage/:userId", authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(String(req.params.userId));
    const records = await db.select().from(storageRecordsTable).where(eq(storageRecordsTable.operatorId, userId));
    const stored = records.filter(r => r.status === "stored");
    const incoming = records.filter(r => r.status === "incoming");
    const released = records.filter(r => r.status === "released");
    const totalInventoryKg = stored.reduce((s, r) => s + parseFloat(r.quantityKg || "0"), 0);
    const maxCapacity = 50000;
    const occupancyPercent = Math.min((totalInventoryKg / maxCapacity) * 100, 100);

    res.json({
      totalInventoryKg,
      incomingShipments: incoming.length,
      outgoingShipments: released.length,
      occupancyPercent: Math.round(occupancyPercent * 10) / 10,
      recentRecords: records.slice(-5).reverse(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/dashboard/logistics/:userId", authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(String(req.params.userId));
    const records = await db.select().from(transportRecordsTable).where(eq(transportRecordsTable.driverId, userId));
    const inTransit = records.filter(r => r.status === "in_transit");
    const pending = records.filter(r => r.status === "pending");
    const delivered = records.filter(r => r.status === "delivered");

    res.json({
      assignedDeliveries: records.length,
      inTransit: inTransit.length,
      completedToday: delivered.length,
      pendingPickups: pending.length,
      recentTransports: records.slice(-5).reverse(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/dashboard/buyer/:userId", authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(String(req.params.userId));
    const orders = await db.select().from(ordersTable).where(eq(ordersTable.buyerId, userId));
    const activeOrders = orders.filter(o => ["pending", "confirmed", "dispatched"].includes(o.status));
    const inTransitOrders = orders.filter(o => o.status === "dispatched");
    const totalPurchasedKg = orders.filter(o => o.status === "delivered").reduce((s, o) => s + parseFloat(o.quantityKg || "0"), 0);

    res.json({
      activeOrders: activeOrders.length,
      totalPurchasedKg,
      inTransitOrders: inTransitOrders.length,
      recentOrders: orders.slice(-5).reverse(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
