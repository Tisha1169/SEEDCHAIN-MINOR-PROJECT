import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  auditLogsTable,
  db,
  farmerProfilesTable,
  lotsTable,
  qrCodesTable,
  qrScanEventsTable,
  traceabilityEventsTable,
  usersTable,
} from "@workspace/db";
import {
  ListAllTraceEventsQueryParams,
  ListAuditLogsQueryParams,
  ListQrScansQueryParams,
  ListUsersQueryParams,
  ReviewUserBody,
  ReviewUserParams,
  RunIntegrationParams,
} from "@workspace/api-zod";
import { requireRole, revokeAllSessions } from "../lib/auth";
import { badRequest, conflict, notFound } from "../lib/errors";
import { actorOf, parse } from "../lib/http";
import { audit } from "../services/records";
import { notify, type NotificationType } from "../services/notifications";
import { notifyChange } from "../services/realtime";
import { serializeEvent } from "../services/lots";
import { allSourceStatuses, runSource, serializeRun, AUTOMATED_SOURCES, type SourceKey } from "../services/external/ingestion";
import { serializeUser } from "./auth";

const router = Router();
router.use("/admin", requireRole(["admin"]));

router.get("/admin/users", async (req, res) => {
  const q = parse(ListUsersQueryParams, req.query);
  const conds = [];
  if (q.role) conds.push(eq(usersTable.role, q.role));
  if (q.status) conds.push(eq(usersTable.status, q.status));
  const users = await db.select().from(usersTable).where(conds.length ? and(...conds) : undefined).orderBy(desc(usersTable.createdAt)).limit(1000);
  res.json(await Promise.all(users.map(serializeUser)));
});

router.post("/admin/users/:id/:action", async (req, res) => {
  const { id, action } = parse(ReviewUserParams, req.params);
  const { note } = parse(ReviewUserBody, req.body);
  const actor = actorOf(req);
  await db.transaction(async (tx) => {
    const [u] = await tx.select().from(usersTable).where(eq(usersTable.id, id)).for("update");
    if (!u) throw notFound("User not found");
    if (u.role === "admin") throw conflict("Admin accounts cannot be reviewed here", "FORBIDDEN_ACTION");
    const before = { status: u.status };
    let status = u.status;
    switch (action) {
      case "approve":
        if (u.role !== "farmer") throw badRequest("Only farmer accounts require approval");
        if (u.status === "active") throw conflict("Farmer is already approved", "INVALID_STATE_TRANSITION");
        if (u.status === "suspended" || u.status === "rejected") throw conflict("Reactivate or review this account first", "INVALID_STATE_TRANSITION");
        status = "active";
        await tx
          .update(farmerProfilesTable)
          .set({ verifiedAt: new Date(), verifiedBy: actor.user.id, reviewNote: note ?? null, updatedAt: new Date() })
          .where(eq(farmerProfilesTable.userId, u.id));
        break;
      case "request-correction":
        if (u.role !== "farmer" || u.status !== "pending") throw conflict("Only a pending application can be sent back for correction", "INVALID_STATE_TRANSITION");
        if (!note?.trim()) throw badRequest("Tell the farmer what to correct");
        status = "correction_required";
        await tx.update(farmerProfilesTable).set({ reviewNote: note, updatedAt: new Date() }).where(eq(farmerProfilesTable.userId, u.id));
        break;
      case "reject":
        if (u.role !== "farmer" || (u.status !== "pending" && u.status !== "correction_required")) throw conflict("Only pending farmers can be rejected", "INVALID_STATE_TRANSITION");
        if (!note?.trim()) throw badRequest("A note explaining the rejection is required");
        status = "rejected";
        await tx.update(farmerProfilesTable).set({ reviewNote: note, updatedAt: new Date() }).where(eq(farmerProfilesTable.userId, u.id));
        break;
      case "suspend":
        if (u.status === "suspended") throw conflict("User is already suspended", "INVALID_STATE_TRANSITION");
        if (!note?.trim()) throw badRequest("A note explaining the suspension is required");
        status = "suspended";
        break;
      case "reactivate":
        if (u.status !== "suspended") throw conflict("Only suspended users can be reactivated", "INVALID_STATE_TRANSITION");
        status = "active";
        break;
    }
    await tx.update(usersTable).set({ status, updatedAt: new Date() }).where(eq(usersTable.id, u.id));
    await audit(tx, actor, `USER_${action.toUpperCase().replace("-", "_")}`, "user", u.id, before, { status, note: note ?? null });
    const map: Record<string, NotificationType | undefined> = { approve: "FARMER_VERIFIED", "request-correction": "FARMER_CORRECTION_REQUIRED", reject: "FARMER_REJECTED" };
    if (map[action] && u.role === "farmer") await notify(tx, [u.id], { type: map[action]!, params: { note: note ?? null }, entityType: "user", entityId: u.id });
    await notifyChange(tx, { topic: "users", entityId: u.id, farmerId: u.role === "farmer" ? u.id : undefined, customerId: u.role === "customer" ? u.id : undefined });
    await notifyChange(tx, { topic: "listings" });
  });
  if (action === "suspend" || action === "reject") await revokeAllSessions(id);
  const [fresh] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  res.json(await serializeUser(fresh));
});

