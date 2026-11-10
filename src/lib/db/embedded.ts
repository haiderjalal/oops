import { mkdir } from "node:fs/promises";
import path from "node:path";

import type { PGlite as PGliteClass } from "@electric-sql/pglite";

import { ConfigError } from "@/lib/errors";

import type { Database } from "./client";
import * as schema from "./schema";

/**
 * Embedded PostgreSQL (PGlite, real Postgres compiled to WASM) for zero-config local
 * development, tests and the production build step. It is NOT a production database:
 * it has a single connection and its files live on the local disk.
 */
export interface EmbeddedOptions {
  /** Directory for persistent data, or `undefined` for a throw-away in-memory database. */
  dataDir?: string;
  /** Folder holding the generated SQL migrations. */
  migrationsFolder?: string;
}

export async function createEmbeddedDatabase(options: EmbeddedOptions = {}): Promise<Database> {
  let PGlite: typeof PGliteClass;
  try {
    ({ PGlite } = await import("@electric-sql/pglite"));
  } catch {
    throw new ConfigError(
      "The embedded database is not installed. Set DATABASE_URL to a PostgreSQL connection string.",
    );
  }
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");

  if (options.dataDir) await mkdir(options.dataDir, { recursive: true });

  const client = new PGlite(options.dataDir);
  const db = drizzle({ client, schema });
  await migrate(db, {
    migrationsFolder: options.migrationsFolder ?? path.join(process.cwd(), "drizzle"),
  });
  return db as unknown as Database;
}
