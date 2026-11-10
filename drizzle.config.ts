import { defineConfig } from "drizzle-kit";

// `drizzle-kit generate` only needs the schema + output folder (no live database).
// Migrations are applied by scripts/migrate.ts so the same code path serves
// Postgres (production) and PGlite (local development and tests).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  strict: true,
  verbose: true,
});
