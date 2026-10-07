import path from "node:path";
/**
 * Centralised, validated runtime configuration. Production refuses to start
 * with insecure defaults.
 */

const env = process.env;
const isProduction = env.NODE_ENV === "production";
const isTest = env.NODE_ENV === "test";

function list(v: string | undefined): string[] {
  return (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function num(v: string | undefined, def: number): number {
  const n = Number(v);
  return Number.isFinite(n) && v !== undefined && v !== "" ? n : def;
}

const authSecret = env.AUTH_SECRET ?? (isProduction ? "" : "dev-only-insecure-auth-secret-change-me-0000");
const publicTraceBaseUrl = (env.PUBLIC_TRACE_BASE_URL ?? (isProduction ? "" : "http://localhost:5173")).replace(/\/+$/, "");

export const config = {
  isProduction,
  isTest,
  port: num(env.PORT, 8080),
  authSecret,
  /** Session lifetime. Sessions are revocable server-side (logout). */
  sessionTtlHours: num(env.SESSION_TTL_HOURS, 72),
  cookieName: "sc_session",
  cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === "true" : isProduction,
  /** Base used inside QR images: <base>/trace/<token>. Must be the HTTPS frontend origin in production. */
  publicTraceBaseUrl,
  /** Browser origins allowed to call the API with credentials (only needed if the SPA is on another origin). */
  corsOrigins: list(env.CORS_ORIGINS),
  trustProxy: env.TRUST_PROXY ?? (isProduction ? "1" : "loopback"),
  /** Directory containing the built SPA; when set, the API serves it (single-origin deployment). */
  frontendDir: env.FRONTEND_DIST_DIR ? path.resolve(env.FRONTEND_DIST_DIR) : "",
  runMigrationsOnStart: env.RUN_MIGRATIONS_ON_START === "true",
  legacySessionSecret: env.LEGACY_SESSION_SECRET ?? env.SESSION_SECRET ?? "",
  ingestion: {
    enabled: env.INGESTION_ENABLED ? env.INGESTION_ENABLED === "true" : !isTest,
    marketIntervalMinutes: num(env.MARKET_INGEST_INTERVAL_MINUTES, 360),
    weatherIntervalMinutes: num(env.WEATHER_INGEST_INTERVAL_MINUTES, 60),
    dataGovApiKey: env.DATA_GOV_IN_API_KEY ?? "",
    dataGovResourceId: env.DATA_GOV_IN_RESOURCE_ID ?? "9ef84268-d588-465a-a308-a864a43d0070",
    dataGovBaseUrl: (env.DATA_GOV_IN_BASE_URL ?? "https://api.data.gov.in").replace(/\/+$/, ""),
    marketCommodity: env.MARKET_COMMODITY ?? "Potato",
    marketState: env.MARKET_STATE ?? "Punjab",
    openMeteoBaseUrl: (env.OPEN_METEO_BASE_URL ?? "https://api.open-meteo.com").replace(/\/+$/, ""),
    httpTimeoutMs: num(env.EXTERNAL_HTTP_TIMEOUT_MS, 20000),
  },
  rateLimits: {
    apiPerMinute: num(env.RATE_LIMIT_API_PER_MINUTE, 300),
    publicTracePerMinute: num(env.RATE_LIMIT_TRACE_PER_MINUTE, 60),
    authPer15Minutes: num(env.RATE_LIMIT_AUTH_PER_15_MINUTES, 20),
  },
};

export function assertProductionConfig(): void {
  if (!config.isProduction) return;
  const problems: string[] = [];
  if (config.authSecret.length < 32) problems.push("AUTH_SECRET must be set to at least 32 random characters");
  const localHttp = process.env.ALLOW_INSECURE_LOCAL === "true";
  if (!/^https:\/\//.test(config.publicTraceBaseUrl) && !localHttp) problems.push("PUBLIC_TRACE_BASE_URL must be an https:// URL");
  if (!config.cookieSecure && !localHttp) problems.push("COOKIE_SECURE must not be false in production");
  if (problems.length) throw new Error(`Invalid production configuration:\n- ${problems.join("\n- ")}`);
}
