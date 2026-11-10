/** Applies every pending SQL migration in ./drizzle to DATABASE_URL. Run: npm run db:migrate */
import path from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
    process.exit(1);
  }

  const client = postgres(url, { max: 1, prepare: false, connect_timeout: 10 });
  try {
    await migrate(drizzle({ client }), { migrationsFolder: path.resolve("drizzle") });
    console.log("✓ Migrations applied.");
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
