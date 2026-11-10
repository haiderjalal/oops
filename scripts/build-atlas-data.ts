/**
 * Builds public/data/countries-110m.geojson — the bundled "offline atlas" used when no licensed
 * map provider is configured. Source: Natural Earth 110m countries (public domain), via the
 * `world-atlas` package. Each feature gets its ISO 3166-1 alpha-2 code so visited countries can
 * be highlighted.
 *
 * Run: npm run data:atlas
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import countries from "i18n-iso-countries";
import type { FeatureCollection, Geometry } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";

const DECIMALS = 3;

function roundCoordinates(value: unknown): unknown {
  if (typeof value === "number") return Number(value.toFixed(DECIMALS));
  if (Array.isArray(value)) return value.map(roundCoordinates);
  return value;
}

async function main(): Promise<void> {
  const topologyPath = path.resolve("node_modules/world-atlas/countries-110m.json");
  const topology = JSON.parse(await readFile(topologyPath, "utf8")) as Topology;
  const collection = feature(
    topology,
    topology.objects.countries as GeometryCollection,
  ) as FeatureCollection<Geometry, { name?: string }>;

  const features = collection.features.map((item) => {
    const numeric = String(item.id ?? "").padStart(3, "0");
    const iso2 = countries.numericToAlpha2(numeric) ?? null;
    const geometry = item.geometry as Geometry & { coordinates: unknown };
    return {
      type: "Feature" as const,
      properties: { iso2, name: item.properties?.name ?? null },
      geometry: { ...geometry, coordinates: roundCoordinates(geometry.coordinates) },
    };
  });

  const output = path.resolve("public/data/countries-110m.geojson");
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify({ type: "FeatureCollection", features }));

  const withCode = features.filter((item) => item.properties.iso2).length;
  console.log(`Wrote ${features.length} countries (${withCode} with ISO codes) → ${output}`);
}

void main();
