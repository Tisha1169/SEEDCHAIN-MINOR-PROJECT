import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db, lotsTable, qrAnomaliesTable, qrCodesTable, qrScanEventsTable, usersTable, type DbOrTx, type Lot, type QrCode, type User } from "@workspace/db";
import { conflict, notFound } from "../lib/errors";
import { ANOMALY_THRESHOLDS, detectTravelAnomaly, isSessionBurst } from "../domain/anomaly";
import { appendEvent, audit, raiseAlert, type Actor } from "./records";
import { notify, notifyAdmins } from "./notifications";
import { notifyChange } from "./realtime";
import { serializeQr } from "./lots";

/**
 * QR operations: anomaly signals, admin disable/enable, scan analytics.
 * Anomalies are *potential* signals for a human; nothing here accuses anyone.
 */

export interface ScanForDetection {
  scanId: string;
  at: Date;
  sessionId?: string | null;
  lat?: number | null;
  lon?: number | null;
}

async function flag(tx: DbOrTx, qr: QrCode, lot: Lot, kind: string, detail: Record<string, unknown>) {
  const [row] = await tx.insert(qrAnomaliesTable).values({ qrId: qr.id, lotId: lot.id, kind, detail }).onConflictDoNothing().returning();
  if (!row) return null; // an open anomaly of this kind already exists for this QR
  await appendEvent(tx, { user: null, source: "anomaly_detector" }, { lotId: lot.id, eventType: "QR_ANOMALY_FLAGGED", isPublic: false, reason: `Potential QR anomaly: ${kind}`, metadata: { anomalyId: row.id, qrId: qr.id, kind, ...detail } });
  await raiseAlert(tx, {
    type: "QR_ANOMALY",
    severity: kind === "IMPOSSIBLE_TRAVEL" ? "HIGH" : "MEDIUM",
    message: `${lot.lotCode}: potential QR anomaly (${kind}). A human should investigate before any action.`,
    entityType: "lot",
    entityId: lot.id,
    metadata: { anomalyId: row.id, kind, ...detail },
    dedupeKey: `QR_ANOMALY:${row.id}`,
  });
  await notifyAdmins(tx, { type: "QR_ANOMALY", params: { lotCode: lot.lotCode, kind }, entityType: "lot", entityId: lot.id });
  await notifyChange(tx, { topic: "anomalies", lotId: lot.id, adminOnly: true });
  return row;
}

/** Runs after every successful (OK) scan, inside the scan transaction. */
export async function detectAnomalies(tx: DbOrTx, qr: QrCode, lot: Lot, scan: ScanForDetection): Promise<void> {
  const T = ANOMALY_THRESHOLDS;
  const since = new Date(scan.at.getTime() - T.burstWindowMinutes * 60_000);
  const [{ sessions, total }] = await tx
    .select({ sessions: sql<number>`count(distinct coalesce(${qrScanEventsTable.sessionId}, ${qrScanEventsTable.id}::text))::int`, total: sql<number>`count(*)::int` })
    .from(qrScanEventsTable)
    .where(and(eq(qrScanEventsTable.qrId, qr.id), eq(qrScanEventsTable.result, "OK"), gte(qrScanEventsTable.scannedAt, since)));
  if (isSessionBurst(sessions) || total >= 60) {
    await flag(tx, qr, lot, "SCAN_BURST", { distinctScanners: sessions, scans: total, windowMinutes: T.burstWindowMinutes });
  }
  if (scan.lat != null && scan.lon != null) {
    const prev = await tx
      .select({ at: qrScanEventsTable.scannedAt, lat: qrScanEventsTable.approxLat, lon: qrScanEventsTable.approxLon })
      .from(qrScanEventsTable)
      .where(
        and(
          eq(qrScanEventsTable.qrId, qr.id),
          eq(qrScanEventsTable.result, "OK"),
          sql`${qrScanEventsTable.approxLat} IS NOT NULL`,
          gte(qrScanEventsTable.scannedAt, new Date(scan.at.getTime() - T.lookbackHours * 3_600_000)),
          sql`${qrScanEventsTable.id} <> ${scan.scanId}`,
        ),
      )
      .orderBy(desc(qrScanEventsTable.scannedAt))
      .limit(50);
    const signal = detectTravelAnomaly(
      prev.map((p) => ({ at: p.at, lat: p.lat!, lon: p.lon! })),
      { at: scan.at, lat: scan.lat, lon: scan.lon },
    );
    if (signal) await flag(tx, qr, lot, signal.kind, { ...signal });
  }
}

