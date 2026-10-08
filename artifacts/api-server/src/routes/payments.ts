import { Router } from "express";
import { z } from "zod";
import { CreateOrderBody } from "@workspace/api-zod";
import { requireRole } from "../lib/auth";
import { badRequest } from "../lib/errors";
import { actorOf, parse } from "../lib/http";
import { getCheckoutSession, listPayments, paymentConfig, refundPayment, startCheckout, verifyCheckout } from "../services/payments";

const router = Router();

/** Public, non-secret: whether online payment is on and which public key id Checkout should use. */
router.get("/payments/config", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(paymentConfig());
});

/** Customer: validate cart, hold stock, create the Razorpay order server-side. The total is computed here, never taken from the client. */
router.post("/checkout", requireRole(["customer"]), async (req, res) => {
  const key = req.get("idempotency-key");
  if (!key || key.length < 8 || key.length > 100) throw badRequest("Idempotency-Key header (8-100 chars) is required");
  const body = parse(CreateOrderBody, req.body);
  res.setHeader("Cache-Control", "no-store");
  res.status(201).json(await startCheckout(actorOf(req), key, body));
});

/** Resume or retry payment while the stock hold is still valid. */
router.get("/checkout/:orderId/session", requireRole(["customer"]), async (req, res) => {
  const { orderId } = parse(z.object({ orderId: z.string().uuid() }), req.params);
  res.setHeader("Cache-Control", "no-store");
  res.json(await getCheckoutSession(req.user!, orderId));
});

const VerifyBody = z.object({
  orderId: z.string().uuid(),
  razorpay_order_id: z.string().min(6).max(64),
  razorpay_payment_id: z.string().min(6).max(64),
  razorpay_signature: z.string().min(16).max(128),
});

/** Checkout success callback. The signature is verified here, against the Razorpay order id we stored. */
router.post("/checkout/verify", requireRole(["customer"]), async (req, res) => {
  const body = parse(VerifyBody, req.body);
  res.setHeader("Cache-Control", "no-store");
  res.json(await verifyCheckout(req.user!, body));
});

router.get("/admin/payments", requireRole(["admin"]), async (_req, res) => {
  res.json(await listPayments());
});

router.post("/admin/payments/:id/refund", requireRole(["admin"]), async (req, res) => {
  const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
  const { reason } = parse(z.object({ reason: z.string().trim().min(5).max(300) }), req.body);
  res.json(await refundPayment(actorOf(req), id, reason));
});

export default router;
