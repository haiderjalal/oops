import { and, asc, desc, eq, inArray, isNotNull, isNull, ne, notInArray, sql } from "drizzle-orm";

import type { Database } from "@/lib/db/client";
import {
  type NewPlaceRow,
  type PhotoRow,
  type PlaceRow,
  photos,
  placeTags,
  places,
  tags,
  trips,
} from "@/lib/db/schema";
import { slugify } from "@/utils/slug";

/**
 * SQL for places. Nothing here decides *what should happen* (that is service.ts) or how data
 * is presented (mappers.ts) — it only reads and writes rows.
 */

export interface PlaceRecord {
  place: PlaceRow;
  trip: { slug: string; title: string } | null;
  cover: PhotoRow | null;
  tags: string[];
}

export interface PlaceDetailRecord extends PlaceRecord {
  photos: PhotoRow[];
}

export interface AdminPlaceRow {
  id: string;
  slug: string;
  title: string;
  type: PlaceRow["type"];
  status: PlaceRow["status"];
  visitedAt: string | null;
  city: string | null;
  countryCode: string | null;
  countryName: string | null;
  isDemo: boolean;
  photoCount: number;
  publishedAt: Date | null;
  updatedAt: Date;
  deletedAt: Date | null;
}

/** The single definition of "visible to the public": published, scheduled time reached, not deleted. */
function publiclyVisible(includeDemo: boolean) {
  return and(
    eq(places.status, "published"),
    isNull(places.deletedAt),
    sql`${places.publishedAt} <= now()`,
    includeDemo ? undefined : eq(places.isDemo, false),
  );
}

interface JoinedRow {
  place: PlaceRow;
  tripSlug: string | null;
  tripTitle: string | null;
}

/** Attach covers and tags with two extra queries total (no N+1). */
async function hydrate(db: Database, rows: JoinedRow[]): Promise<PlaceRecord[]> {
  if (rows.length === 0) return [];

  const placeIds = rows.map((row) => row.place.id);
  const coverIds = rows.flatMap((row) => (row.place.coverPhotoId ? [row.place.coverPhotoId] : []));

  const [coverRows, tagRows] = await Promise.all([
    coverIds.length > 0
      ? db.select().from(photos).where(inArray(photos.id, coverIds))
      : Promise.resolve([]),
    db
      .select({ placeId: placeTags.placeId, name: tags.name })
      .from(placeTags)
      .innerJoin(tags, eq(placeTags.tagId, tags.id))
      .where(inArray(placeTags.placeId, placeIds))
      .orderBy(asc(tags.name)),
  ]);

  const coverById = new Map(coverRows.map((photo) => [photo.id, photo]));
  const tagsByPlace = new Map<string, string[]>();
  for (const { placeId, name } of tagRows) {
    tagsByPlace.set(placeId, [...(tagsByPlace.get(placeId) ?? []), name]);
  }

  return rows.map(({ place, tripSlug, tripTitle }) => ({
    place,
    trip: tripSlug && tripTitle ? { slug: tripSlug, title: tripTitle } : null,
    cover: place.coverPhotoId ? (coverById.get(place.coverPhotoId) ?? null) : null,
    tags: tagsByPlace.get(place.id) ?? [],
  }));
}

export async function findPublishedPlaces(
  db: Database,
  options: { includeDemo: boolean },
): Promise<PlaceRecord[]> {
  const rows = await db
    .select({ place: places, tripSlug: trips.slug, tripTitle: trips.title })
    .from(places)
    .leftJoin(trips, and(eq(places.tripId, trips.id), eq(trips.status, "published")))
    .where(publiclyVisible(options.includeDemo))
    .orderBy(sql`${places.visitedAt} desc nulls last`, desc(places.publishedAt));
  return hydrate(db, rows);
}

export async function findPublishedPlaceBySlug(
  db: Database,
  slug: string,
  options: { includeDemo: boolean },
): Promise<PlaceDetailRecord | null> {
  const rows = await db
    .select({ place: places, tripSlug: trips.slug, tripTitle: trips.title })
    .from(places)
    .leftJoin(trips, and(eq(places.tripId, trips.id), eq(trips.status, "published")))
    .where(and(publiclyVisible(options.includeDemo), eq(places.slug, slug)))
    .limit(1);

  const [record] = await hydrate(db, rows);
  if (!record) return null;

  const gallery = await db
    .select()
    .from(photos)
    .where(eq(photos.placeId, record.place.id))
    .orderBy(asc(photos.sortOrder), asc(photos.createdAt));
  return { ...record, photos: gallery };
}

/** Admin: any status, including soft-deleted. */
export async function findPlaceById(db: Database, id: string): Promise<PlaceDetailRecord | null> {
  const rows = await db
    .select({ place: places, tripSlug: trips.slug, tripTitle: trips.title })
    .from(places)
    .leftJoin(trips, eq(places.tripId, trips.id))
    .where(eq(places.id, id))
    .limit(1);

  const [record] = await hydrate(db, rows);
  if (!record) return null;

  const gallery = await db
    .select()
    .from(photos)
    .where(eq(photos.placeId, id))
    .orderBy(asc(photos.sortOrder), asc(photos.createdAt));
  return { ...record, photos: gallery };
}

