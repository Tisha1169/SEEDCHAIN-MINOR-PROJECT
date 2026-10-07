import { Router } from "express";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { alertsTable, db, farmsTable, marketPriceObservationsTable, weatherObservationsTable, type Alert } from "@workspace/db";
import {
  AcknowledgeAlertParams,
  GetMarketPricesQueryParams,
  GetWeatherQueryParams,
  ListAlertsQueryParams,
} from "@workspace/api-zod";
import { requireRole } from "../lib/auth";
import { notFound } from "../lib/errors";
import { actorOf, parse } from "../lib/http";
import { adminOverview, customerOverview, farmerOverview } from "../services/dashboard";
import { integrationStatus } from "../services/external/ingestion";
import { audit } from "../services/records";
import { attachSseClient } from "../services/realtime";
import { config } from "../config";
import { isWellFormedToken } from "../domain/qr";
import { qrCodesTable } from "@workspace/db";

const router = Router();

// ------------------------------------------------------------------ dashboards
router.get("/dashboard/overview", requireRole(["admin"]), async (_req, res) => {
  res.json(await adminOverview());
});
router.get("/dashboard/farmer", requireRole(["farmer"], { active: false }), async (req, res) => {
  res.json(await farmerOverview(req.user!));
});
router.get("/dashboard/customer", requireRole(["customer"]), async (req, res) => {
  res.json(await customerOverview(req.user!));
});

// ------------------------------------------------------------------ alerts
function serializeAlert(a: Alert) {
  return {
    id: a.id,
    type: a.type,
    severity: a.severity,
    entityType: a.entityType,
    entityId: a.entityId,
    message: a.message,
    metadata: a.metadata,
    createdAt: a.createdAt.toISOString(),
    acknowledgedAt: a.acknowledgedAt?.toISOString() ?? null,
    acknowledgedBy: a.acknowledgedBy,
    resolvedAt: a.resolvedAt?.toISOString() ?? null,
  };
}

router.get("/alerts", requireRole(["admin", "farmer"], { active: false }), async (req, res) => {
  const q = parse(ListAlertsQueryParams, req.query);
  const conds = [];
  if (req.user!.role === "farmer") conds.push(eq(alertsTable.farmerId, req.user!.id));
  if (q.state !== "all") conds.push(isNull(alertsTable.resolvedAt));
  const rows = await db.select().from(alertsTable).where(conds.length ? and(...conds) : undefined).orderBy(desc(alertsTable.createdAt)).limit(300);
  res.json(rows.map(serializeAlert));
});

async function updateAlert(req: Parameters<Parameters<typeof router.post>[1]>[0], field: "acknowledged" | "resolved") {
  const { id } = parse(AcknowledgeAlertParams, req.params);
  const user = req.user!;
  const [a] = await db.select().from(alertsTable).where(eq(alertsTable.id, id));
  if (!a || (user.role === "farmer" && a.farmerId !== user.id)) throw notFound("Alert not found");
  const patch =
    field === "acknowledged"
      ? { acknowledgedAt: a.acknowledgedAt ?? new Date(), acknowledgedBy: a.acknowledgedBy ?? user.id }
      : { resolvedAt: a.resolvedAt ?? new Date(), resolvedBy: user.id, acknowledgedAt: a.acknowledgedAt ?? new Date(), acknowledgedBy: a.acknowledgedBy ?? user.id };
  const [u] = await db.update(alertsTable).set(patch).where(eq(alertsTable.id, id)).returning();
  await audit(db, actorOf(req), field === "acknowledged" ? "ALERT_ACKNOWLEDGED" : "ALERT_RESOLVED", "alert", id, null, { type: a.type });
  return serializeAlert(u);
}

router.post("/alerts/:id/acknowledge", requireRole(["admin", "farmer"], { active: false }), async (req, res) => {
  res.json(await updateAlert(req, "acknowledged"));
});
router.post("/alerts/:id/resolve", requireRole(["admin"]), async (req, res) => {
  res.json(await updateAlert(req, "resolved"));
});

