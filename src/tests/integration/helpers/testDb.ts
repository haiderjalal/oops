import { createEmbeddedDatabase } from "@/lib/db/embedded";
import type { Database } from "@/lib/db/client";

/** A fresh, fully-migrated in-memory PostgreSQL (PGlite) for one test file. */
export async function createTestDatabase(): Promise<Database> {
  return createEmbeddedDatabase();
}
