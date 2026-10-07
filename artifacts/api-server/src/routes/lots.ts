import { Router, type Request } from "express";
import { db } from "@workspace/db";
import {
  CreateLotBody,
  GenerateQrBody,
  GetLotParams,
  ListLotsQueryParams,
  RecordLotEventBody,
  RevokeQrBody,
  SetLotListingBody,
  UpdateLotBody,
} from "@workspace/api-zod";
import { requireRole } from "../lib/auth";
import { HttpError } from "../lib/errors";
import { actorOf, isOfflineReplay, parse } from "../lib/http";
import {
  createLot,
  getLotDetail,
  listLotEvents,
  listLotQr,
  listLots,
  listLotStorage,
  recordLotEvent,
  replaceQr,
  revokeQr,
  setListing,
  updateLot,
} from "../services/lots";
import { raiseAlert } from "../services/records";

const router = Router();

/**
 * When a queued offline action is rejected, the client keeps it as a
 * SYNC_CONFLICT locally and the admin/farmer get an alert. History is
 * never silently overwritten.
 */
export async function reportOfflineConflict(req: Request, err: unknown, entityType: string, entityId: string) {
  if (!isOfflineReplay(req) || !(err instanceof HttpError) || err.status >= 500) return;
  await raiseAlert(db, {
    type: "OFFLINE_SYNC_CONFLICT",
    severity: "MEDIUM",
    message: `Offline action rejected during sync: ${err.message}`,
    entityType,
    entityId,
    farmerId: req.user?.role === "farmer" ? req.user.id : null,
    metadata: { code: err.code, body: req.body, path: req.path },
  });
}

const farmerOrAdmin = requireRole(["farmer", "admin"], { active: false });
const activeFarmer = requireRole(["farmer"]);

router.get("/lots", farmerOrAdmin, async (req, res) => {
  const q = parse(ListLotsQueryParams, req.query);
  res.json(await listLots(req.user!, q.status));
});

router.post("/lots", activeFarmer, async (req, res) => {
  const body = parse(CreateLotBody, req.body);
  const r = await createLot(actorOf(req), body);
  res.status(r.duplicate ? 200 : 201).json(r.lot);
});

router.get("/inventory", farmerOrAdmin, async (req, res) => {
  const lots = await listLots(req.user!);
  const totals = { harvested: 0, reserved: 0, sold: 0, loss: 0, available: 0 };
  for (const l of lots) for (const k of Object.keys(totals) as (keyof typeof totals)[]) totals[k] += l.inventory[k];
  res.json({
    totals,
    lots: lots.map((l) => ({ lotId: l.id, lotCode: l.lotCode, productName: l.productName, variety: l.variety, farmerName: l.farmerName, status: l.status, listed: l.listed, inventory: l.inventory })),
    generatedAt: new Date().toISOString(),
  });
});

router.get("/lots/:id", farmerOrAdmin, async (req, res) => {
  const { id } = parse(GetLotParams, req.params);
  res.json(await getLotDetail(req.user!, id));
});

router.patch("/lots/:id", activeFarmer, async (req, res) => {
  const { id } = parse(GetLotParams, req.params);
  res.json(await updateLot(actorOf(req), id, parse(UpdateLotBody, req.body)));
});

router.post("/lots/:id/listing", activeFarmer, async (req, res) => {
  const { id } = parse(GetLotParams, req.params);
  res.json(await setListing(actorOf(req), id, parse(SetLotListingBody, req.body)));
});

router.get("/lots/:id/events", farmerOrAdmin, async (req, res) => {
  const { id } = parse(GetLotParams, req.params);
  res.json(await listLotEvents(req.user!, id));
});

router.post("/lots/:id/events", activeFarmer, async (req, res) => {
  const { id } = parse(GetLotParams, req.params);
  const body = parse(RecordLotEventBody, req.body);
  try {
    const r = await recordLotEvent(actorOf(req), id, body);
    res.status(r.duplicate ? 200 : 201).json(r.event);
  } catch (err) {
    await reportOfflineConflict(req, err, "lot", id);
    throw err;
  }
});

router.get("/lots/:id/storage", farmerOrAdmin, async (req, res) => {
  const { id } = parse(GetLotParams, req.params);
  res.json(await listLotStorage(req.user!, id));
});

router.get("/lots/:id/qr", farmerOrAdmin, async (req, res) => {
  const { id } = parse(GetLotParams, req.params);
  res.json(await listLotQr(req.user!, id));
});

router.post("/qr/generate", requireRole(["farmer", "admin"]), async (req, res) => {
  const body = parse(GenerateQrBody, req.body);
  res.status(201).json(await replaceQr(actorOf(req), body.lotId, body.reason));
});

router.post("/qr/revoke", requireRole(["admin"]), async (req, res) => {
  const body = parse(RevokeQrBody, req.body);
  res.json(await revokeQr(actorOf(req), body.qrId, body.reason, !!body.issueReplacement));
});

export default router;
