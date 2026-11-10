import "server-only";

import path from "node:path";

import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getDatabaseConfig, getDemoConfig } from "@/lib/config";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import { createEmbeddedDatabase } from "./embedded";
import * as schema from "./schema";
import { seedDemoContent } from "./seed-demo";

/** Driver-agnostic Drizzle handle: works for postgres.js (production) and PGlite (dev/test). */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

declare global {
  // One database per Node process, shared across Next.js bundles and hot reloads.
  var __oopsDatabase: Promise<Database> | undefined;
}

export function getDb(): Promise<Database> {
  if (!globalThis.__oopsDatabase) {
    const pending = createDatabase();
    // If startup fails (bad URL, missing config) don't cache the failure forever.
    pending.catch(() => {
      if (globalThis.__oopsDatabase === pending) globalThis.__oopsDatabase = undefined;
    });
    globalThis.__oopsDatabase = pending;
  }
  return globalThis.__oopsDatabase;
}

async function createDatabase(): Promise<Database> {
  const config = getDatabaseConfig();

  if (config.url) {
    // `prepare: false` keeps this compatible with transaction-mode poolers (PgBouncer, Supavisor).
    const client = postgres(config.url, {
      max: process.env.NODE_ENV === "production" ? 5 : 3,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    return drizzle({ client, schema }) as unknown as Database;
  }

  if (!config.allowEmbedded) {
    throw new ConfigError(
      "DATABASE_URL is not set. Provide a PostgreSQL connection string (see .env.example).",
    );
  }

  // During `next build` several worker processes render pages in parallel, and the embedded
  // engine allows only one process per data directory — so builds use a private in-memory copy.
  const isBuild = process.env.NEXT_PHASE === "phase-production-build";
  const dataDir = isBuild || !config.embeddedDir ? undefined : path.resolve(config.embeddedDir);

  const db = await createEmbeddedDatabase({ dataDir });
  logger.info("Using embedded development database", { persistent: Boolean(dataDir) });

  if (getDemoConfig().show) await seedDemoContent(db);
  return db;
}
