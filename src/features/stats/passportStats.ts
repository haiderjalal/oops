import type { PlaceSummary, PlaceType } from "@/types/domain";
import { yearOf } from "@/utils/date";

/**
 * Passport statistics — derived ONLY from the published places passed in. Nothing is estimated,
 * and bucket-list items never count: a completed wish is not a visit unless a published
 * place exists for it.
 */

export interface CountryStat {
  code: string;
  name: string;
  placeCount: number;
  firstVisitedAt: string | null;
  lastVisitedAt: string | null;
  cities: string[];
  demo: boolean;
}

export interface PassportStats {
  placeCount: number;
  countryCount: number;
  cityCount: number;
  tripCount: number;
  firstVisit: string | null;
  latestVisit: string | null;
  countries: CountryStat[];
  byYear: { year: number; count: number }[];
  byType: Partial<Record<PlaceType, number>>;
  topRated: PlaceSummary[];
  /** How many of the counted places are synthetic demo entries. */
  demoCount: number;
}

function earliest(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a <= b ? a : b;
}

function latest(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}

export function computePassportStats(places: readonly PlaceSummary[]): PassportStats {
  const countries = new Map<string, CountryStat>();
  const cities = new Set<string>();
  const trips = new Set<string>();
  const years = new Map<number, number>();
  const byType: Partial<Record<PlaceType, number>> = {};

  let firstVisit: string | null = null;
  let latestVisit: string | null = null;

  for (const place of places) {
    trips.add(place.tripSlug ?? "");
    byType[place.type] = (byType[place.type] ?? 0) + 1;

    if (place.visitedAt) {
      firstVisit = earliest(firstVisit, place.visitedAt);
      latestVisit = latest(latestVisit, place.visitedAt);
      const year = yearOf(place.visitedAt);
      if (year) years.set(year, (years.get(year) ?? 0) + 1);
    }

    if (place.countryCode) {
      const existing = countries.get(place.countryCode);
      const cityName = place.city?.trim();
      const entry: CountryStat = existing ?? {
        code: place.countryCode,
        name: place.countryName ?? place.countryCode,
        placeCount: 0,
        firstVisitedAt: null,
        lastVisitedAt: null,
        cities: [],
        demo: true,
      };
      entry.placeCount += 1;
      entry.firstVisitedAt = earliest(entry.firstVisitedAt, place.visitedAt);
      entry.lastVisitedAt = latest(entry.lastVisitedAt, place.visitedAt);
      entry.demo = entry.demo && place.isDemo;
      if (cityName && !entry.cities.includes(cityName)) entry.cities.push(cityName);
      countries.set(place.countryCode, entry);

      if (cityName) cities.add(`${place.countryCode}:${cityName.toLowerCase()}`);
    }
  }

  trips.delete("");

  return {
    placeCount: places.length,
    countryCount: countries.size,
    cityCount: cities.size,
    tripCount: trips.size,
    firstVisit,
    latestVisit,
    countries: [...countries.values()].sort(
      (a, b) =>
        (a.firstVisitedAt ?? "9999").localeCompare(b.firstVisitedAt ?? "9999") ||
        a.name.localeCompare(b.name),
    ),
    byYear: [...years.entries()]
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => b.year - a.year),
    byType,
    topRated: places.filter((place) => (place.rating ?? 0) >= 5).slice(0, 6),
    demoCount: places.filter((place) => place.isDemo).length,
  };
}