router.get("/admin/audit-logs", async (req, res) => {
  const q = parse(ListAuditLogsQueryParams, req.query);
  const rows = await db
    .select({ a: auditLogsTable, userName: usersTable.name })
    .from(auditLogsTable)
    .leftJoin(usersTable, eq(usersTable.id, auditLogsTable.userId))
    .where(q.entityType ? eq(auditLogsTable.entityType, q.entityType) : undefined)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(q.limit ?? 200);
  res.json(
    rows.map(({ a, userName }) => ({
      id: a.id,
      userId: a.userId,
      userName,
      role: a.role,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      before: a.before,
      after: a.after,
      requestId: a.requestId,
      eventId: a.eventId,
      createdAt: a.createdAt.toISOString(),
    })),
  );
});

router.get("/admin/events", async (req, res) => {
  const q = parse(ListAllTraceEventsQueryParams, req.query);
  const rows = await db
    .select({ e: traceabilityEventsTable, lotCode: lotsTable.lotCode, actorName: usersTable.name })
    .from(traceabilityEventsTable)
    .innerJoin(lotsTable, eq(lotsTable.id, traceabilityEventsTable.lotId))
    .leftJoin(usersTable, eq(usersTable.id, traceabilityEventsTable.actorUserId))
    .where(q.eventType ? eq(traceabilityEventsTable.eventType, q.eventType) : undefined)
    .orderBy(desc(traceabilityEventsTable.recordedAt))
    .limit(q.limit ?? 200);
  res.json(rows.map((r) => serializeEvent({ ...r.e, lotCode: r.lotCode, actorName: r.actorName })));
});

router.get("/admin/scans", async (req, res) => {
  const q = parse(ListQrScansQueryParams, req.query);
  const rows = await db
    .select({ s: qrScanEventsTable, lotCode: lotsTable.lotCode, qrVersion: qrCodesTable.version })
    .from(qrScanEventsTable)
    .leftJoin(lotsTable, eq(lotsTable.id, qrScanEventsTable.lotId))
    .leftJoin(qrCodesTable, eq(qrCodesTable.id, qrScanEventsTable.qrId))
    .orderBy(desc(qrScanEventsTable.scannedAt))
    .limit(q.limit ?? 200);
  res.json(
    rows.map(({ s, lotCode, qrVersion }) => ({
      id: s.id,
      lotId: s.lotId,
      lotCode,
      qrVersion,
      scannedAt: s.scannedAt.toISOString(),
      scanSource: s.scanSource,
      result: s.result,
      deviceType: s.deviceType,
      signedIn: !!s.userId,
    })),
  );
});

router.get("/admin/integrations", async (_req, res) => {
  res.json(await allSourceStatuses());
});

router.post("/admin/integrations/:source/run", async (req, res) => {
  const { source } = parse(RunIntegrationParams, req.params);
  if (!AUTOMATED_SOURCES.includes(source as SourceKey)) throw badRequest("This source is reference-only and has no automated run");
  const run = await runSource(source as SourceKey);
  await audit(db, actorOf(req), "INTEGRATION_RUN", "integration", null, null, { source, status: run.status, runId: run.id });
  res.json(serializeRun(run));
});

export default router;
