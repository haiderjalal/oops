import type { PlaceSummary } from "@/types/domain";
import { haversineKm } from "@/utils/geo";

export interface NearbyPlace {
  place: PlaceSummary;
  distanceKm: number;
}

/** Closest other places to `origin`, nearest first. Pure; the dataset is small enough to scan. */
export function findNearbyPlaces(
  origin: Pick<PlaceSummary, "slug" | "lat" | "lng">,
  places: readonly PlaceSummary[],
  limit = 3,
  maxKm = 2500,
): NearbyPlace[] {
  return places
    .filter((place) => place.slug !== origin.slug)
    .map((place) => ({ place, distanceKm: haversineKm(origin, place) }))
    .filter((entry) => entry.distanceKm <= maxKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
