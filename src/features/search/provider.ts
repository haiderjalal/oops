import "server-only";

import { getGeocoderConfig } from "@/lib/config";
import type { GeocodeResult } from "@/types/domain";

import { createGazetteerGeocoder } from "./gazetteer";
import { createMaptilerGeocoder } from "./maptiler";
import type { GeocoderProvider } from "./types";

const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 100;

/**
 * Collapses identical lookups made within a minute (typing bursts, double-clicks) into one upstream
 * request. Deliberately short-lived and in-memory only: geocoding providers' terms generally don't
 * allow building a persistent copy of their results, so nothing is written to disk or the database
 * (only the coordinates the owner actually saves on a place).
 */
export function withShortCache(
  provider: GeocoderProvider,
  now: () => number = Date.now,
): GeocoderProvider {
  const cache = new Map<string, { at: number; results: GeocodeResult[] }>();

  return {
    name: provider.name,
    production: provider.production,
    async search(query, options) {
      const key = `${query.trim().toLowerCase()}|${options?.limit ?? ""}`;
      const hit = cache.get(key);
      if (hit && now() - hit.at < CACHE_TTL_MS) return hit.results;

      const results = await provider.search(query, options);
      cache.set(key, { at: now(), results });
      if (cache.size > CACHE_MAX_ENTRIES) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      return results;
    },
  };
}

declare global {
  var __oopsGeocoder: GeocoderProvider | undefined;
}

export function getGeocoder(): GeocoderProvider {
  if (!globalThis.__oopsGeocoder) {
    const config = getGeocoderConfig();
    globalThis.__oopsGeocoder = withShortCache(
      config.provider === "maptiler"
        ? createMaptilerGeocoder(config.apiKey)
        : createGazetteerGeocoder(),
    );
  }
  return globalThis.__oopsGeocoder;
}
