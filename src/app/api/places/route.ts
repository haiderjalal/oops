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
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=86400",
    },
  });
}
