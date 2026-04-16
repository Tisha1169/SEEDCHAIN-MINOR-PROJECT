import { Router } from "express";
import { db } from "@workspace/db";
import { farmsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/farms", authMiddleware, async (req, res) => {
  try {
    const farms = await db.select({
      id: farmsTable.id, farmerId: farmsTable.farmerId, name: farmsTable.name,
      location: farmsTable.location, sizeHectares: farmsTable.sizeHectares,
      soilType: farmsTable.soilType, createdAt: farmsTable.createdAt,
      farmerName: usersTable.name,
    }).from(farmsTable).leftJoin(usersTable, eq(farmsTable.farmerId, usersTable.id));
    res.json(farms);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/farms", authMiddleware, async (req, res) => {
  try {
    const farmerId = (req as any).user.id;
    const { name, location, sizeHectares, soilType } = req.body;
    const [farm] = await db.insert(farmsTable).values({ farmerId, name, location, sizeHectares, soilType }).returning();
    res.status(201).json(farm);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/farms/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [farm] = await db.select({
      id: farmsTable.id, farmerId: farmsTable.farmerId, name: farmsTable.name,
      location: farmsTable.location, sizeHectares: farmsTable.sizeHectares,
      soilType: farmsTable.soilType, createdAt: farmsTable.createdAt,
      farmerName: usersTable.name,
    }).from(farmsTable).leftJoin(usersTable, eq(farmsTable.farmerId, usersTable.id)).where(eq(farmsTable.id, id)).limit(1);
    if (!farm) {
      res.status(404).json({ error: "Farm not found" });
      return;
    }
    res.json(farm);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
