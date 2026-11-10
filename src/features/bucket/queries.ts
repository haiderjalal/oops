import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { getDemoConfig } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import type { BucketListItemView } from "@/types/domain";

import { CACHE_TAGS } from "@/features/places/cacheTags";

import { findBucketItems } from "./bucket.repository";

export async function getBucketListItems(): Promise<BucketListItemView[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 86_400 });
  cacheTag(CACHE_TAGS.bucket, CACHE_TAGS.places);

  const db = await getDb();
  const records = await findBucketItems(db, { includeDemo: getDemoConfig().show });
  return records.map(({ item, linkedPlace }) => ({
    id: item.id,
    placeName: item.placeName,
    lat: item.lat,
    lng: item.lng,
    countryCode: item.countryCode,
    countryName: item.countryName,
    note: item.note,
    status: item.status,
    linkedPlace,
    isDemo: item.isDemo,
  }));
}
