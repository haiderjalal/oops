/**
 * Inserts the synthetic DEMO places, trips and bucket-list items into DATABASE_URL.
 * Everything is flagged is_demo=true and can be removed with `npm run db:purge-demo`.
 * Run: npm run db:seed   (add --force to insert again after a purge)
 */
import { seedDemoContent } from "../src/lib/db/seed-demo";

import { connect } from "./lib/db";

async function main(): Promise<void> {
  const { db, close } = connect();
  try {
    const inserted = await seedDemoContent(db, { force: process.argv.includes("--force") });
    console.log(
      inserted
        ? "✓ Demo content inserted (flagged as demo)."
        : "Demo content was already seeded. Use --force to insert it again.",
    );
  } finally {
    await close();
  }
}

main().catch((error: unknown) => {
  console.error("Seeding failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
