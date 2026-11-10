import { z } from "zod";

import { AppError } from "@/lib/errors";
import type { GeocodeResult, PlaceType } from "@/types/domain";

import type { GeocoderProvider } from "./types";

/**
 * MapTiler Geocoding API adapter (https://docs.maptiler.com/cloud/api/geocoding/).
 * The API key stays on the server: the browser only ever talks to /api/geocode.
 */

const contextEntry = z
  .object({
    id: z.string().optional(),
    text: z.string().optional(),
    country_code: z.string().optional(),
    short_code: z.string().optional(),
  })
  .loose();

const featureSchema = z
  .object({
    id: z.string().optional(),
    text: z.string().optional(),
    place_name: z.string().optional(),
    place_type: z.array(z.string()).optional(),
    center: z.tuple([z.number(), z.number()]).optional(),
    geometry: z
      .object({ coordinates: z.array(z.number()).min(2) })
      .loose()
      .optional(),
    context: z.array(contextEntry).optional(),
    properties: z
      .object({ country_code: z.string().optional(), categories: z.array(z.string()).optional() })
      .loose()
      .optional(),
  })
  .loose();

const responseSchema = z.object({ features: z.array(featureSchema) }).loose();

type Feature = z.infer<typeof featureSchema>;

const CITY_PREFIXES = ["municipality", "joint_municipality", "place", "locality", "city", "town"];
const REGION_PREFIXES = ["region", "subregion", "county", "state"];

function contextByPrefix(feature: Feature, prefixes: string[]) {
  return feature.context?.find((entry) =>
    prefixes.some((prefix) => entry.id?.startsWith(`${prefix}.`)),
  );
}

/** Guess what kind of place a result is, from MapTiler's place types and POI categories. */
export function suggestType(feature: Feature): PlaceType {
  const types = feature.place_type ?? [];
  const categories = (feature.properties?.categories ?? []).map((category) =>
    category.toLowerCase(),
  );
  const has = (...needles: string[]) =>
    categories.some((category) => needles.some((needle) => category.includes(needle)));

  if (types.includes("country")) return "country";
  if (types.some((type) => CITY_PREFIXES.includes(type))) return "city";
  if (types.includes("poi")) {
    if (has("cafe", "coffee", "tea")) return "cafe";
    if (has("restaurant", "food", "bar", "pub", "bakery", "fast_food")) return "restaurant";
    if (has("hotel", "hostel", "lodging", "guest_house", "motel", "camp")) return "hotel";
    return "attraction";
  }
  return "other";
}

export function mapMaptilerFeature(feature: Feature): GeocodeResult | null {
  const [lng, lat] = feature.center ?? feature.geometry?.coordinates ?? [];
  if (typeof lng !== "number" || typeof lat !== "number") return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  const placeName = feature.text ?? feature.place_name ?? "";
  if (!placeName) return null;

  const types = feature.place_type ?? [];
  const countryContext = contextByPrefix(feature, ["country"]);
  const cityContext = contextByPrefix(feature, CITY_PREFIXES);
  const regionContext = contextByPrefix(feature, REGION_PREFIXES);

  const rawCode =
    feature.properties?.country_code ??
    countryContext?.country_code ??
    countryContext?.short_code ??
    feature.context?.find((e) => e.country_code)?.country_code;
  const countryCode = rawCode && /^[A-Za-z]{2}$/.test(rawCode) ? rawCode.toUpperCase() : null;

  const isCountry = types.includes("country");
  const isCity = types.some((type) => CITY_PREFIXES.includes(type));

  return {
    provider: "maptiler",
    providerPlaceId: feature.id ?? null,
    placeName,
    formattedAddress: feature.place_name ?? placeName,
    city: isCity ? placeName : (cityContext?.text ?? null),
    region: types.some((type) => REGION_PREFIXES.includes(type))
      ? placeName
      : (regionContext?.text ?? null),
    countryCode,
    countryName: isCountry ? placeName : (countryContext?.text ?? null),
    lat,
    lng,
    suggestedType: suggestType(feature),
  };
}

export function createMaptilerGeocoder(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): GeocoderProvider {
  return {
    name: "maptiler",
    production: true,

    async search(query, options = {}) {
      const url = new URL(`https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json`);
      url.searchParams.set("key", apiKey);
      url.searchParams.set("limit", String(Math.min(options.limit ?? 6, 10)));
      url.searchParams.set("language", "en");
      url.searchParams.set("autocomplete", "true");

      let response: Response;
      try {
        response = await fetchImpl(url, {
          signal: options.signal ?? AbortSignal.timeout(6000),
          cache: "no-store",
        });
      } catch (cause) {
        throw new AppError(
          "upstream",
          "The place-search service didn't respond. Please try again.",
          { cause },
        );
      }

      if (response.status === 429) {
        throw new AppError(
          "rate_limited",
          "The place-search quota was reached. Try again in a little while.",
        );
      }
      if (!response.ok) {
        throw new AppError("upstream", "The place-search service had a hiccup. Please try again.", {
          cause: new Error(`MapTiler geocoding responded ${response.status}`),
        });
      }

      const parsed = responseSchema.safeParse(await response.json());
      if (!parsed.success) {
        throw new AppError("upstream", "The place-search service returned something unexpected.", {
          cause: parsed.error,
        });
      }
      return parsed.data.features.flatMap((feature) => {
        const mapped = mapMaptilerFeature(feature);
        return mapped ? [mapped] : [];
      });
    },
  };
}
