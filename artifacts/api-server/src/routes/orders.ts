import { Router } from "express";
import {
  CreateOrderBody,
  GetOrderParams,
  ListOrdersQueryParams,
  SubmitOrderFeedbackBody,
  TransitionOrderBody,
  TransitionOrderParams,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";
import { badRequest } from "../lib/errors";
import { actorOf, parse, withIdempotency } from "../lib/http";
import { createOrder, getOrder, listOrders, transitionOrder } from "../services/orders";
import { submitReview } from "../services/reviews";
import { reportOfflineConflict } from "./lots";

const router = Router();

router.get("/orders", requireAuth, async (req, res) => {
  const q = parse(ListOrdersQueryParams, req.query);
  res.json(await listOrders(req.user!, q.status));
});

router.post("/orders", requireRole(["customer"]), async (req, res) => {
  const key = req.get("idempotency-key");
  if (!key || key.length < 8 || key.length > 100) throw badRequest("Idempotency-Key header (8-100 chars) is required");
  const body = parse(CreateOrderBody, req.body);
  const r = await createOrder(actorOf(req), key, body);
  res.status(r.duplicate ? 200 : 201).json(r.order);
});

router.get("/orders/:id", requireAuth, async (req, res) => {
  const { id } = parse(GetOrderParams, req.params);
  res.json(await getOrder(req.user!, id));
});

router.post("/orders/:id/feedback", requireRole(["customer"]), async (req, res) => {
  const { id } = parse(GetOrderParams, req.params);
  const body = parse(SubmitOrderFeedbackBody, req.body);
  res.status(201).json(await submitReview(actorOf(req), id, body));
});

router.post("/orders/:id/:action", requireRole(["farmer", "customer", "admin"]), async (req, res) => {
  const { id, action } = parse(TransitionOrderParams, req.params);
  const body = parse(TransitionOrderBody, req.body);
  try {
    const r = await withIdempotency(req, `POST /orders/${id}/${action}`, async () => {
      const t = await transitionOrder(actorOf(req), id, action, body);
      return { status: 200, body: t.order };
    });
    res.status(r.status).json(r.body);
  } catch (err) {
    await reportOfflineConflict(req, err, "order", id);
    throw err;
  }
});

export default router;