export async function listAnomalies(status?: string) {
  const rows = await db
    .select({ a: qrAnomaliesTable, lotCode: lotsTable.lotCode, qrStatus: qrCodesTable.status, qrVersion: qrCodesTable.version, handler: usersTable.name })
    .from(qrAnomaliesTable)
    .innerJoin(lotsTable, eq(lotsTable.id, qrAnomaliesTable.lotId))
    .innerJoin(qrCodesTable, eq(qrCodesTable.id, qrAnomaliesTable.qrId))
    .leftJoin(usersTable, eq(usersTable.id, qrAnomaliesTable.handledBy))
    .where(status ? eq(qrAnomaliesTable.status, status as "OPEN") : undefined)
    .orderBy(desc(qrAnomaliesTable.detectedAt))
    .limit(200);
  return rows.map(({ a, lotCode, qrStatus, qrVersion, handler }) => ({
    id: a.id,
    qrId: a.qrId,
    lotId: a.lotId,
    lotCode,
    qrVersion,
    qrStatus,
    kind: a.kind,
    status: a.status,
    detail: a.detail,
    detectedAt: a.detectedAt.toISOString(),
    handledBy: handler,
    handledAt: a.handledAt?.toISOString() ?? null,
    note: a.note,
  }));
}

const ANOMALY_NEXT: Record<string, "INVESTIGATING" | "DISMISSED" | "CONFIRMED"> = { investigate: "INVESTIGATING", dismiss: "DISMISSED", confirm: "CONFIRMED" };

export async function handleAnomaly(actor: Actor & { user: User }, id: string, action: "investigate" | "dismiss" | "confirm", note?: string) {
  const to = ANOMALY_NEXT[action];
  await db.transaction(async (tx) => {
    const [a] = await tx.select().from(qrAnomaliesTable).where(eq(qrAnomaliesTable.id, id)).for("update");
    if (!a) throw notFound("Anomaly not found");
    if (a.status === "DISMISSED" || a.status === "CONFIRMED") throw conflict(`Anomaly is already ${a.status}`, "INVALID_STATE_TRANSITION");
    if (action === "investigate" && a.status === "INVESTIGATING") throw conflict("Already under investigation", "INVALID_STATE_TRANSITION");
    if (action !== "investigate" && !note?.trim()) throw conflict("A note is required to close an anomaly", "REASON_REQUIRED");
    await tx.update(qrAnomaliesTable).set({ status: to, handledBy: actor.user.id, handledAt: new Date(), note: note ?? a.note }).where(eq(qrAnomaliesTable.id, id));
    await audit(tx, actor, `QR_ANOMALY_${action.toUpperCase()}`, "qr_anomaly", id, { status: a.status }, { status: to, note: note ?? null });
    if (to !== "INVESTIGATING") {
      await tx.execute(sql`UPDATE alerts SET resolved_at = now(), resolved_by = ${actor.user.id} WHERE dedupe_key = ${`QR_ANOMALY:${id}`} AND resolved_at IS NULL`);
    }
    await notifyChange(tx, { topic: "anomalies", lotId: a.lotId, adminOnly: true });
  });
  return (await listAnomalies()).find((x) => x.id === id)!;
}

