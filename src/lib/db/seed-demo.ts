import { and, eq, inArray } from "drizzle-orm";

import { slugify } from "@/utils/slug";

import type { Database } from "./client";
import { DEMO_NOTICE, demoBucketItems, demoPlaces, demoTrips } from "./demo-data";
import { bucketListItems, placeTags, places, siteSettings, tags, trips } from "./schema";

const SEEDED_KEY = "demo_content_seeded";

/**
 * Inserts the synthetic sample content (see demo-data.ts), every row flagged `is_demo`.
 *
 * Unless `force` is set it runs at most once per database: once seeded — even if the owner
 * later purges the demo entries — it never silently brings them back.
 */
export async function seedDemoContent(
  db: Database,
  options: { force?: boolean } = {},
): Promise<boolean> {
  if (!options.force) {
    const [flag] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, SEEDED_KEY))
      .limit(1);
    if (flag) return false;
  }

  await db.transaction(async (tx) => {
    const tripIds = new Map<string, string>();
    for (const trip of demoTrips) {
      const [row] = await tx
        .insert(trips)
        .values({
          slug: trip.slug,
          title: trip.title,
          startDate: trip.startDate,
          endDate: trip.endDate,
          description: trip.description,
          status: "published",
          isDemo: true,
        })
        .onConflictDoNothing({ target: trips.slug })
        .returning({ id: trips.id });
      const id =
        row?.id ??
        (await tx.select({ id: trips.id }).from(trips).where(eq(trips.slug, trip.slug)))[0]?.id;
      if (id) tripIds.set(trip.key, id);
    }

    const placeIds = new Map<string, string>();
    for (const place of demoPlaces) {
      const status = place.status ?? "published";
      const [row] = await tx
        .insert(places)
        .values({
          slug: place.slug,
          title: place.title,
          type: place.type,
          lat: place.lat,
          lng: place.lng,
          locationPrivacy: place.approximate ? "approximate" : "exact",
          geocoderProvider: "demo",
          placeName: place.placeName,
          formattedAddress: place.formattedAddress,
          city: place.city || null,
          region: place.region ?? null,
          countryCode: place.countryCode,
          countryName: place.countryName,
          visitedAt: place.visitedAt,
          excerpt: place.excerpt,
          story: `${DEMO_NOTICE}\n\n${place.story}`,
          funnyMoment: place.funnyMoment || null,
          rating: place.rating,
          status,
          tripId: place.tripKey ? (tripIds.get(place.tripKey) ?? null) : null,
          isDemo: true,
          publishedAt: status === "published" ? new Date(`${place.visitedAt}T12:00:00Z`) : null,
        })
        .onConflictDoNothing({ target: places.slug })
        .returning({ id: places.id });
      if (row) placeIds.set(place.slug, row.id);
    }

    const tagNames = [...new Set(demoPlaces.flatMap((place) => place.tags))];
    if (tagNames.length > 0) {
      await tx
        .insert(tags)
        .values(tagNames.map((name) => ({ slug: slugify(name), name })))
        .onConflictDoNothing({ target: tags.slug });
      const tagRows = await tx
        .select({ id: tags.id, slug: tags.slug })
        .from(tags)
        .where(
          inArray(
            tags.slug,
            tagNames.map((name) => slugify(name)),
          ),
        );
      const tagIdBySlug = new Map(tagRows.map((row) => [row.slug, row.id]));

      const links = demoPlaces.flatMap((place) => {
        const placeId = placeIds.get(place.slug);
        if (!placeId) return [];
        return place.tags.flatMap((name) => {
          const tagId = tagIdBySlug.get(slugify(name));
          return tagId ? [{ placeId, tagId }] : [];
        });
      });
      if (links.length > 0) await tx.insert(placeTags).values(links).onConflictDoNothing();
    }

    await tx.insert(bucketListItems).values(
      demoBucketItems.map((item) => ({
        placeName: item.placeName,
        lat: item.lat,
        lng: item.lng,
        countryCode: item.countryCode,
        countryName: item.countryName,
        note: item.note,
        status: item.status,
        linkedPlaceId: item.linkedPlaceSlug ? (placeIds.get(item.linkedPlaceSlug) ?? null) : null,
        isDemo: true,
      })),
    );

    await tx
      .insert(siteSettings)
      .values({ key: SEEDED_KEY, value: new Date().toISOString() })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value: new Date().toISOString() } });
  });

  return true;
}

/** Removes every demo row. Real content is never touched (`is_demo = false`). */
export async function purgeDemoContent(
  db: Database,
): Promise<{ places: number; trips: number; bucketItems: number }> {
  return db.transaction(async (tx) => {
    const removedBucket = await tx
      .delete(bucketListItems)
      .where(eq(bucketListItems.isDemo, true))
      .returning({ id: bucketListItems.id });
    const removedPlaces = await tx
      .delete(places)
      .where(eq(places.isDemo, true))
      .returning({ id: places.id });
    const removedTrips = await tx
      .delete(trips)
      .where(and(eq(trips.isDemo, true)))
      .returning({ id: trips.id });
    return {
      places: removedPlaces.length,
      trips: removedTrips.length,
      bucketItems: removedBucket.length,
    };
  });
}
