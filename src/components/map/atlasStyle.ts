import type { StyleSpecification } from "maplibre-gl";
import type { Feature, FeatureCollection, LineString } from "geojson";

/**
 * The "offline atlas": a retro country-level map built from bundled Natural Earth data
 * (public domain). It is the default when no licensed tile provider is configured and the
 * automatic fallback when the provider is unreachable, so the globe and every pin always work.
 * It deliberately has no streets or labels — those come from a licensed provider.
 */

export const OFFLINE_ATLAS_ATTRIBUTION = "Country shapes © Natural Earth (public domain)";

export const ATLAS_COLORS = {
  ocean: "#2f7a99",
  land: "#f1e6cd",
  border: "#c2ae84",
  graticule: "#ffffff",
  visited: "#fa6b4a",
} as const;

/** Latitude/longitude lines every 30°, drawn as dashes for that printed-atlas feel. */
export function graticuleGeoJson(): FeatureCollection<LineString> {
  const features: Feature<LineString>[] = [];

  for (let lng = -180; lng <= 180; lng += 30) {
    const coordinates: [number, number][] = [];
    for (let lat = -80; lat <= 80; lat += 4) coordinates.push([lng, lat]);
    features.push({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates },
    });
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const coordinates: [number, number][] = [];
    for (let lng = -180; lng <= 180; lng += 4) coordinates.push([lng, lat]);
    features.push({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates },
    });
  }
  return { type: "FeatureCollection", features };
}

export const VISITED_LAYER_ID = "atlas-visited";

export function buildOfflineAtlasStyle(): StyleSpecification {
  return {
    version: 8,
    projection: { type: "globe" },
    sky: {
      "sky-color": "#2f7a99",
      "horizon-color": "#a9d6e8",
      "fog-color": "#d4ecf6",
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 4, 1, 6.5, 0],
    },
    sources: {
      atlas: {
        type: "geojson",
        data: "/data/countries-110m.geojson",
        attribution: OFFLINE_ATLAS_ATTRIBUTION,
      },
      graticule: { type: "geojson", data: graticuleGeoJson() },
    },
    layers: [
      { id: "atlas-ocean", type: "background", paint: { "background-color": ATLAS_COLORS.ocean } },
      {
        id: "atlas-graticule",
        type: "line",
        source: "graticule",
        paint: {
          "line-color": ATLAS_COLORS.graticule,
          "line-opacity": 0.22,
          "line-width": 0.8,
          "line-dasharray": [2, 3],
        },
      },
      {
        id: "atlas-land",
        type: "fill",
        source: "atlas",
        paint: { "fill-color": ATLAS_COLORS.land },
      },
      {
        id: VISITED_LAYER_ID,
        type: "fill",
        source: "atlas",
        filter: ["in", ["get", "iso2"], ["literal", []]],
        paint: { "fill-color": ATLAS_COLORS.visited, "fill-opacity": 0.38 },
      },
      {
        id: "atlas-borders",
        type: "line",
        source: "atlas",
        paint: {
          "line-color": ATLAS_COLORS.border,
          "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.5, 6, 1.4],
        },
      },
    ],
  };
}