/** Admin: temporarily switch a QR off (reversible). The public page then shows "disabled for review" with no lot data. */
export async function disableQr(actor: Actor & { user: User }, qrId: string, reason: string, anomalyId?: string) {
  await db.transaction(async (tx) => {
    const [qr] = await tx.select().from(qrCodesTable).where(eq(qrCodesTable.id, qrId)).for("update");
    if (!qr) throw notFound("QR not found");
    if (qr.status !== "ACTIVE") throw conflict(`Only an ACTIVE QR can be disabled (this one is ${qr.status})`, "INVALID_STATE_TRANSITION");
    const [lot] = await tx.select().from(lotsTable).where(eq(lotsTable.id, qr.lotId)).for("update");
    await tx.update(qrCodesTable).set({ status: "DISABLED", revokeReason: reason }).where(eq(qrCodesTable.id, qrId));
    const ev = await appendEvent(tx, actor, { lotId: lot.id, eventType: "QR_DISABLED", reason, metadata: { qrId, qrVersion: qr.version, anomalyId: anomalyId ?? null } });
    await audit(tx, actor, "QR_DISABLED", "qr_code", qrId, { status: "ACTIVE" }, { status: "DISABLED", reason }, ev.id);
    await notify(tx, [lot.farmerId], { type: "QR_DISABLED", params: { lotCode: lot.lotCode }, entityType: "lot", entityId: lot.id });
    await notifyChange(tx, { topic: "lots", entityId: lot.id, lotId: lot.id, farmerId: lot.farmerId });
  });
  const [qr] = await db.select().from(qrCodesTable).where(eq(qrCodesTable.id, qrId));
  return serializeQr(qr);
}

export async function enableQr(actor: Actor & { user: User }, qrId: string, reason: string) {
  await db.transaction(async (tx) => {
    const [qr] = await tx.select().from(qrCodesTable).where(eq(qrCodesTable.id, qrId)).for("update");
    if (!qr) throw notFound("QR not found");
    if (qr.status !== "DISABLED") throw conflict(`Only a DISABLED QR can be re-enabled (this one is ${qr.status})`, "INVALID_STATE_TRANSITION");
    const [other] = await tx.select({ id: qrCodesTable.id }).from(qrCodesTable).where(and(eq(qrCodesTable.lotId, qr.lotId), eq(qrCodesTable.status, "ACTIVE")));
    if (other) throw conflict("Another QR is already active for this lot", "INVALID_STATE_TRANSITION");
    const [lot] = await tx.select().from(lotsTable).where(eq(lotsTable.id, qr.lotId)).for("update");
    await tx.update(qrCodesTable).set({ status: "ACTIVE", revokeReason: null }).where(eq(qrCodesTable.id, qrId));
    const ev = await appendEvent(tx, actor, { lotId: lot.id, eventType: "QR_ENABLED", reason, metadata: { qrId, qrVersion: qr.version } });
    await audit(tx, actor, "QR_ENABLED", "qr_code", qrId, { status: "DISABLED" }, { status: "ACTIVE", reason }, ev.id);
    await notify(tx, [lot.farmerId], { type: "QR_ENABLED", params: { lotCode: lot.lotCode }, entityType: "lot", entityId: lot.id });
    await notifyChange(tx, { topic: "lots", entityId: lot.id, lotId: lot.id, farmerId: lot.farmerId });
  });
  const [qr] = await db.select().from(qrCodesTable).where(eq(qrCodesTable.id, qrId));
  return serializeQr(qr);
}

/**
 * QR analytics. "Unique" counts distinct scanners per lot, where a scanner is a
 * random per-browser session id (or the signed-in user, or the single scan if
 * neither exists). "Repeat" = verified scans − unique scanners.
 */
