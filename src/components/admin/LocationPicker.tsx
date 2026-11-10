"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useRef } from "react";
import {
  AttributionControl,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl";

import { buildOfflineAtlasStyle } from "@/components/map/atlasStyle";
import type { ClientMapConfig } from "@/lib/config";
import { roundTo } from "@/utils/geo";

// Same bundler requirement as the public map (see components/map/TravelMap.tsx).
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());

interface LocationPickerProps {
  lat: number;
  lng: number;
  /** False until the owner has chosen a spot; the map then starts on the whole world. */
  hasLocation: boolean;
  config: ClientMapConfig;
  onChange: (lat: number, lng: number) => void;
}

const WORLD_CENTER: [number, number] = [10, 25];

/**
 * Map for placing and correcting a pin: click anywhere, or drag the pin. Geocoders are often a few
 * hundred metres off (or pick the wrong "Springfield"), so the owner always has the final say.
 * Typing exact coordinates in the form is the keyboard-accessible equivalent.
 */
export function LocationPicker({ lat, lng, hasLocation, config, onChange }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const provider = config.mode === "provider" ? config.styleUrl : null;
    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container,
        style: provider ?? buildOfflineAtlasStyle(),
        center: hasLocation ? [lng, lat] : WORLD_CENTER,
        zoom: hasLocation ? (provider ? 12 : 4) : 1.4,
        maxZoom: provider ? 19 : 6.5,
        maxPitch: 0,
        dragRotate: false,
        attributionControl: false,
        // Scrolling the page past the map must not accidentally zoom it.
        cooperativeGestures: true,
      });
    } catch {
      return; // no WebGL: the numeric inputs still work
    }
    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new AttributionControl({ compact: true }), "bottom-right");

    // Flat projection is easier for precise placement than the globe.
    map.on("style.load", () => map.setProjection({ type: "mercator" }));
    map.on("error", () => {
      if (!map.isStyleLoaded() && provider && !map.getStyle()?.layers?.length)
        map.setStyle(buildOfflineAtlasStyle());
    });

    const marker = new Marker({ draggable: true, color: "#fa6b4a" }).setLngLat(
      hasLocation ? [lng, lat] : WORLD_CENTER,
    );
    if (hasLocation) marker.addTo(map);
    markerRef.current = marker;

    const commit = (point: { lat: number; lng: number }) =>
      onChangeRef.current(roundTo(point.lat, 6), roundTo(((point.lng + 540) % 360) - 180, 6));

    marker.on("dragend", () => commit(marker.getLngLat()));
    map.on("click", (event) => {
      marker.setLngLat(event.lngLat).addTo(map);
      commit(event.lngLat);
    });

    return () => {
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Created once; position updates arrive through the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Typed coordinates or a search result moved the pin: follow it.
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || !hasLocation) return;

    const current = marker.getLngLat();
    const moved = Math.abs(current.lat - lat) > 1e-6 || Math.abs(current.lng - lng) > 1e-6;
    marker.setLngLat([lng, lat]).addTo(map);
    if (moved) {
      map.flyTo({
        center: [lng, lat],
        zoom: Math.max(map.getZoom(), config.mode === "provider" ? 12 : 4),
        duration: 900,
      });
    }
  }, [lat, lng, hasLocation, config.mode]);

  return (
    <div className="relative h-72 overflow-hidden rounded-2xl border border-line sm:h-96">
      <div
        ref={containerRef}
        className="h-full w-full"
        role="region"
        aria-label="Map for placing the pin. Click the map or drag the pin. You can also type exact coordinates below."
      />
    </div>
  );
}
