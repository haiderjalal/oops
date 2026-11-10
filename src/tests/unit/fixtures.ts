import type { PlaceSummary } from "@/types/domain";

/** Builds a PlaceSummary with sensible defaults for tests. */
export function makePlace(overrides: Partial<PlaceSummary> = {}): PlaceSummary {
  return {
    id: crypto.randomUUID(),
    slug: "test-place",
    title: "Test Place",
    type: "city",
    lat: 38.7223,
    lng: -9.1393,
    approximate: false,
    city: "Lisbon",
    region: null,
    countryCode: "PT",
    countryName: "Portugal",
    visitedAt: "2023-03-03",
    excerpt: "A test place.",
    funnyMoment: null,
    rating: null,
    isDemo: false,
    cover: null,
    tripSlug: null,
    tripTitle: null,
    tags: [],
    ...overrides,
  };
}
