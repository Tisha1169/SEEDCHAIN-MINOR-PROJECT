import { Router } from "express";
import { z } from "zod";
import {
  ClearLotRecallBody,
  EnableQrBody,
  GetFarmerReviewParams,
  GetQrAnalyticsQueryParams,
  HandleQrAnomalyBody,
  HandleQrAnomalyParams,
  ListQrAnomaliesQueryParams,
  MarkNotificationsReadBody,
  ModerateReviewBody,
  ModerateReviewParams,
  PreviewLotRecallParams,
  DisableQrBody,
  DisableQrParams,
  RecallLotBody,
} from "@workspace/api-zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { auditLogsTable, db, farmerProfilesTable, farmsTable, lotsTable, ordersTable, productsTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
import { notFound } from "../lib/errors";
import { actorOf, parse } from "../lib/http";
import { disableQr, enableQr, handleAnomaly, listAnomalies, qrAnalytics } from "../services/qr-ops";
import { clearRecall, getRecall, initiateRecall, previewRecall } from "../services/recall";
import { listNotifications, markRead } from "../services/notifications";
import { listReviewsForModeration, moderateReview } from "../services/reviews";
import { serializeUser } from "./auth";

const router = Router();
const admin = requireRole(["admin"]);
const IdParam = z.object({ id: z.string().uuid() });

// ------------------------------------------------------------------ notifications
router.get("/me/notifications", requireAuth, async (req, res) => {
  res.json(await listNotifications(req.user!.id));
});
router.post("/me/notifications/read", requireAuth, async (req, res) => {
  const body = parse(MarkNotificationsReadBody, req.body);
  await markRead(req.user!.id, body.ids);
  res.status(204).end();
});

// ------------------------------------------------------------------ QR analytics + anomalies
router.get("/analytics/qr", requireRole(["admin", "farmer"], { active: false }), async (req, res) => {
  const q = parse(GetQrAnalyticsQueryParams, req.query);
  res.json(await qrAnalytics(q.days ?? 14, req.user!.role === "farmer" ? req.user!.id : undefined));
});
router.get("/admin/anomalies", admin, async (req, res) => {
  const q = parse(ListQrAnomaliesQueryParams, req.query);
  res.json(await listAnomalies(q.status));
});
router.post("/admin/anomalies/:id/:action", admin, async (req, res) => {
  const { id, action } = parse(HandleQrAnomalyParams, req.params);
  const body = parse(HandleQrAnomalyBody, req.body);
  res.json(await handleAnomaly(actorOf(req), id, action, body.note));
});
router.post("/admin/qr/:id/disable", admin, async (req, res) => {
  const { id } = parse(DisableQrParams, req.params);
  const body = parse(DisableQrBody, req.body);
  res.json(await disableQr(actorOf(req), id, body.reason, body.anomalyId));
});
router.post("/admin/qr/:id/enable", admin, async (req, res) => {
  const { id } = parse(DisableQrParams, req.params);
  res.json(await enableQr(actorOf(req), id, parse(EnableQrBody, req.body).reason));
});

// ------------------------------------------------------------------ recall
router.get("/admin/lots/:id/recall-impact", admin, async (req, res) => {
  const { id } = parse(PreviewLotRecallParams, req.params);
  res.json(await previewRecall(id));
});
router.post("/admin/lots/:id/recall", admin, async (req, res) => {
  const { id } = parse(IdParam, req.params);
  const body = parse(RecallLotBody, req.body);
  res.json(await initiateRecall(actorOf(req), id, body.reason, body.publicMessage));
});
router.post("/admin/lots/:id/recall/clear", admin, async (req, res) => {
  const { id } = parse(IdParam, req.params);
  res.json(await clearRecall(actorOf(req), id, parse(ClearLotRecallBody, req.body).note));
});
router.get("/lots/:id/recall", requireRole(["admin", "farmer"], { active: false }), async (req, res) => {
  const { id } = parse(IdParam, req.params);
  const [lot] = await db.select({ farmerId: lotsTable.farmerId }).from(lotsTable).where(eq(lotsTable.id, id));
  if (!lot || (req.user!.role === "farmer" && lot.farmerId !== req.user!.id)) throw notFound("Lot not found");
  res.json(await getRecall(id));
});

// ------------------------------------------------------------------ review moderation
router.get("/admin/reviews", admin, async (_req, res) => {
  res.json(await listReviewsForModeration());
});
router.post("/admin/reviews/:orderId/:action", admin, async (req, res) => {
  const { orderId, action } = parse(ModerateReviewParams, req.params);
  await moderateReview(actorOf(req), orderId, action === "hide", parse(ModerateReviewBody, req.body).reason);
  res.status(204).end();
});

// ------------------------------------------------------------------ farmer application review (admin)
router.get("/admin/farmers/:id/review", admin, async (req, res) => {
  const { id } = parse(GetFarmerReviewParams, req.params);
  const [u] = await db.select().from(usersTable).where(and(eq(usersTable.id, id), eq(usersTable.role, "farmer")));
  if (!u) throw notFound("Farmer not found");
  const [profile] = await db.select().from(farmerProfilesTable).where(eq(farmerProfilesTable.userId, id));
  const farms = await db.select().from(farmsTable).where(eq(farmsTable.farmerId, id));
  const products = await db.select({ name: productsTable.name, variety: productsTable.variety }).from(productsTable).where(eq(productsTable.farmerId, id));
  const [{ lots }] = await db.select({ lots: sql<number>`count(*)::int` }).from(lotsTable).where(eq(lotsTable.farmerId, id));
  const [{ orders }] = await db.select({ orders: sql<number>`count(*)::int` }).from(ordersTable).where(eq(ordersTable.farmerId, id));
  const history = await db
    .select({ action: auditLogsTable.action, at: auditLogsTable.createdAt, by: usersTable.name, after: auditLogsTable.after })
    .from(auditLogsTable)
    .leftJoin(usersTable, eq(usersTable.id, auditLogsTable.userId))
    .where(and(eq(auditLogsTable.entityType, "user"), eq(auditLogsTable.entityId, id)))
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(30);
  res.json({
    user: await serializeUser(u),
    submittedAt: profile?.submittedAt.toISOString() ?? null,
    farms: farms.map((f) => ({ id: f.id, name: f.name, village: f.village, district: f.district, state: f.state, sizeHectares: f.sizeHectares == null ? null : Number(f.sizeHectares), hasGps: f.latitude != null })),
    products,
    lotsCount: lots,
    ordersCount: orders,
    history: history.map((h) => ({ action: h.action, at: h.at.toISOString(), by: h.by, note: (h.after as { note?: string } | null)?.note ?? null })),
  });
});

export default router;
