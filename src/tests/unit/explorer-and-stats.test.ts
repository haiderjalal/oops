import { describe, expect, it } from "vitest";

import {
  buildFacets,
  filterPlaces,
  hasActiveFilters,
  parseExplorerParams,
  toSearchString,
} from "@/features/explorer/filters";
import { placesToGeoJson, routesToGeoJson } from "@/features/places/geojson";
import { findNearbyPlaces } from "@/features/places/nearby";
import { buildTimeline } from "@/features/places/timeline";
import { computePassportStats } from "@/features/stats/passportStats";
import type { TripSummary } from "@/types/domain";

import { makePlace } from "./fixtures";

describe("explorer URL state", () => {
  it("round-trips filters through the query string", () => {
    const filters = parseExplorerParams(
      "place=belem&type=cafe&year=2024&country=pt&q=pastel&view=list",
    );
    expect(filters).toEqual({
      place: "belem",
      type: "cafe",
      year: 2024,
      country: "PT",
      q: "pastel",
      view: "list",
    });
    expect(parseExplorerParams(toSearchString(filters))).toEqual(filters);
  });

  it("ignores junk and keeps URLs short", () => {
    const filters = parseExplorerParams("type=spaceship&year=abc&country=ZZZ&view=3d");
    expect(filters).toMatchObject({ type: null, year: null, country: null, view: null });
    expect(toSearchString(filters)).toBe("");
    expect(hasActiveFilters(filters)).toBe(false);
  });

  it("filters by text without caring about accents or case", () => {
    const places = [
      makePlace({
        slug: "a",
        title: "Reykjavík Church",
        city: "Reykjavík",
        countryName: "Iceland",
        countryCode: "IS",
      }),
      makePlace({
        slug: "b",
        title: "Table Mountain",
        city: "Cape Town",
        countryName: "South Africa",
        countryCode: "ZA",
        tags: ["nature"],
      }),
    ];
    const base = parseExplorerParams("");
    expect(filterPlaces(places, { ...base, q: "reykjavik" }).map((p) => p.slug)).toEqual(["a"]);
    expect(filterPlaces(places, { ...base, q: "NATURE cape" }).map((p) => p.slug)).toEqual(["b"]);
    expect(filterPlaces(places, { ...base, q: "nothing here" })).toEqual([]);
  });

  it("filters by type, year and country together", () => {
    const places = [
      makePlace({ slug: "a", type: "cafe", visitedAt: "2024-05-01", countryCode: "PT" }),
      makePlace({ slug: "b", type: "cafe", visitedAt: "2023-05-01", countryCode: "PT" }),
      makePlace({ slug: "c", type: "city", visitedAt: "2024-05-01", countryCode: "PT" }),
    ];
    const filters = {
      ...parseExplorerParams(""),
      type: "cafe" as const,
      year: 2024,
      country: "PT",
    };
    expect(filterPlaces(places, filters).map((p) => p.slug)).toEqual(["a"]);
  });

  it("builds facets from the data that exists", () => {
    const facets = buildFacets([
      makePlace({
        type: "cafe",
        visitedAt: "2023-01-01",
        countryCode: "PT",
        countryName: "Portugal",
      }),
      makePlace({ type: "city", visitedAt: "2024-01-01", countryCode: "JP", countryName: "Japan" }),
    ]);
    expect(facets.types.map((t) => t.type)).toEqual(["city", "cafe"]);
    expect(facets.years).toEqual([2024, 2023]);
    expect(facets.countries.map((c) => c.code)).toEqual(["JP", "PT"]);
  });
});

describe("GeoJSON for the map", () => {
  it("uses [longitude, latitude] order (what MapLibre expects)", () => {
    const geo = placesToGeoJson([makePlace({ lat: 38.7223, lng: -9.1393 })]);
    expect(geo.features[0]?.geometry.coordinates).toEqual([-9.1393, 38.7223]);
  });

  it("carries only what a pin needs", () => {
    const geo = placesToGeoJson([makePlace({ slug: "x", type: "cafe", isDemo: true })]);
    expect(geo.features[0]?.properties).toEqual({
      slug: "x",
      type: "cafe",
      demo: true,
      approximate: false,
    });
  });

  it("draws one route per trip with two or more dated stops, in visiting order", () => {
    const places = [
      makePlace({ slug: "late", tripSlug: "t", visitedAt: "2023-03-10", lat: 41, lng: 29 }),
      makePlace({ slug: "early", tripSlug: "t", visitedAt: "2023-03-02", lat: 38, lng: -9 }),
      makePlace({ slug: "solo", tripSlug: "solo-trip", visitedAt: "2023-03-02" }),
      makePlace({ slug: "no-trip" }),
    ];
    const routes = routesToGeoJson(places);
    expect(routes.features).toHaveLength(1);
    const coordinates = routes.features[0]!.geometry.coordinates;
    expect(coordinates[0]).toEqual([-9, 38]); // starts at the earlier stop
    expect(coordinates.at(-1)).toEqual([29, 41]);
  });
});

