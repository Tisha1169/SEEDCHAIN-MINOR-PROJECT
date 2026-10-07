import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://seedchain:seedchain@localhost:55432/seedchain_test";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./test/global-setup.ts"],
    // Integration suites share one database; run files sequentially.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
      AUTH_SECRET: "test-secret-test-secret-test-secret-0123456789",
      PUBLIC_TRACE_BASE_URL: "https://seedchain.test",
      INGESTION_ENABLED: "false",
      RATE_LIMIT_TRACE_PER_MINUTE: "1000",
      RATE_LIMIT_AUTH_PER_15_MINUTES: "1000",
      RATE_LIMIT_API_PER_MINUTE: "100000",
      LOG_LEVEL: "silent",
      LEGACY_SESSION_SECRET: "legacy-secret",
    },
  },
});
