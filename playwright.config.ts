import { defineConfig, devices } from "@playwright/test";

import { hashPasswordSync } from "./src/lib/auth/password";
import { E2E_OWNER } from "./src/tests/e2e/fixtures";

/**
 * End-to-end tests run against a real production build (`next build && next start`) with an
 * in-memory embedded PostgreSQL, local file storage and the offline atlas/gazetteer — so they need
 * no accounts, keys or network. Test-only credentials live in src/tests/e2e/fixtures.ts.
 *
 * Browser: uses the Microsoft Edge already on Windows/macOS by default (no download). In CI, set
 * E2E_CHANNEL= (empty) to use Playwright's own Chromium after `npx playwright install chromium`.
 */
const PORT = 3100;
const channel =
  process.env.E2E_CHANNEL === undefined ? "msedge" : process.env.E2E_CHANNEL || undefined;

export default defineConfig({
  testDir: "./src/tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // tests share one in-memory database
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Desktop Chrome"],
    ...(channel ? { channel } : {}),
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "e2e", testIgnore: /auth\.setup\.ts/, dependencies: ["setup"] },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    timeout: 360_000,
    reuseExistingServer: !process.env.CI,
    env: {
      SITE_URL: `http://localhost:${PORT}`,
      ALLOW_LOCAL_SERVICES: "true",
      EMBEDDED_DB_DIR: "memory",
      SHOW_DEMO_CONTENT: "true",
      STORAGE_DRIVER: "local",
      LOCAL_STORAGE_DIR: ".data/e2e-uploads",
      AUTH_SECRET: E2E_OWNER.authSecret,
      OWNER_EMAIL: E2E_OWNER.email,
      OWNER_PASSWORD_HASH: hashPasswordSync(E2E_OWNER.password),
      OWNER_TOTP_SECRET: E2E_OWNER.totpSecret,
      OWNER_NAME: "Test Traveler",
    },
  },
});
