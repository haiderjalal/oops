import { geoCentroid, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import landTopology from "world-atlas/land-110m.json";

import type { PlaceSummary } from "@/types/domain";
import { cn } from "@/utils/cn";

/**
 * Static SVG globe, rendered on the server. It is the "poster" shown while the interactive map
 * loads — and the permanent fallback if WebGL or the map bundle is unavailable. It costs no
 * JavaScript and no network requests.
 */

const SIZE = 400;
const RADIUS = 186;
const MAX_PINS = 80;
const DEFAULT_CENTER: [number, number] = [20, 22];

const land = feature(
  landTopology as unknown as Topology,
  (landTopology as unknown as Topology).objects.land as GeometryCollection,
) as unknown as { features: Feature<Polygon | MultiPolygon>[] };

/** Land outlines are identical for every render with the same rotation, so compute them once. */
const landPathCache = new Map<string, { sphere: string; land: string; graticule: string }>();

function projectionFor(center: [number, number]) {
  return geoOrthographic()
    .translate([SIZE / 2, SIZE / 2])
    .scale(RADIUS)
    .rotate([-center[0], -center[1]])
    .clipAngle(90)
    .precision(0.6);
}

function outlines(center: [number, number]) {
  const key = center.map((value) => value.toFixed(1)).join(",");
  const cached = landPathCache.get(key);
  if (cached) return cached;

  const path = geoPath(projectionFor(center)).digits(1);
  const result = {
    sphere: path({ type: "Sphere" }) ?? "",
    land: land.features.map((item) => path(item) ?? "").join(""),
    graticule: path(geoGraticule10()) ?? "",
  };
  landPathCache.set(key, result);
  return result;
}

/** The minimum a pin needs. Lets bucket-list items and places share one poster. */
export type PosterPin = Pick<PlaceSummary, "slug" | "lat" | "lng" | "isDemo">;

function centerOf(places: readonly PosterPin[]): [number, number] {
  if (places.length === 0) return DEFAULT_CENTER;
  const [lng, lat] = geoCentroid({
    type: "MultiPoint",
    coordinates: places.map((place) => [place.lng, place.lat]),
  });
  return [lng ?? DEFAULT_CENTER[0], Math.max(-45, Math.min(55, lat ?? DEFAULT_CENTER[1]))];
}

interface GlobePosterProps {
  places?: readonly PosterPin[];
  className?: string;
  /** Override the auto-centre (e.g. to focus on one place). */
  center?: [number, number];
  label?: string;
  /** `sunrise` pins mark places still on the wish list (not visited). */
  tone?: "visited" | "planned";
}

export function GlobePoster({
  places = [],
  className,
  center,
  label,
  tone = "visited",
}: GlobePosterProps) {
  const focus = center ?? centerOf(places);
  const shapes = outlines(focus);
  const projection = projectionFor(focus);

  const pins = places.slice(0, MAX_PINS).flatMap((place) => {
    const point = projection([place.lng, place.lat]);
    return point ? [{ id: place.slug, x: point[0], y: point[1], demo: place.isDemo }] : [];
  });

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={label ?? `Illustration of the globe with ${pins.length} pinned places`}
      className={cn("block h-full w-full", className)}
    >
      <defs>
        <radialGradient id="poster-ocean" cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#4d96b5" />
          <stop offset="0.55" stopColor="#2f7a99" />
          <stop offset="1" stopColor="#164f68" />
        </radialGradient>
        <radialGradient id="poster-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0.82" stopColor="#a9d6e8" stopOpacity="0" />
          <stop offset="1" stopColor="#a9d6e8" stopOpacity="0.55" />
        </radialGradient>
      </defs>

      <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS + 12} fill="url(#poster-glow)" />
      <path d={shapes.sphere} fill="url(#poster-ocean)" />
      <path
        d={shapes.graticule}
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.22"
        strokeWidth="0.8"
        strokeDasharray="2 3"
      />
      <path
        d={shapes.land}
        fill="#f1e6cd"
        stroke="#c2ae84"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      <path d={shapes.sphere} fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.5" />
      <ellipse
        cx={SIZE * 0.36}
        cy={SIZE * 0.27}
        rx="70"
        ry="42"
        fill="#ffffff"
        opacity="0.08"
        transform="rotate(-24 144 108)"
      />

      {pins.map((pin) => (
        <g key={pin.id} transform={`translate(${pin.x.toFixed(1)} ${pin.y.toFixed(1)})`}>
          <path
            d="M0 0C-7-8-9-13-9-17a9 9 0 0 1 18 0C9-13 7-8 0 0z"
            fill={tone === "planned" ? "#f2c66d" : pin.demo ? "#a8a4e6" : "#fa6b4a"}
            stroke="#fffdf8"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeDasharray={tone === "planned" ? "3 2" : undefined}
          />
          <circle cy="-17" r="3.2" fill="#fffdf8" />
        </g>
      ))}
    </svg>
  );
}
