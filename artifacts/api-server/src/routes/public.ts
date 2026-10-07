import { Router } from "express";
import {
  GetListingParams,
  GetPublicFarmerParams,
  ListMarketplaceQueryParams,
  RecordScanBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { HttpError } from "../lib/errors";
import { parse } from "../lib/http";
import { publicTraceLimiter } from "../lib/rate-limit";
import { publicOverview } from "../services/public-overview";
import { getListing, getPublicFarmer, getPublicTrace, listMarketplace, listMyScans, recordScan } from "../services/trace";

const router = Router();

/** Public QR verification: no login, rate limited, public-safe projection only. */
router.get("/trace/:publicToken", publicTraceLimiter, async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    res.json(await getPublicTrace(String(req.params.publicToken)));
  } catch (err) {
    if (err instanceof HttpError && err.status === 410) {
      res.status(410).json({ status: err.code, message: err.message });
      return;
    }
    throw err;
  }
});

router.post("/scans", publicTraceLimiter, async (req, res) => {
  const body = parse(RecordScanBody, req.body);
  res.json(await recordScan(body, req.user));
});

router.get("/me/scans", requireAuth, async (req, res) => {
  res.json(await listMyScans(req.user!));
});

router.get("/public/overview", publicTraceLimiter, async (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=15");
  res.json(await publicOverview());
});

router.get("/marketplace/listings", async (req, res) => {
  const q = parse(ListMarketplaceQueryParams, req.query);
  res.json(await listMarketplace(q.q, q.state));
});

router.get("/marketplace/listings/:lotId", async (req, res) => {
  const { lotId } = parse(GetListingParams, req.params);
  res.json(await getListing(lotId));
});

router.get("/farmers/:id", async (req, res) => {
  const { id } = parse(GetPublicFarmerParams, req.params);
  res.json(await getPublicFarmer(id));
});

export default router;
