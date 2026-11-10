"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { type Ref, useEffect, useImperativeHandle, useRef } from "react";
import {
  AttributionControl,
  type FilterSpecification,
  type LngLatBoundsLike,
  Map as MapLibreMap,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";

import type { ClientMapConfig } from "@/lib/config";
import { placesToGeoJson, routesToGeoJson } from "@/features/places/geojson";
import type { PlaceSummary } from "@/types/domain";
import { cn } from "@/utils/cn";

import { VISITED_LAYER_ID, buildOfflineAtlasStyle } from "./atlasStyle";
import {
  LAYERS,
  installTravelLayers,
  setPlacesData,
  setRoutesData,
  setSelectedData,
} from "./mapLayers";
import { registerStyleImages } from "./pinImages";

// MapLibre 6 runs its tile/geometry work in a module web worker that the bundler must emit.
// This is the documented Turbopack/webpack pattern; without it the map hangs on "Worker failed to load".
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());

export interface CameraPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface TravelMapHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  /** Frame every visible place (or reset to the whole globe when there are none). */
  fitAll: () => void;
}

export type MapProjection = "globe" | "mercator";

interface TravelMapProps {
  ref?: Ref<TravelMapHandle>;
  places: readonly PlaceSummary[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  config: ClientMapConfig;
  projection: MapProjection;
  visitedCountryCodes: readonly string[];
  cameraPadding: CameraPadding;
  /** Fired when the first frame is ready, so the static poster can fade away. */
  onReady: () => void;
  /** The licensed provider failed to load; we switched to the bundled offline atlas. */
  onFallback: () => void;
  /** The map cannot run at all (no WebGL). The list view remains fully usable. */
  onFailure: () => void;
  className?: string;
}

const OFFLINE_MAX_ZOOM = 6.5;
const PROVIDER_MAX_ZOOM = 18;
const PROVIDER_TIMEOUT_MS = 12_000;
const INTRO_FLAG = "oops:intro-played";
const DEFAULT_CENTER: [number, number] = [15, 22];

/** Keeps the latest value in a ref so long-lived map event handlers never see stale props. */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

/**
 * How close to fly when a place is selected. With a licensed provider the street map takes over at
 * close zoom (cities at neighbourhood level, venues at street level); the country-level atlas has
 * no detail to show, so it stays further out where its coarse shapes still look good.
 */
function zoomForPlace(type: PlaceSummary["type"], providerActive: boolean): number {
  if (!providerActive) return type === "country" ? 3 : 4.2;
  if (type === "country") return 4.5;
  if (type === "city") return 10;
  return 14.5;
}

/** Zoom at which the whole globe comfortably fits the container. */
function globeZoom(width: number, height: number): number {
  const diameter = Math.max(220, Math.min(width, height) * 0.9);
  return Math.max(0.6, Math.log2((diameter * Math.PI) / 512));
}

function boundsOf(places: readonly PlaceSummary[]): LngLatBoundsLike | null {
  if (places.length === 0) return null;
  let west = 180;
  let east = -180;
  let south = 90;
  let north = -90;
  for (const place of places) {
    west = Math.min(west, place.lng);
    east = Math.max(east, place.lng);
    south = Math.min(south, place.lat);
    north = Math.max(north, place.lat);
  }
  return [
    [west, south],
    [east, north],
  ];
}

function visitedFilter(codes: readonly string[]): FilterSpecification {
  return ["in", ["get", "iso2"], ["literal", [...codes]]];
}

export function TravelMap({
  ref,
  places,
  selectedSlug,
  onSelect,
  config,
  projection,
  visitedCountryCodes,
  cameraPadding,
  onReady,
  onFallback,
  onFailure,
  className,
}: TravelMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  /** True while a licensed provider style (streets, POIs) is the active basemap. */
  const usingProviderRef = useRef(config.mode === "provider");

  const placesRef = useLatest(places);
  const selectedRef = useLatest(selectedSlug);
  const paddingRef = useLatest(cameraPadding);
  const projectionRef = useLatest(projection);
  const visitedRef = useLatest(visitedCountryCodes);
  const callbacks = useLatest({ onSelect, onReady, onFallback, onFailure });

  function currentData() {
    const list = placesRef.current;
    const selected = list.find((place) => place.slug === selectedRef.current);
    return {
      places: placesToGeoJson(list),
      routes: routesToGeoJson(list),
      selected: placesToGeoJson(selected ? [selected] : []),
    };
  }

  useImperativeHandle(ref, () => ({
    zoomIn: () => mapRef.current?.zoomIn({ duration: 300 }),
    zoomOut: () => mapRef.current?.zoomOut({ duration: 300 }),
    fitAll: () => {
      const map = mapRef.current;
      if (!map) return;
      const bounds = boundsOf(placesRef.current);
      if (!bounds) {
        const { clientWidth, clientHeight } = map.getContainer();
        map.flyTo({
          center: DEFAULT_CENTER,
          zoom: globeZoom(clientWidth, clientHeight),
          duration: 1200,
        });
      } else {
        map.fitBounds(bounds, { padding: 80, maxZoom: 5, duration: 1400 });
      }
    },
  }));

  // ── Create the map once ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const providerStyle = config.mode === "provider" ? config.styleUrl : null;
    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container,
        style: providerStyle ?? buildOfflineAtlasStyle(),
        center: DEFAULT_CENTER,
        zoom: globeZoom(container.clientWidth, container.clientHeight),
        minZoom: 0.5,
        maxZoom: providerStyle ? PROVIDER_MAX_ZOOM : OFFLINE_MAX_ZOOM,
        maxPitch: 0,
        dragRotate: false,
        attributionControl: false,
        fadeDuration: 150,
      });
    } catch {
      // Typically "WebGL is not supported": the list view is the fallback.
      callbacks.current.onFailure();
      return;
    }
    mapRef.current = map;

    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    // Attribution is a licence requirement of the data providers: always visible, never removed.
    map.addControl(new AttributionControl({ compact: true }), "bottom-right");
    registerStyleImages(map);

    let loaded = false;
    let usingFallback = !providerStyle;

    const switchToOfflineAtlas = () => {
      if (usingFallback) return;
      usingFallback = true;
      usingProviderRef.current = false;
      map.setMaxZoom(OFFLINE_MAX_ZOOM);
      map.setStyle(buildOfflineAtlasStyle());
      callbacks.current.onFallback();
    };

    map.on("style.load", () => {
      installTravelLayers(map, currentData());
      map.setProjection({ type: projectionRef.current });
      if (map.getLayer(VISITED_LAYER_ID))
        map.setFilter(VISITED_LAYER_ID, visitedFilter(visitedRef.current));
    });

    map.on("load", () => {
      loaded = true;
      callbacks.current.onReady();
      playIntro(map, placesRef.current);
    });

    // A provider that never answers (blocked, quota, offline) must not leave visitors with a blank map.
    const timeout = window.setTimeout(() => {
      if (!loaded) switchToOfflineAtlas();
    }, PROVIDER_TIMEOUT_MS);

    map.on("error", (event) => {
      if (!loaded) switchToOfflineAtlas();
      else console.warn("Map error", event.error?.message);
    });

    // Pins: select on click, show the title on hover (pointer only — keyboard users use the list).
    const hoverPopup = new Popup({
      closeButton: false,
      closeOnClick: false,
      offset: [0, -52],
      className: "oops-hover",
    });

    map.on("click", LAYERS.pins, (event) => {
      const slug = event.features?.[0]?.properties?.slug;
      if (typeof slug === "string") callbacks.current.onSelect(slug);
    });

    map.on("click", LAYERS.clusters, async (event) => {
      const feature = event.features?.[0];
      const clusterId = feature?.properties?.cluster_id;
      if (!feature || typeof clusterId !== "number" || feature.geometry.type !== "Point") return;
      const source = map.getSource("oops-places");
      if (!source || !("getClusterExpansionZoom" in source)) return;
      const zoom = await (
        source as { getClusterExpansionZoom: (id: number) => Promise<number> }
      ).getClusterExpansionZoom(clusterId);
      map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom: zoom + 0.2 });
    });

    for (const layer of [LAYERS.pins, LAYERS.clusters]) {
      map.on("mouseenter", layer, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", layer, () => {
        map.getCanvas().style.cursor = "";
        hoverPopup.remove();
      });
    }
    map.on("mousemove", LAYERS.pins, (event) => {
      const feature = event.features?.[0];
      if (!feature || feature.geometry.type !== "Point") return;
      const place = placesRef.current.find((item) => item.slug === feature.properties?.slug);
      if (place)
        hoverPopup
          .setLngLat(feature.geometry.coordinates as [number, number])
          .setText(place.title)
          .addTo(map);
    });

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);

    return () => {
      window.clearTimeout(timeout);
      resizeObserver.disconnect();
      hoverPopup.remove();
      map.remove();
      mapRef.current = null;
    };
    // The map is created exactly once; all later changes flow through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keep the map in sync with React state ──────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setPlacesData(map, placesToGeoJson(places));
    setRoutesData(map, routesToGeoJson(places));
  }, [places]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const selected = places.find((place) => place.slug === selectedSlug);
    setSelectedData(map, placesToGeoJson(selected ? [selected] : []));
    if (selected) {
      map.flyTo({
        center: [selected.lng, selected.lat],
        zoom: Math.max(map.getZoom(), zoomForPlace(selected.type, usingProviderRef.current)),
        padding: paddingRef.current,
        speed: 1.15,
        curve: 1.5,
      });
    }
    // Only a *selection change* moves the camera, not filter edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug]);

  useEffect(() => {
    const map = mapRef.current;
    // Before the style has loaded, the `style.load` handler applies the latest projection itself.
    if (map?.isStyleLoaded()) map.setProjection({ type: projection });
  }, [projection]);

  useEffect(() => {
    const map = mapRef.current;
    if (map?.getLayer(VISITED_LAYER_ID))
      map.setFilter(VISITED_LAYER_ID, visitedFilter(visitedCountryCodes));
  }, [visitedCountryCodes]);

  // MapLibre's stylesheet sets `.maplibregl-map { position: relative }` on its container, which
  // would override an `absolute inset-0` class. A sized wrapper keeps the container full-height.
  return (
    <div className={cn("absolute inset-0", className)}>
      <div
        ref={containerRef}
        className="h-full w-full"
        role="region"
        aria-label="Interactive map of places. Every place is also listed beside and below the map."
      />
    </div>
  );
}

/** One gentle camera move per browser session, skipped automatically for reduced-motion visitors. */
function playIntro(map: MapLibreMap, places: readonly PlaceSummary[]): void {
  try {
    if (sessionStorage.getItem(INTRO_FLAG)) return;
    sessionStorage.setItem(INTRO_FLAG, "1");
  } catch {
    return;
  }
  const bounds = boundsOf(places);
  if (!bounds) return;
  map.fitBounds(bounds, { padding: 90, maxZoom: 3.4, duration: 2600 });
}
