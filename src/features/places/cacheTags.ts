/** Cache tags for public data. Mutations call `updateTag` on these so publishing is reflected immediately. */
export const CACHE_TAGS = {
  places: "places",
  trips: "trips",
  bucket: "bucket-list",
} as const;

export const placeTag = (slug: string): string => `place:${slug}`;