// ------------------------------------------------------------------ external data (read from DB, never live-proxied)
router.get("/market-prices", requireRole(["admin", "farmer"], { active: false }), async (req, res) => {
  const q = parse(GetMarketPricesQueryParams, req.query);
  const days = q.days ?? 14;
  const rows = await db
    .select()
    .from(marketPriceObservationsTable)
    .where(
      and(
        sql`lower(${marketPriceObservationsTable.commodity}) = lower(${config.ingestion.marketCommodity})`,
        sql`${marketPriceObservationsTable.observationDate} >= current_date - ${days}::int`,
        q.state ? sql`lower(${marketPriceObservationsTable.state}) = lower(${q.state})` : undefined,
      ),
    )
    .orderBy(desc(marketPriceObservationsTable.observationDate), marketPriceObservationsTable.state, marketPriceObservationsTable.market)
    .limit(500);
  res.json({
    label: "External market information",
    observations: rows.map((r) => ({
      id: r.id,
      source: r.source,
      sourceEndpoint: r.sourceEndpoint,
      observationDate: r.observationDate,
      retrievedAt: r.retrievedAt.toISOString(),
      state: r.state,
      district: r.district,
      market: r.market,
      commodity: r.commodity,
      variety: r.variety || null,
      grade: r.grade || null,
      arrivalQuantityTonnes: r.arrivalQuantityTonnes == null ? null : Number(r.arrivalQuantityTonnes),
      minPrice: r.minPrice == null ? null : Number(r.minPrice),
      maxPrice: r.maxPrice == null ? null : Number(r.maxPrice),
      modalPrice: r.modalPrice == null ? null : Number(r.modalPrice),
      priceUnit: r.priceUnit,
    })),
    status: await integrationStatus("market_prices"),
  });
});

router.get("/weather", requireRole(["admin", "farmer"], { active: false }), async (req, res) => {
  const { farmId } = parse(GetWeatherQueryParams, req.query);
  const [farm] = await db.select().from(farmsTable).where(eq(farmsTable.id, farmId));
  if (!farm || (req.user!.role === "farmer" && farm.farmerId !== req.user!.id)) throw notFound("Farm not found");
  const [obs] = await db
    .select()
    .from(weatherObservationsTable)
    .where(eq(weatherObservationsTable.farmId, farmId))
    .orderBy(desc(weatherObservationsTable.observationTime))
    .limit(1);
  res.json({
    farmId,
    hasCoordinates: farm.latitude != null && farm.longitude != null,
    observation: obs
      ? {
          source: obs.source,
          sourceEndpoint: obs.sourceEndpoint,
          observationTime: obs.observationTime.toISOString(),
          retrievedAt: obs.retrievedAt.toISOString(),
          latitude: obs.latitude,
          longitude: obs.longitude,
          temperatureC: obs.temperatureC,
          precipitationMm: obs.precipitationMm,
          humidityPct: obs.humidityPct,
          weatherCode: obs.weatherCode,
          condition: obs.condition,
        }
      : null,
    status: await integrationStatus("weather"),
  });
});

// ------------------------------------------------------------------ real-time (Server-Sent Events)
/** Authenticated change stream; each user only receives notices about their own entities. */
router.get("/stream", (req, res) => {
  attachSseClient(res, { userId: req.user?.id ?? null, role: req.user?.role ?? null });
});

/** Public stream for one lot's trace page (keyed by public token). */
router.get("/stream/trace/:publicToken", async (req, res) => {
  const token = String(req.params.publicToken);
  if (!isWellFormedToken(token)) throw notFound();
  const [qr] = await db.select().from(qrCodesTable).where(and(eq(qrCodesTable.publicToken, token), eq(qrCodesTable.status, "ACTIVE")));
  if (!qr) throw notFound();
  attachSseClient(res, { userId: null, role: null, lotId: qr.lotId });
});

export default router;
