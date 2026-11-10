import type { Feature, FeatureCollection, LineString, Point } from "geojson";

import type { PlaceSummary, PlaceType } from "@/types/domain";
import { type LngLat, greatCircle } from "@/utils/geo";

/** Properties carried by each map pin. Kept tiny: the full place is looked up by slug on click. */
export interface PinProperties {
  slug: string;
  type: PlaceType;
  demo: boolean;
  approximate: boolean;
}

export type PlacePointCollection = FeatureCollection<Point, PinProperties>;

/** MapLibre wants [longitude, latitude] — the reverse of how people say it. */
export function placesToGeoJson(places: readonly PlaceSummary[]): PlacePointCollection {
  return {
    type: "FeatureCollection",
    features: places.map((place): Feature<Point, PinProperties> => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [place.lng, place.lat] },
      properties: {
        slug: place.slug,
        type: place.type,
        demo: place.isDemo,
        approximate: place.approximate,
      },
    })),
  };
}

export interface RouteProperties {
  trip: string;
}

/**
 * Dashed route lines: for every trip, connect its places in visiting order along great circles.
 * Places without a date, or trips with a single stop, produce no line.
 */
export function routesToGeoJson(
  places: readonly PlaceSummary[],
): FeatureCollection<LineString, RouteProperties> {
  const byTrip = new Map<string, PlaceSummary[]>();
  for (const place of places) {
    if (!place.tripSlug || !place.visitedAt) continue;
    byTrip.set(place.tripSlug, [...(byTrip.get(place.tripSlug) ?? []), place]);
  }

  const features: Feature<LineString, RouteProperties>[] = [];
  for (const [trip, stops] of byTrip) {
    const ordered = [...stops].sort((a, b) => (a.visitedAt ?? "").localeCompare(b.visitedAt ?? ""));
    if (ordered.length < 2) continue;

    const coordinates: LngLat[] = [];
    for (let i = 0; i < ordered.length - 1; i += 1) {
      const from = ordered[i]!;
      const to = ordered[i + 1]!;
      // Skip the first point of later legs; it duplicates the previous leg's last point.
      const leg = greatCircle([from.lng, from.lat], [to.lng, to.lat], 32);
      coordinates.push(...(i === 0 ? leg : leg.slice(1)));
    }
    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: coordinates.map(([lng, lat]) => [lng, lat]) },
      properties: { trip },
    });
  }
  return { type: "FeatureCollection", features };
}
