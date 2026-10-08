import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../lib/auth";
import { parse } from "../lib/http";
import { addToCart, cartCount, clearCart, getCart, removeFromCart, setCartQuantity } from "../services/cart";

const router = Router();
const customer = requireRole(["customer"]);
const LotParam = z.object({ lotId: z.string().uuid() });
const Qty = z.number().gt(0).max(100_000);

router.get("/cart", customer, async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(await getCart(req.user!));
});

/** Cheap count for the navbar badge. */
router.get("/cart/count", customer, async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ count: await cartCount(req.user!) });
});

router.post("/cart/items", customer, async (req, res) => {
  const body = parse(z.object({ lotId: z.string().uuid(), quantity: Qty }), req.body);
  res.status(201).json(await addToCart(req.user!, body.lotId, body.quantity));
});

router.patch("/cart/items/:lotId", customer, async (req, res) => {
  const { lotId } = parse(LotParam, req.params);
  const body = parse(z.object({ quantity: Qty }), req.body);
  res.json(await setCartQuantity(req.user!, lotId, body.quantity));
});

router.delete("/cart/items/:lotId", customer, async (req, res) => {
  const { lotId } = parse(LotParam, req.params);
  res.json(await removeFromCart(req.user!, lotId));
});

router.delete("/cart", customer, async (req, res) => {
  res.json(await clearCart(req.user!));
});

export default router;
