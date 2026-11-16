import { NextResponse } from "next/server";

import { placesToGeoJson } from "@/features/places/geojson";
import { getPublishedPlaces } from "@/features/places/queries";

/**
 * Public GeoJSON of published places (approximate places already carry rounded coordinates).
 * Cached at the CDN and refreshed whenever content is published, via the `places` cache tag.
 */
export async function GET() {
  const places = await getPublishedPlaces();
  return NextResponse.json(placesToGeoJson(places), {
    headers: {
      "Content-Type": "application/geo+json",
      // Short CDN window: an unpublished or deleted place must not stay fetchable for long. Stale
      // copies are not served while revalidating, because that would keep them alive after removal.
      "Cache-Control": "public, s-maxage=300",
    },
  });
}
