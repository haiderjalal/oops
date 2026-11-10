import { and, asc, desc, eq, ne, sql } from "drizzle-orm";

import type { Database } from "@/lib/db/client";
import { type NewTripRow, type TripRow, places, trips } from "@/lib/db/schema";

export interface TripWithCount extends TripRow {
  placeCount: number;
}

export async function findPublishedTrips(
  db: Database,
  options: { includeDemo: boolean },
): Promise<TripRow[]> {
  return db
    .select()
    .from(trips)
    .where(
      and(eq(trips.status, "published"), options.includeDemo ? undefined : eq(trips.isDemo, false)),
    )
    .orderBy(sql`${trips.startDate} desc nulls last`, asc(trips.title));
}

export async function listTripsForAdmin(db: Database): Promise<TripWithCount[]> {
  return db
    .select({
      id: trips.id,
      slug: trips.slug,
      title: trips.title,
      startDate: trips.startDate,
      endDate: trips.endDate,
      description: trips.description,
      status: trips.status,
      isDemo: trips.isDemo,
      createdAt: trips.createdAt,
      updatedAt: trips.updatedAt,
      placeCount: sql<number>`(select count(*)::int from ${places} where ${places.tripId} = ${trips.id} and ${places.deletedAt} is null)`,
    })
    .from(trips)
    .orderBy(desc(trips.startDate), asc(trips.title));
}

export async function findTripById(db: Database, id: string): Promise<TripRow | null> {
  const [row] = await db.select().from(trips).where(eq(trips.id, id)).limit(1);
  return row ?? null;
}

export async function isTripSlugTaken(
  db: Database,
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: trips.id })
    .from(trips)
    .where(excludeId ? and(eq(trips.slug, slug), ne(trips.id, excludeId)) : eq(trips.slug, slug))
    .limit(1);
  return Boolean(row);
}

export async function insertTrip(db: Database, values: NewTripRow): Promise<TripRow> {
  const [row] = await db.insert(trips).values(values).returning();
  if (!row) throw new Error("Insert returned no row");
  return row;
}

export async function updateTripRow(
  db: Database,
  id: string,
  values: Partial<NewTripRow>,
): Promise<TripRow | null> {
  const [row] = await db.update(trips).set(values).where(eq(trips.id, id)).returning();
  return row ?? null;
}

/** Places keep existing (trip_id is set NULL by the foreign key). */
export async function deleteTripRow(db: Database, id: string): Promise<boolean> {
  const rows = await db.delete(trips).where(eq(trips.id, id)).returning({ id: trips.id });
  return rows.length > 0;
}
