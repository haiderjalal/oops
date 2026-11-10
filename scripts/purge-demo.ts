/** Permanently deletes every demo (is_demo=true) row. Real content is never touched. Run: npm run db:purge-demo */
import { purgeDemoContent } from "../src/lib/db/seed-demo";

import { connect } from "./lib/db";

async function main(): Promise<void> {
  const { db, close } = connect();
  try {
    const removed = await purgeDemoContent(db);
    console.log(
      `✓ Removed ${removed.places} places, ${removed.trips} trips and ${removed.bucketItems} bucket-list items of demo content.`,
    );
  } finally {
    await close();
  }
}

main().catch((error: unknown) => {
  console.error("Purge failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
