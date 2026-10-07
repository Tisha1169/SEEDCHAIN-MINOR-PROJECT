import "dotenv/config";

import { pool } from "@workspace/db";
import { runMigrations } from "@workspace/db/migrate";
import app from "./app";
import { assertProductionConfig, config } from "./config";
import { logger } from "./lib/logger";
import { startRealtime, stopRealtime } from "./services/realtime";
import { syncRegistry } from "./services/external/registry";
import { startScheduler, stopScheduler } from "./services/scheduler";

async function main() {
  assertProductionConfig();
  if (config.runMigrationsOnStart) {
    await runMigrations(pool, (m) => logger.info(m));
  }
  await syncRegistry();
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, traceBase: config.publicTraceBaseUrl }, "Server listening");
  });
  await startRealtime();
  startScheduler();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down");
    stopScheduler();
    await stopRealtime();
    server.close(() => {
      void pool.end().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  logger.fatal({ err }, "Startup failed");
  process.exit(1);
});
