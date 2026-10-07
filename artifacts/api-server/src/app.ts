import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import express, { type Express, type ErrorRequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import router from "./routes";
import { config } from "./config";
import { logger } from "./lib/logger";
import { loadUser } from "./lib/auth";
import { errorHandler, HttpError } from "./lib/errors";
import { apiLimiter } from "./lib/rate-limit";
import { isRealtimeHealthy } from "./services/realtime";
import { raiseAlert } from "./services/records";

const app: Express = express();
app.set("trust proxy", config.trustProxy === "true" ? true : /^\d+$/.test(config.trustProxy) ? Number(config.trustProxy) : config.trustProxy);
app.disable("x-powered-by");

app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const incoming = req.headers["x-request-id"];
      const id = typeof incoming === "string" && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
      res.setHeader("X-Request-Id", id);
      return id;
    },
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, url: req.url?.split("?")[0].replace(/\/trace\/[A-Za-z0-9_-]{20,}/g, "/trace/:token") }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
    // Public trace tokens are bearer-like identifiers; keep them out of logs.
    customProps: () => ({}),
    autoLogging: { ignore: (req) => req.url === "/health" || req.url === "/ready" },
  }),
);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:"],
        mediaSrc: ["'self'", "blob:"],
        connectSrc: ["'self'"],
        workerSrc: ["'self'", "blob:"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);
// The in-app QR scanner needs the camera on our own origin only.
app.use((_req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(self), geolocation=(self), microphone=()");
  next();
});

if (config.corsOrigins.length) {
  app.use("/api", cors({ origin: config.corsOrigins, credentials: true, allowedHeaders: ["content-type", "x-seedchain-csrf", "idempotency-key", "x-offline-replay", "x-request-id"] }));
}

app.use(cookieParser());
app.use(express.json({ limit: "100kb" }));

// CSRF defence for cookie sessions: state-changing API calls must carry a
// custom header, which cross-site HTML forms cannot add and cross-origin
// scripts cannot add without passing the CORS allow-list.
app.use("/api", (req, _res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (req.get("x-seedchain-csrf") !== "1") return next(new HttpError(403, "Missing CSRF header", "CSRF"));
  next();
});

app.use("/api", apiLimiter, loadUser, router);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptimeSeconds: Math.round(process.uptime()) });
});

app.get("/ready", async (_req, res) => {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};
  try {
    await db.execute(sql`SELECT 1`);
    checks.database = { ok: true };
    const m = await db.execute(sql`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`);
    checks.migrations = { ok: Number((m.rows[0] as { n: number }).n) > 0, detail: `${(m.rows[0] as { n: number }).n} applied` };
  } catch (err) {
    checks.database = { ok: false, detail: (err as Error).message };
  }
  checks.realtime = { ok: isRealtimeHealthy(), detail: isRealtimeHealthy() ? "LISTEN active" : "degraded: clients poll" };
  const ready = checks.database.ok && (checks.migrations?.ok ?? false);
  res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not_ready", checks });
});

// Single-origin deployment: serve the built SPA so that QR URLs, cookies and
// the event stream share one HTTPS origin.
if (config.frontendDir && fs.existsSync(path.join(config.frontendDir, "index.html"))) {
  app.use(
    "/assets",
    express.static(path.join(config.frontendDir, "assets"), { immutable: true, maxAge: "1y", fallthrough: false }),
  );
  app.use(express.static(config.frontendDir, { index: false, maxAge: "1h" }));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(config.frontendDir, "index.html"));
  });
}

app.use("/api", (_req, _res, next) => next(new HttpError(404, "API route not found", "NOT_FOUND")));

/** Records attempted privilege violations on mutations as low-severity alerts. */
const unauthorizedActionAlert: ErrorRequestHandler = (err, req, _res, next) => {
  if (err instanceof HttpError && err.status === 403 && err.code === "FORBIDDEN" && req.user && req.method !== "GET") {
    void raiseAlert(db, {
      type: "UNAUTHORIZED_ACTION",
      severity: "LOW",
      message: `${req.user.role} attempted ${req.method} ${req.baseUrl}${req.path}`,
      entityType: "user",
      entityId: req.user.id,
      dedupeKey: `UNAUTHORIZED_ACTION:${req.user.id}:${new Date().toISOString().slice(0, 13)}`,
    }).catch(() => undefined);
  }
  next(err);
};

app.use(unauthorizedActionAlert);
app.use(errorHandler);

export default app;
