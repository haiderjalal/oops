import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { FeatureCollection } from "geojson";

/** Source/layer ids used by the travel map. One place so the component and tests agree. */
export const SOURCES = {
  places: "oops-places",
  routes: "oops-routes",
  selected: "oops-selected",
} as const;

export const LAYERS = {
  routes: "oops-routes-line",
  clusters: "oops-clusters",
  pins: "oops-pins",
  selectedHalo: "oops-selected-halo",
  selectedPin: "oops-selected-pin",
} as const;

const PIN_ICON: ExpressionSpecification = [
  "concat",
  "pin-",
  ["get", "type"],
  ["case", ["get", "demo"], "-demo", ""],
];

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

export interface MapData {
  places: FeatureCollection;
  routes: FeatureCollection;
  selected: FeatureCollection;
}

/**
 * (Re)creates every source and layer. Safe to call on each `style.load`, which happens at
 * startup and again if we fall back from the provider style to the offline atlas.
 */
export function installTravelLayers(map: MapLibreMap, data: MapData): void {
  if (!map.getSource(SOURCES.routes))
    map.addSource(SOURCES.routes, { type: "geojson", data: data.routes });
  if (!map.getSource(SOURCES.places)) {
    map.addSource(SOURCES.places, {
      type: "geojson",
      data: data.places,
      cluster: true,
      clusterRadius: 46,
      clusterMaxZoom: 8,
    });
  }
  if (!map.getSource(SOURCES.selected))
    map.addSource(SOURCES.selected, { type: "geojson", data: data.selected });

  if (!map.getLayer(LAYERS.routes)) {
    // Dashed great-circle lines between a trip's stops. Static: nothing animates continuously.
    map.addLayer({
      id: LAYERS.routes,
      type: "line",
      source: SOURCES.routes,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#fa6b4a",
        "line-width": ["interpolate", ["linear"], ["zoom"], 1, 1.6, 6, 3],
        "line-dasharray": [0.5, 2.2],
        "line-opacity": 0.9,
      },
    });
  }

  if (!map.getLayer(LAYERS.clusters)) {
    map.addLayer({
      id: LAYERS.clusters,
      type: "symbol",
      source: SOURCES.places,
      filter: ["has", "point_count"],
      layout: {
        "icon-image": ["concat", "cluster-", ["to-string", ["get", "point_count"]]],
        "icon-overlap": "always",
      },
    });
  }

  if (!map.getLayer(LAYERS.pins)) {
    map.addLayer({
      id: LAYERS.pins,
      type: "symbol",
      source: SOURCES.places,
      filter: ["!", ["has", "point_count"]],
      layout: {
        "icon-image": PIN_ICON,
        "icon-anchor": "bottom",
        "icon-overlap": "always",
        "icon-size": ["interpolate", ["linear"], ["zoom"], 1, 0.72, 5, 0.9, 10, 1],
      },
    });
  }

  // The selected place sits on its own source so it can be enlarged without re-clustering.
  if (!map.getLayer(LAYERS.selectedHalo)) {
    map.addLayer({
      id: LAYERS.selectedHalo,
      type: "circle",
      source: SOURCES.selected,
      paint: {
        "circle-radius": 15,
        "circle-color": "#fa6b4a",
        "circle-opacity": 0.28,
        "circle-stroke-color": "#fa6b4a",
        "circle-stroke-width": 2,
      },
    });
  }
  if (!map.getLayer(LAYERS.selectedPin)) {
    map.addLayer({
      id: LAYERS.selectedPin,
      type: "symbol",
      source: SOURCES.selected,
      layout: {
        "icon-image": PIN_ICON,
        "icon-anchor": "bottom",
        "icon-overlap": "always",
        "icon-size": 1.28,
      },
    });
  }
}

function setSourceData(map: MapLibreMap, id: string, data: FeatureCollection): void {
  const source = map.getSource<GeoJSONSource>(id);
  source?.setData(data);
}

export const setPlacesData = (map: MapLibreMap, data: FeatureCollection): void =>
  setSourceData(map, SOURCES.places, data);
export const setRoutesData = (map: MapLibreMap, data: FeatureCollection): void =>
  setSourceData(map, SOURCES.routes, data);
export const setSelectedData = (map: MapLibreMap, data: FeatureCollection | null): void =>
  setSourceData(map, SOURCES.selected, data ?? EMPTY);
