import { Router } from "express";
import { db } from "@workspace/db";
import { shipmentTrackingTable, seedBatchesTable, transportRecordsTable, usersTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

// Generate tracking ID
function generateTrackingId(): string {
  const num = Math.floor(1000000 + Math.random() * 9000000);
  return `TRK-${num}`;
}

// Get tracking by tracking ID (public - no auth required for transparency)
router.get("/tracking/:trackingId", async (req, res) => {
  try {
    const { trackingId } = req.params;
    const events = await db.select({
      id: shipmentTrackingTable.id,
      trackingId: shipmentTrackingTable.trackingId,
      batchId: shipmentTrackingTable.batchId,
      transportId: shipmentTrackingTable.transportId,
      latitude: shipmentTrackingTable.latitude,
      longitude: shipmentTrackingTable.longitude,
      status: shipmentTrackingTable.status,
      location: shipmentTrackingTable.location,
      notes: shipmentTrackingTable.notes,
      updatedBy: shipmentTrackingTable.updatedBy,
      createdAt: shipmentTrackingTable.createdAt,
      batchCode: seedBatchesTable.batchCode,
      variety: seedBatchesTable.variety,
    }).from(shipmentTrackingTable)
      .leftJoin(seedBatchesTable, eq(shipmentTrackingTable.batchId, seedBatchesTable.id))
      .where(eq(shipmentTrackingTable.trackingId, trackingId))
      .orderBy(shipmentTrackingTable.createdAt);

    if (events.length === 0) {
      res.status(404).json({ error: "Tracking ID not found" });
      return;
    }

    // Get transport info if available
    const latestEvent = events[events.length - 1];
    let transportInfo = null;
    if (latestEvent.transportId) {
      const [transport] = await db.select({
        vehicleNumber: transportRecordsTable.vehicleNumber,
        originLocation: transportRecordsTable.originLocation,
        destinationLocation: transportRecordsTable.destinationLocation,
        driverName: usersTable.name,
      }).from(transportRecordsTable)
        .leftJoin(usersTable, eq(transportRecordsTable.driverId, usersTable.id))
        .where(eq(transportRecordsTable.id, latestEvent.transportId))
        .limit(1);
      transportInfo = transport || null;
    }

    res.json({
      trackingId,
      batchId: latestEvent.batchId,
      batchCode: latestEvent.batchCode,
      variety: latestEvent.variety,
      currentStatus: latestEvent.status,
      currentLocation: latestEvent.location,
      currentLatitude: latestEvent.latitude,
      currentLongitude: latestEvent.longitude,
      transportInfo,
      timeline: events.map(e => ({
        id: e.id,
        status: e.status,
        location: e.location,
        latitude: e.latitude,
        longitude: e.longitude,
        notes: e.notes,
        timestamp: e.createdAt,
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Create tracking entry (used when order is created or shipment starts)
router.post("/tracking", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { batchId, transportId, status, location, latitude, longitude, notes } = req.body;

    // Check if tracking already exists for this batch+transport combo
    let trackingId: string;
    if (transportId) {
      const existing = await db.select()
        .from(shipmentTrackingTable)
        .where(and(
          eq(shipmentTrackingTable.batchId, batchId),
          eq(shipmentTrackingTable.transportId, transportId)
        ))
        .limit(1);
      trackingId = existing.length > 0 ? existing[0].trackingId : generateTrackingId();
    } else {
      const existing = await db.select()
        .from(shipmentTrackingTable)
        .where(eq(shipmentTrackingTable.batchId, batchId))
        .limit(1);
      trackingId = existing.length > 0 ? existing[0].trackingId : generateTrackingId();
    }

    const [record] = await db.insert(shipmentTrackingTable).values({
      trackingId,
      batchId,
      transportId: transportId || null,
      status: status || "order_created",
      location: location || null,
      latitude: latitude || null,
      longitude: longitude || null,
      notes: notes || null,
      updatedBy: userId,
    }).returning();

    res.status(201).json(record);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update location for a shipment
router.post("/tracking/update-location", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { trackingId, latitude, longitude, location, status, notes } = req.body;

    if (!trackingId) {
      res.status(400).json({ error: "trackingId is required" });
      return;
    }

    // Get existing tracking to get batchId and transportId
    const [existing] = await db.select()
      .from(shipmentTrackingTable)
      .where(eq(shipmentTrackingTable.trackingId, trackingId))
      .orderBy(desc(shipmentTrackingTable.createdAt))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Tracking ID not found" });
      return;
    }

    const [record] = await db.insert(shipmentTrackingTable).values({
      trackingId,
      batchId: existing.batchId,
      transportId: existing.transportId,
      status: status || existing.status,
      location: location || existing.location,
      latitude: latitude || existing.latitude,
      longitude: longitude || existing.longitude,
      notes: notes || null,
      updatedBy: userId,
    }).returning();

    res.status(201).json(record);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update shipment status
router.post("/tracking/update-status", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { trackingId, status, location, notes } = req.body;

    if (!trackingId || !status) {
      res.status(400).json({ error: "trackingId and status are required" });
      return;
    }

    const [existing] = await db.select()
      .from(shipmentTrackingTable)
      .where(eq(shipmentTrackingTable.trackingId, trackingId))
      .orderBy(desc(shipmentTrackingTable.createdAt))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Tracking ID not found" });
      return;
    }

    const [record] = await db.insert(shipmentTrackingTable).values({
      trackingId,
      batchId: existing.batchId,
      transportId: existing.transportId,
      status,
      location: location || existing.location,
      latitude: existing.latitude,
      longitude: existing.longitude,
      notes: notes || null,
      updatedBy: userId,
    }).returning();

    res.status(201).json(record);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all shipments for a user (based on their role)
router.get("/shipments/user/:userId", authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const role = (req as any).user.role;

    // Get latest tracking event for each tracking ID
    const allTracking = await db.select({
      id: shipmentTrackingTable.id,
      trackingId: shipmentTrackingTable.trackingId,
      batchId: shipmentTrackingTable.batchId,
      transportId: shipmentTrackingTable.transportId,
      status: shipmentTrackingTable.status,
      location: shipmentTrackingTable.location,
      latitude: shipmentTrackingTable.latitude,
      longitude: shipmentTrackingTable.longitude,
      createdAt: shipmentTrackingTable.createdAt,
      batchCode: seedBatchesTable.batchCode,
      variety: seedBatchesTable.variety,
      farmerId: seedBatchesTable.farmerId,
    }).from(shipmentTrackingTable)
      .leftJoin(seedBatchesTable, eq(shipmentTrackingTable.batchId, seedBatchesTable.id))
      .orderBy(desc(shipmentTrackingTable.createdAt));

    // Group by trackingId and take latest
    const grouped = new Map<string, typeof allTracking[0]>();
    for (const record of allTracking) {
      if (!grouped.has(record.trackingId)) {
        grouped.set(record.trackingId, record);
      }
    }

    let shipments = Array.from(grouped.values());

    // Filter based on role
    if (role === "farmer") {
      shipments = shipments.filter(s => s.farmerId === userId);
    } else if (role === "logistics") {
      // Get transport records for this driver
      const transports = await db.select({ id: transportRecordsTable.id })
        .from(transportRecordsTable)
        .where(eq(transportRecordsTable.driverId, userId));
      const transportIds = new Set(transports.map(t => t.id));
      shipments = shipments.filter(s => s.transportId && transportIds.has(s.transportId));
    }
    // admin and buyer see all (buyer filtering would need order table join)

    res.json(shipments);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all active shipments for admin supply chain map
router.get("/tracking/all/active", authMiddleware, async (req, res) => {
  try {
    const allTracking = await db.select({
      id: shipmentTrackingTable.id,
      trackingId: shipmentTrackingTable.trackingId,
      batchId: shipmentTrackingTable.batchId,
      transportId: shipmentTrackingTable.transportId,
      status: shipmentTrackingTable.status,
      location: shipmentTrackingTable.location,
      latitude: shipmentTrackingTable.latitude,
      longitude: shipmentTrackingTable.longitude,
      createdAt: shipmentTrackingTable.createdAt,
      batchCode: seedBatchesTable.batchCode,
      variety: seedBatchesTable.variety,
    }).from(shipmentTrackingTable)
      .leftJoin(seedBatchesTable, eq(shipmentTrackingTable.batchId, seedBatchesTable.id))
      .orderBy(desc(shipmentTrackingTable.createdAt));

    // Group by trackingId and take latest
    const grouped = new Map<string, typeof allTracking[0]>();
    for (const record of allTracking) {
      if (!grouped.has(record.trackingId)) {
        grouped.set(record.trackingId, record);
      }
    }

    // Filter for active (not delivered)
    const active = Array.from(grouped.values()).filter(
      s => s.status !== "delivered_to_buyer"
    );

    res.json(active);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
