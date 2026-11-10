import { desc, eq, sql } from "drizzle-orm";

import type { Database } from "@/lib/db/client";
import { type NewPhotoRow, type PhotoRow, photos, places } from "@/lib/db/schema";

export interface LibraryPhoto {
  photo: PhotoRow;
  placeTitle: string | null;
  placeId: string | null;
}

export async function insertPhoto(db: Database, values: NewPhotoRow): Promise<PhotoRow> {
  const [row] = await db.insert(photos).values(values).returning();
  if (!row) throw new Error("Insert returned no row");
  return row;
}

export async function countPhotos(db: Database): Promise<number> {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(photos);
  return row?.count ?? 0;
}

export async function findPhotoById(db: Database, id: string): Promise<PhotoRow | null> {
  const [row] = await db.select().from(photos).where(eq(photos.id, id)).limit(1);
  return row ?? null;
}

export async function listLibraryPhotos(db: Database): Promise<LibraryPhoto[]> {
  const rows = await db
    .select({ photo: photos, placeTitle: places.title, placeId: places.id })
    .from(photos)
    .leftJoin(places, eq(photos.placeId, places.id))
    .orderBy(desc(photos.createdAt));
  return rows;
}

export async function deletePhotoRow(db: Database, id: string): Promise<boolean> {
  const rows = await db.delete(photos).where(eq(photos.id, id)).returning({ id: photos.id });
  return rows.length > 0;
}
