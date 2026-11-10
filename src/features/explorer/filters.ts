import { PLACE_TYPES, type PlaceSummary, type PlaceType } from "@/types/domain";
import { yearOf } from "@/utils/date";

/**
 * Explorer state that lives in the URL, so every filtered view, selected pin and list/map choice
 * can be shared, bookmarked, and navigated with the browser's back and forward buttons.
 *
 *   /?place=belem-tower&type=cafe&year=2024&country=PT&q=coffee&view=list
 */

export type ExplorerView = "map" | "list";

export interface ExplorerFilters {
  q: string;
  type: PlaceType | null;
  year: number | null;
  country: string | null;
  /** `null` = visitor hasn't chosen (data-saver visitors default to the list). */
  view: ExplorerView | null;
  place: string | null;
}

export const DEFAULT_FILTERS: ExplorerFilters = {
  q: "",
  type: null,
  year: null,
  country: null,
  view: null,
  place: null,
};

export function parseExplorerParams(search: string): ExplorerFilters {
  const params = new URLSearchParams(search);

  const type = params.get("type");
  const year = Number(params.get("year"));
  const country = params.get("country");
  const view = params.get("view");

  return {
    q: (params.get("q") ?? "").slice(0, 80),
    type: PLACE_TYPES.includes(type as PlaceType) ? (type as PlaceType) : null,
    year: Number.isInteger(year) && year > 1900 && year < 2200 ? year : null,
    country: country && /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : null,
    view: view === "list" || view === "map" ? view : null,
    place: params.get("place")?.slice(0, 120) || null,
  };
}

/** Inverse of `parseExplorerParams`. Defaults are omitted to keep URLs short. */
export function toSearchString(filters: ExplorerFilters): string {
  const params = new URLSearchParams();
  if (filters.place) params.set("place", filters.place);
  if (filters.q) params.set("q", filters.q);
  if (filters.type) params.set("type", filters.type);
  if (filters.year) params.set("year", String(filters.year));
  if (filters.country) params.set("country", filters.country);
  if (filters.view) params.set("view", filters.view);
  return params.toString();
}

function normalise(value: string): string {
  return value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function searchableText(place: PlaceSummary): string {
  return normalise(
    [place.title, place.city, place.region, place.countryName, place.excerpt, ...place.tags]
      .filter(Boolean)
      .join(" "),
  );
}

export function filterPlaces(
  places: readonly PlaceSummary[],
  filters: ExplorerFilters,
): PlaceSummary[] {
  const query = normalise(filters.q.trim());
  const words = query ? query.split(/\s+/) : [];

  return places.filter((place) => {
    if (filters.type && place.type !== filters.type) return false;
    if (filters.year && yearOf(place.visitedAt) !== filters.year) return false;
    if (filters.country && place.countryCode !== filters.country) return false;
    if (words.length === 0) return true;
    const haystack = searchableText(place);
    return words.every((word) => haystack.includes(word));
  });
}

export interface Facets {
  types: { type: PlaceType; count: number }[];
  years: number[];
  countries: { code: string; name: string; count: number }[];
}

/** Which filter options exist at all (computed from the full, unfiltered set). */
export function buildFacets(places: readonly PlaceSummary[]): Facets {
  const types = new Map<PlaceType, number>();
  const years = new Set<number>();
  const countries = new Map<string, { name: string; count: number }>();

  for (const place of places) {
    types.set(place.type, (types.get(place.type) ?? 0) + 1);
    const year = yearOf(place.visitedAt);
    if (year) years.add(year);
    if (place.countryCode) {
      const existing = countries.get(place.countryCode);
      countries.set(place.countryCode, {
        name: place.countryName ?? place.countryCode,
        count: (existing?.count ?? 0) + 1,
      });
    }
  }

  return {
    types: PLACE_TYPES.filter((type) => types.has(type)).map((type) => ({
      type,
      count: types.get(type) ?? 0,
    })),
    years: [...years].sort((a, b) => b - a),
    countries: [...countries.entries()]
      .map(([code, value]) => ({ code, ...value }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export function hasActiveFilters(filters: ExplorerFilters): boolean {
  return Boolean(filters.q || filters.type || filters.year || filters.country);
}
