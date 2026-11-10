import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { getDemoConfig } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import type { TripSummary } from "@/types/domain";

import { CACHE_TAGS } from "@/features/places/cacheTags";

import { findPublishedTrips } from "./trips.repository";

export async function getPublishedTrips(): Promise<TripSummary[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 86_400 });
  cacheTag(CACHE_TAGS.trips);

  const db = await getDb();
  const rows = await findPublishedTrips(db, { includeDemo: getDemoConfig().show });
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    startDate: row.startDate,
    endDate: row.endDate,
    description: row.description,
    isDemo: row.isDemo,
  }));
}
