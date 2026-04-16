import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/users", authMiddleware, async (req, res) => {
  try {
    const { role } = req.query;
    let query = db.select({
      id: usersTable.id, name: usersTable.name, email: usersTable.email,
      phone: usersTable.phone, role: usersTable.role, location: usersTable.location, createdAt: usersTable.createdAt
    }).from(usersTable);
    if (role) {
      const users = await db.select({
        id: usersTable.id, name: usersTable.name, email: usersTable.email,
        phone: usersTable.phone, role: usersTable.role, location: usersTable.location, createdAt: usersTable.createdAt
      }).from(usersTable).where(eq(usersTable.role, role as any));
      res.json(users);
      return;
    }
    const users = await query;
    res.json(users);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/users/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [user] = await db.select({
      id: usersTable.id, name: usersTable.name, email: usersTable.email,
      phone: usersTable.phone, role: usersTable.role, location: usersTable.location, createdAt: usersTable.createdAt
    }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/users/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, phone, location } = req.body;
    const [user] = await db.update(usersTable).set({ name, phone, location }).where(eq(usersTable.id, id)).returning();
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, location: user.location, createdAt: user.createdAt });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