describe("passport statistics", () => {
  const places = [
    makePlace({
      slug: "a",
      countryCode: "PT",
      countryName: "Portugal",
      city: "Lisbon",
      visitedAt: "2023-03-03",
      tripSlug: "t1",
      rating: 5,
      type: "attraction",
    }),
    makePlace({
      slug: "b",
      countryCode: "PT",
      countryName: "Portugal",
      city: "Lisbon",
      visitedAt: "2023-03-04",
      tripSlug: "t1",
      type: "cafe",
    }),
    makePlace({
      slug: "c",
      countryCode: "TR",
      countryName: "Türkiye",
      city: "Istanbul",
      visitedAt: "2024-01-10",
      isDemo: true,
    }),
    makePlace({ slug: "d", countryCode: null, countryName: null, city: null, visitedAt: null }),
  ];

  it("counts only what was passed in, de-duplicated", () => {
    const stats = computePassportStats(places);
    expect(stats.placeCount).toBe(4);
    expect(stats.countryCount).toBe(2);
    expect(stats.cityCount).toBe(2); // Lisbon counted once
    expect(stats.tripCount).toBe(1);
    expect(stats.demoCount).toBe(1);
    expect(stats.firstVisit).toBe("2023-03-03");
    expect(stats.latestVisit).toBe("2024-01-10");
    expect(stats.byYear).toEqual([
      { year: 2024, count: 1 },
      { year: 2023, count: 2 },
    ]);
    expect(stats.byType.cafe).toBe(1);
    expect(stats.topRated.map((p) => p.slug)).toEqual(["a"]);
  });

  it("marks a country as demo only when every place in it is demo", () => {
    const stats = computePassportStats(places);
    expect(stats.countries.find((c) => c.code === "TR")?.demo).toBe(true);
    expect(stats.countries.find((c) => c.code === "PT")?.demo).toBe(false);
  });

  it("handles an empty journal", () => {
    expect(computePassportStats([])).toMatchObject({
      placeCount: 0,
      countryCount: 0,
      firstVisit: null,
    });
  });
});

describe("timeline grouping", () => {
  const trip: TripSummary = {
    id: "1",
    slug: "t1",
    title: "Trip",
    startDate: "2023-03-01",
    endDate: "2023-03-20",
    description: "",
    isDemo: false,
  };

  it("groups trips into chapters and everything by year, newest first", () => {
    const years = buildTimeline(
      [
        makePlace({ slug: "a", tripSlug: "t1", visitedAt: "2023-03-10" }),
        makePlace({ slug: "b", tripSlug: "t1", visitedAt: "2023-03-02" }),
        makePlace({ slug: "c", visitedAt: "2024-06-01" }),
        makePlace({ slug: "d", visitedAt: null }),
      ],
      [trip],
    );
    expect(years.map((y) => y.year)).toEqual([2024, 2023, null]);
    const chapter = years[1]!.chapters[0]!;
    expect(chapter.kind).toBe("trip");
    if (chapter.kind === "trip") expect(chapter.places.map((p) => p.slug)).toEqual(["b", "a"]); // visiting order
  });

  it("treats places of an unknown (e.g. unpublished) trip as standalone", () => {
    const years = buildTimeline(
      [makePlace({ slug: "x", tripSlug: "hidden-trip", visitedAt: "2022-01-01" })],
      [],
    );
    expect(years[0]?.chapters[0]?.kind).toBe("place");
  });
});

describe("nearby places", () => {
  it("returns the closest others, nearest first, within range", () => {
    const origin = makePlace({ slug: "origin", lat: 38.7, lng: -9.1 });
    const near = makePlace({ slug: "near", lat: 38.8, lng: -9.2 });
    const far = makePlace({ slug: "far", lat: -33.9, lng: 18.4 });
    const result = findNearbyPlaces(origin, [origin, far, near], 3);
    expect(result.map((r) => r.place.slug)).toEqual(["near"]);
  });
});
