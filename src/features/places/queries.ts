import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { getDemoConfig } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import { getStorage } from "@/lib/storage";
import type { PlaceDetail, PlaceSummary } from "@/types/domain";

import { CACHE_TAGS, placeTag } from "./cacheTags";
import { toPlaceDetail, toPlaceSummary } from "./mappers";
import {
  findPublishedPlaceBySlug,
  findPublishedPlaces,
  listPublishedSlugs,
} from "./places.repository";

/**
 * Public reads. Only published, already-live, non-deleted places are ever returned, and
 * privacy rules (approximate coordinates) are applied before anything leaves the server.
 *
 * Results are cached and tagged; publishing or editing calls `updateTag`, and the time-based
 * `revalidate` makes scheduled publications go live within a quarter of an hour.
 */

const PUBLIC_CACHE = { stale: 300, revalidate: 900, expire: 86_400 } as const;

function mapperContext() {
  const storage = getStorage();
  return { publicUrl: (key: string) => storage.publicUrl(key) };
}

export async function getPublishedPlaces(): Promise<PlaceSummary[]> {
  "use cache";
  cacheLife(PUBLIC_CACHE);
  cacheTag(CACHE_TAGS.places);

  const db = await getDb();
  const records = await findPublishedPlaces(db, { includeDemo: getDemoConfig().show });
  const context = mapperContext();
  return records.map((record) => toPlaceSummary(record, context));
}

export async function getPublishedPlaceBySlug(slug: string): Promise<PlaceDetail | null> {
  "use cache";
  cacheLife(PUBLIC_CACHE);
  cacheTag(CACHE_TAGS.places, placeTag(slug));

  const db = await getDb();
  const record = await findPublishedPlaceBySlug(db, slug, { includeDemo: getDemoConfig().show });
  return record ? toPlaceDetail(record, mapperContext()) : null;
}

export async function getPublishedPlaceSlugs(): Promise<string[]> {
  "use cache";
  cacheLife(PUBLIC_CACHE);
  cacheTag(CACHE_TAGS.places);

  const db = await getDb();
  return listPublishedSlugs(db, { includeDemo: getDemoConfig().show });
}
