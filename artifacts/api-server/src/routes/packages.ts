import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../lib/auth";
import { actorOf, parse } from "../lib/http";
import { publicTraceLimiter, sealReportLimiter } from "../lib/rate-limit";
import { createPackages, listPackages, reportSealIssue, setSealStatus } from "../services/packages";
import { isWellFormedToken } from "../domain/qr";
import { notFound } from "../lib/errors";

const router = Router();
const Id = z.object({ id: z.string().uuid() });

router.get("/lots/:id/packages", requireRole(["farmer", "admin"], { active: false }), async (req, res) => {
  const { id } = parse(Id, req.params);
  res.json(await listPackages(req.user!, id));
});

const CreateBody = z
  .object({
    quantities: z.array(z.number().positive().max(1_000_000)).min(1).max(200).optional(),
    count: z.number().int().min(1).max(200).optional(),
    quantityEach: z.number().positive().max(1_000_000).optional(),
  })
  .refine((b) => !!b.quantities || (b.count && b.quantityEach), { message: "Give either quantities, or count and quantityEach" });

router.post("/lots/:id/packages", requireRole(["farmer", "admin"]), async (req, res) => {
  const { id } = parse(Id, req.params);
  const body = parse(CreateBody, req.body);
  res.status(201).json(await createPackages(actorOf(req), id, body));
});

const SealBody = z.object({ status: z.enum(["DISPATCH_VERIFIED", "INTACT", "BROKEN", "REPORTED", "REPLACED"]), note: z.string().max(300).optional() });

router.post("/packages/:id/seal", requireRole(["farmer", "admin"]), async (req, res) => {
  const { id } = parse(Id, req.params);
  const body = parse(SealBody, req.body);
  res.json(await setSealStatus(actorOf(req), id, body.status, body.note));
});

const ReportBody = z.object({ kind: z.enum(["SEAL_BROKEN", "SEAL_MISSING", "SEAL_MISMATCH", "OTHER"]), note: z.string().max(300).optional() });

/** Public: report a packaging or seal problem for the package whose QR you scanned. Rate limited; free text is sanitised and length-capped. */
router.post("/trace/:publicToken/report-seal", publicTraceLimiter, sealReportLimiter, async (req, res) => {
  const token = String(req.params.publicToken);
  if (!isWellFormedToken(token)) throw notFound("Unknown QR code");
  const body = parse(ReportBody, req.body);
  res.setHeader("Cache-Control", "no-store");
  res.status(201).json(await reportSealIssue(token, body.kind, body.note, req.user));
});

export default router;
