import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import type { Database } from "../../src/lib/db/client";
import * as schema from "../../src/lib/db/schema";

/** Opens a Drizzle connection for CLI scripts (no Next.js, no `server-only`). */
export function connect(): { db: Database; close: () => Promise<void> } {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
    process.exit(1);
  }
  const client = postgres(url, { max: 1, prepare: false, connect_timeout: 10 });
  return { db: drizzle({ client, schema }) as unknown as Database, close: () => client.end() };
}