export async function qrAnalytics(days = 14, farmerId?: string) {
  const since = new Date(Date.now() - days * 86_400_000);
  const scope = farmerId ? sql`AND l.farmer_id = ${farmerId}` : sql``;
  const visitor = sql`coalesce(s.session_id, s.user_id::text, s.id::text)`;
  const one = async (q: ReturnType<typeof sql>) => Number(((await db.execute(q)).rows[0] as Record<string, unknown>)?.v ?? 0);
  const [totalOk, failed, unique] = await Promise.all([
    one(sql`SELECT count(*) v FROM qr_scan_events s JOIN lots l ON l.id=s.lot_id WHERE s.result='OK' ${scope}`),
    one(sql`SELECT count(*) v FROM qr_scan_events s LEFT JOIN lots l ON l.id=s.lot_id WHERE s.result <> 'OK' ${farmerId ? sql`AND l.farmer_id = ${farmerId}` : sql``}`),
    one(sql`SELECT count(*) v FROM (SELECT DISTINCT s.lot_id, ${visitor} FROM qr_scan_events s JOIN lots l ON l.id=s.lot_id WHERE s.result='OK' ${scope}) x`),
  ]);
  const perLot = (
    await db.execute(sql`SELECT l.id, l.lot_code, count(*)::int AS scans, count(DISTINCT ${visitor})::int AS unique_scanners, max(s.scanned_at) AS last_scan
      FROM qr_scan_events s JOIN lots l ON l.id=s.lot_id WHERE s.result='OK' ${scope} GROUP BY l.id, l.lot_code ORDER BY scans DESC LIMIT 15`)
  ).rows as Array<{ id: string; lot_code: string; scans: number; unique_scanners: number; last_scan: Date }>;
  const overTime = (
    await db.execute(sql`SELECT to_char(d, 'YYYY-MM-DD') AS label, coalesce(c.ok,0)::int AS ok, coalesce(c.bad,0)::int AS failed
      FROM generate_series(date_trunc('day', ${since}::timestamptz), date_trunc('day', now()), interval '1 day') d
      LEFT JOIN (SELECT date_trunc('day', s.scanned_at) AS day, count(*) FILTER (WHERE s.result='OK') AS ok, count(*) FILTER (WHERE s.result<>'OK') AS bad
                 FROM qr_scan_events s LEFT JOIN lots l ON l.id=s.lot_id WHERE s.scanned_at >= ${since} ${farmerId ? sql`AND l.farmer_id = ${farmerId}` : sql``} GROUP BY 1) c ON c.day = d
      ORDER BY d`)
  ).rows as Array<{ label: string; ok: number; failed: number }>;
  const failedByResult = (
    await db.execute(sql`SELECT s.result AS label, count(*)::int AS value FROM qr_scan_events s LEFT JOIN lots l ON l.id=s.lot_id WHERE s.result <> 'OK' ${farmerId ? sql`AND l.farmer_id = ${farmerId}` : sql``} GROUP BY 1 ORDER BY 2 DESC`)
  ).rows as Array<{ label: string; value: number }>;
  const recent = (
    await db.execute(sql`SELECT s.id, s.scanned_at, s.result, s.scan_source, s.device_type, (s.user_id IS NOT NULL) AS signed_in, (s.approx_lat IS NOT NULL) AS shared_location, l.lot_code
      FROM qr_scan_events s LEFT JOIN lots l ON l.id=s.lot_id ${farmerId ? sql`WHERE l.farmer_id = ${farmerId}` : sql``} ORDER BY s.scanned_at DESC LIMIT 20`)
  ).rows as Array<{ id: string; scanned_at: Date; result: string; scan_source: string; device_type: string | null; signed_in: boolean; shared_location: boolean; lot_code: string | null }>;
  const verifyRate = totalOk + failed ? Math.round((totalOk / (totalOk + failed)) * 1000) / 10 : null;
  const openAnomalies = farmerId ? 0 : await one(sql`SELECT count(*) v FROM qr_anomalies WHERE status IN ('OPEN','INVESTIGATING')`);
  return {
    days,
    totalVerifiedScans: totalOk,
    uniqueScanners: unique,
    repeatScans: Math.max(0, totalOk - unique),
    failedScans: failed,
    verificationRatePct: verifyRate,
    openAnomalies,
    perLot: perLot.map((r) => ({ lotId: r.id, lotCode: r.lot_code, scans: r.scans, uniqueScanners: r.unique_scanners, lastScanAt: new Date(r.last_scan).toISOString() })),
    overTime,
    failedByResult,
    recent: recent.map((r) => ({ id: r.id, scannedAt: new Date(r.scanned_at).toISOString(), result: r.result, scanSource: r.scan_source, deviceType: r.device_type, signedIn: r.signed_in, sharedLocation: r.shared_location, lotCode: r.lot_code })),
    generatedAt: new Date().toISOString(),
  };
}

