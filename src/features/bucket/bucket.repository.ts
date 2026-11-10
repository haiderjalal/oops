import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import type { Database } from "@/lib/db/client";
import {
  type BucketListItemRow,
  type NewBucketListItemRow,
  bucketListItems,
  places,
} from "@/lib/db/schema";

export interface BucketRecord {
  item: BucketListItemRow;
  /** Present only when the linked place is published, live and not deleted. */
  linkedPlace: { slug: string; title: string } | null;
}

export async function findBucketItems(
  db: Database,
  options: { includeDemo: boolean },
): Promise<BucketRecord[]> {
  const rows = await db
    .select({ item: bucketListItems, slug: places.slug, title: places.title })
    .from(bucketListItems)
    .leftJoin(
      places,
      and(
        eq(bucketListItems.linkedPlaceId, places.id),
        eq(places.status, "published"),
        isNull(places.deletedAt),
        sql`${places.publishedAt} <= now()`,
      ),
    )
    .where(options.includeDemo ? undefined : eq(bucketListItems.isDemo, false))
    .orderBy(asc(bucketListItems.status), desc(bucketListItems.createdAt));

  return rows.map((row) => ({
    item: row.item,
    linkedPlace: row.slug && row.title ? { slug: row.slug, title: row.title } : null,
  }));
}

export async function findBucketItemById(
  db: Database,
  id: string,
): Promise<BucketListItemRow | null> {
  const [row] = await db.select().from(bucketListItems).where(eq(bucketListItems.id, id)).limit(1);
  return row ?? null;
}

export async function insertBucketItem(
  db: Database,
  values: NewBucketListItemRow,
): Promise<BucketListItemRow> {
  const [row] = await db.insert(bucketListItems).values(values).returning();
  if (!row) throw new Error("Insert returned no row");
  return row;
}

export async function updateBucketItemRow(
  db: Database,
  id: string,
  values: Partial<NewBucketListItemRow>,
): Promise<BucketListItemRow | null> {
  const [row] = await db
    .update(bucketListItems)
    .set(values)
    .where(eq(bucketListItems.id, id))
    .returning();
  return row ?? null;
}

export async function deleteBucketItemRow(db: Database, id: string): Promise<boolean> {
  const rows = await db
    .delete(bucketListItems)
    .where(eq(bucketListItems.id, id))
    .returning({ id: bucketListItems.id });
  return rows.length > 0;
}