export async function listPlacesForAdmin(
  db: Database,
  options: { includeDeleted: boolean },
): Promise<AdminPlaceRow[]> {
  const rows = await db
    .select({
      id: places.id,
      slug: places.slug,
      title: places.title,
      type: places.type,
      status: places.status,
      visitedAt: places.visitedAt,
      city: places.city,
      countryCode: places.countryCode,
      countryName: places.countryName,
      isDemo: places.isDemo,
      photoCount: sql<number>`(select count(*)::int from ${photos} where ${photos.placeId} = ${places.id})`,
      publishedAt: places.publishedAt,
      updatedAt: places.updatedAt,
      deletedAt: places.deletedAt,
    })
    .from(places)
    .where(options.includeDeleted ? undefined : isNull(places.deletedAt))
    .orderBy(desc(places.updatedAt));
  return rows;
}

export async function listPublishedSlugs(
  db: Database,
  options: { includeDemo: boolean },
): Promise<string[]> {
  const rows = await db
    .select({ slug: places.slug })
    .from(places)
    .where(publiclyVisible(options.includeDemo));
  return rows.map((row) => row.slug);
}

export async function isSlugTaken(
  db: Database,
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: places.id })
    .from(places)
    .where(excludeId ? and(eq(places.slug, slug), ne(places.id, excludeId)) : eq(places.slug, slug))
    .limit(1);
  return Boolean(row);
}

export async function insertPlace(db: Database, values: NewPlaceRow): Promise<PlaceRow> {
  const [row] = await db.insert(places).values(values).returning();
  if (!row) throw new Error("Insert returned no row");
  return row;
}

export async function updatePlaceRow(
  db: Database,
  id: string,
  values: Partial<NewPlaceRow>,
): Promise<PlaceRow | null> {
  const [row] = await db.update(places).set(values).where(eq(places.id, id)).returning();
  return row ?? null;
}

export async function setDeleted(db: Database, id: string, deleted: boolean): Promise<boolean> {
  const rows = await db
    .update(places)
    .set({ deletedAt: deleted ? new Date() : null })
    .where(eq(places.id, id))
    .returning({ id: places.id });
  return rows.length > 0;
}

/** Make a place's tag set exactly equal to `tagNames` (creating tags as needed). */
export async function replaceTags(
  db: Database,
  placeId: string,
  tagNames: string[],
): Promise<void> {
  const unique = new Map<string, string>();
  for (const name of tagNames) {
    const slug = slugify(name, "");
    if (slug && !unique.has(slug)) unique.set(slug, name.trim());
  }

  if (unique.size === 0) {
    await db.delete(placeTags).where(eq(placeTags.placeId, placeId));
    return;
  }

  await db
    .insert(tags)
    .values([...unique.entries()].map(([slug, name]) => ({ slug, name })))
    .onConflictDoNothing({ target: tags.slug });

  const tagRows = await db
    .select({ id: tags.id, slug: tags.slug })
    .from(tags)
    .where(inArray(tags.slug, [...unique.keys()]));
  const wantedIds = tagRows.map((row) => row.id);

  await db.delete(placeTags).where(eq(placeTags.placeId, placeId));
  await db.insert(placeTags).values(wantedIds.map((tagId) => ({ placeId, tagId })));
}

export interface PhotoAttachment {
  id: string;
  alt: string;
  caption: string | null;
}

/**
 * Make `items` (in order) the gallery of a place. Photos removed from the gallery go back to
 * the media library (place_id = NULL) rather than being destroyed.
 */
export async function syncPhotos(
  db: Database,
  placeId: string,
  items: PhotoAttachment[],
): Promise<void> {
  const keepIds = items.map((item) => item.id);

  await db
    .update(photos)
    .set({ placeId: null })
    .where(
      keepIds.length > 0
        ? and(eq(photos.placeId, placeId), notInArray(photos.id, keepIds))
        : eq(photos.placeId, placeId),
    );

  for (const [index, item] of items.entries()) {
    await db
      .update(photos)
      .set({ placeId, alt: item.alt, caption: item.caption, sortOrder: index })
      .where(eq(photos.id, item.id));
  }
}

/** Photos in `ids` that already belong to a *different* place (they cannot be reused). */
export async function photosAttachedElsewhere(
  db: Database,
  ids: string[],
  placeId?: string,
): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select({ id: photos.id })
    .from(photos)
    .where(
      and(
        inArray(photos.id, ids),
        isNotNull(photos.placeId),
        placeId ? ne(photos.placeId, placeId) : undefined,
      ),
    );
  return rows.map((row) => row.id);
}

/** Ids from `ids` that exist in the photos table (used to reject forged photo ids). */
export async function existingPhotoIds(db: Database, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await db.select({ id: photos.id }).from(photos).where(inArray(photos.id, ids));
  return new Set(rows.map((row) => row.id));
}
