import { describe, expect, it, vi } from "vitest";

import { createGazetteerGeocoder } from "@/features/search/gazetteer";
import {
  createMaptilerGeocoder,
  mapMaptilerFeature,
  suggestType,
} from "@/features/search/maptiler";
import { withShortCache } from "@/features/search/provider";
import type { GeocodeResult } from "@/types/domain";

/** Shaped after MapTiler's documented forward-geocoding response (not captured from a live account). */
const cafeFeature = {
  id: "poi.12345",
  text: "Café A Brasileira",
  place_name: "Café A Brasileira, R. Garrett 120, Lisboa, Portugal",
  place_type: ["poi"],
  center: [-9.1423, 38.7107] as [number, number],
  geometry: { type: "Point", coordinates: [-9.1423, 38.7107] },
  properties: { country_code: "pt", categories: ["cafe", "coffee_shop"] },
  context: [
    { id: "municipality.1", text: "Lisboa", country_code: "pt" },
    { id: "region.2", text: "Lisboa District" },
    { id: "country.3", text: "Portugal", country_code: "pt" },
  ],
};

describe("MapTiler result mapping", () => {
  it("keeps longitude/latitude straight and extracts the address hierarchy", () => {
    const result = mapMaptilerFeature(cafeFeature);
    expect(result).toMatchObject({
      provider: "maptiler",
      providerPlaceId: "poi.12345",
      placeName: "Café A Brasileira",
      lat: 38.7107,
      lng: -9.1423,
      city: "Lisboa",
      region: "Lisboa District",
      countryCode: "PT",
      countryName: "Portugal",
      suggestedType: "cafe",
    });
  });

  it("recognises countries, cities, restaurants, hotels and attractions", () => {
    expect(suggestType({ place_type: ["country"] })).toBe("country");
    expect(suggestType({ place_type: ["municipality"] })).toBe("city");
    expect(suggestType({ place_type: ["poi"], properties: { categories: ["restaurant"] } })).toBe(
      "restaurant",
    );
    expect(suggestType({ place_type: ["poi"], properties: { categories: ["hotel"] } })).toBe(
      "hotel",
    );
    expect(suggestType({ place_type: ["poi"], properties: { categories: ["museum"] } })).toBe(
      "attraction",
    );
    expect(suggestType({ place_type: ["address"] })).toBe("other");
  });

  it("treats a city result as its own city and a country result as its own country", () => {
    const city = mapMaptilerFeature({
      text: "Lisboa",
      place_type: ["municipality"],
      center: [-9.13, 38.72],
      context: [{ id: "country.3", text: "Portugal", country_code: "pt" }],
    });
    expect(city).toMatchObject({ city: "Lisboa", countryName: "Portugal", suggestedType: "city" });
    const country = mapMaptilerFeature({
      text: "Iceland",
      place_type: ["country"],
      center: [-19, 65],
      properties: { country_code: "is" },
    });
    expect(country).toMatchObject({
      countryName: "Iceland",
      countryCode: "IS",
      suggestedType: "country",
    });
  });

  it("drops results without usable coordinates", () => {
    expect(mapMaptilerFeature({ text: "Nowhere" })).toBeNull();
    expect(mapMaptilerFeature({ text: "Bad", center: [500, 200] })).toBeNull();
  });
});

describe("MapTiler client", () => {
  it("sends the key server-side and maps the response", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ features: [cafeFeature] }), { status: 200 }),
    );
    const geocoder = createMaptilerGeocoder("server-key", fetchImpl as unknown as typeof fetch);
    const results = await geocoder.search("brasileira");
    expect(results).toHaveLength(1);
    const requested = new URL(String((fetchImpl.mock.calls[0] as unknown[])[0]));
    expect(requested.hostname).toBe("api.maptiler.com");
    expect(requested.searchParams.get("key")).toBe("server-key");
    expect(decodeURIComponent(requested.pathname)).toContain("brasileira");
  });

  it("turns upstream failures into friendly typed errors", async () => {
    const make = (status: number) =>
      createMaptilerGeocoder(
        "k",
        (async () => new Response("{}", { status })) as unknown as typeof fetch,
      );
    await expect(make(429).search("x")).rejects.toMatchObject({ code: "rate_limited" });
    await expect(make(500).search("x")).rejects.toMatchObject({ code: "upstream" });
    const garbage = createMaptilerGeocoder(
      "k",
      (async () =>
        new Response(JSON.stringify({ nope: true }), { status: 200 })) as unknown as typeof fetch,
    );
    await expect(garbage.search("x")).rejects.toMatchObject({ code: "upstream" });
    const down = createMaptilerGeocoder("k", (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch);
    await expect(down.search("x")).rejects.toMatchObject({ code: "upstream" });
  });
});

describe("offline gazetteer", () => {
  it("finds cities ignoring accents and is clearly not production-grade", async () => {
    const geocoder = createGazetteerGeocoder();
    expect(geocoder.production).toBe(false);
    expect((await geocoder.search("reykjavik"))[0]).toMatchObject({
      placeName: "Reykjavík",
      countryCode: "IS",
    });
    expect(await geocoder.search("x")).toEqual([]);
    expect(await geocoder.search("zzzzzz")).toEqual([]);
  });
});

describe("geocoder short cache", () => {
  it("collapses identical lookups inside a minute but not later ones", async () => {
    let clock = 0;
    const search = vi.fn(async (): Promise<GeocodeResult[]> => []);
    const cached = withShortCache({ name: "t", production: true, search }, () => clock);
    await cached.search("Lisbon");
    await cached.search("  lisbon ");
    expect(search).toHaveBeenCalledTimes(1);
    clock = 61_000;
    await cached.search("Lisbon");
    expect(search).toHaveBeenCalledTimes(2);
  });
});
