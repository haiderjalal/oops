import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const fromRoot = (relativePath: string): string =>
  fileURLToPath(new URL(relativePath, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fromRoot("./src"),
      // `server-only` throws outside React Server Components; tests run in plain Node.
      "server-only": fromRoot("./src/tests/stubs/server-only.ts"),
    },
  },
  test: {
    include: ["src/tests/unit/**/*.test.{ts,tsx}", "src/tests/integration/**/*.test.{ts,tsx}"],
    environment: "node",
    setupFiles: ["src/tests/setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // PGlite integration tests each boot an in-memory Postgres; keep them isolated.
    pool: "forks",
  },
});
