import type { Map as MapLibreMap, StyleImageInterface } from "maplibre-gl";

import { PLACE_TYPE_META } from "@/constants/placeTypes";
import { PLACE_TYPES, type PlaceType } from "@/types/domain";

/**
 * Pins and cluster badges are drawn once on a canvas and handed to MapLibre as sprites, so
 * hundreds of places cost a single symbol layer instead of hundreds of DOM markers.
 * Images are created lazily, the first time the style asks for an id we haven't added yet.
 */

const PIXEL_RATIO = 2;
const CORAL = "#fa6b4a";
const LAVENDER = "#a8a4e6";
const OCEAN = "#164f68";
const SUNRISE = "#f2c66d";
const WHITE = "#fffdf8";

export const PIN_WIDTH = 48;
export const PIN_HEIGHT = 60;

export function pinImageId(type: PlaceType, demo: boolean): string {
  return `pin-${type}${demo ? "-demo" : ""}`;
}

function makeCanvas(
  width: number,
  height: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * PIXEL_RATIO);
  canvas.height = Math.round(height * PIXEL_RATIO);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is not available");
  ctx.scale(PIXEL_RATIO, PIXEL_RATIO);
  return { canvas, ctx };
}

function drawPin(type: PlaceType, demo: boolean): ImageData {
  const { canvas, ctx } = makeCanvas(PIN_WIDTH, PIN_HEIGHT);
  ctx.translate(2, 2);

  // Teardrop body.
  ctx.beginPath();
  ctx.moveTo(22, 56);
  ctx.bezierCurveTo(22, 56, 3, 38, 3, 22);
  ctx.arc(22, 22, 19, Math.PI, Math.PI * 2, false);
  ctx.bezierCurveTo(41, 38, 22, 56, 22, 56);
  ctx.closePath();

  ctx.shadowColor = "rgba(13, 52, 71, 0.5)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = demo ? LAVENDER : CORAL;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 3;
  ctx.strokeStyle = WHITE;
  ctx.stroke();

  // Glyph disc. Demo pins get a dashed rim so they are distinguishable without relying on colour.
  ctx.beginPath();
  ctx.arc(22, 22, 12.5, 0, Math.PI * 2);
  ctx.fillStyle = WHITE;
  ctx.fill();
  if (demo) {
    ctx.setLineDash([3, 2.5]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#54509f";
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.font = '16px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(PLACE_TYPE_META[type].emoji, 22, 23);

  return canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
}

function drawCluster(count: number): ImageData {
  const radius = count < 10 ? 17 : count < 50 ? 21 : 26;
  const size = radius * 2 + 10;
  const { canvas, ctx } = makeCanvas(size, size);
  const center = size / 2;

  ctx.shadowColor = "rgba(13, 52, 71, 0.45)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fillStyle = SUNRISE;
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.beginPath();
  ctx.arc(center, center, radius - 3.5, 0, Math.PI * 2);
  ctx.fillStyle = OCEAN;
  ctx.fill();

  ctx.fillStyle = WHITE;
  ctx.font = `800 ${radius > 20 ? 17 : 15}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(count > 999 ? "999+" : String(count), center, center + 1);

  return canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
}

type ImageResult = { data: ImageData; pixelRatio: number } | null;

/** Builds the sprite for a style image id (`pin-cafe`, `pin-city-demo`, `cluster-12`). */
export function createStyleImage(id: string): ImageResult {
  const pin = /^pin-([a-z]+)(-demo)?$/.exec(id);
  if (pin) {
    const type = pin[1] as PlaceType;
    if (!PLACE_TYPES.includes(type)) return null;
    return { data: drawPin(type, Boolean(pin[2])), pixelRatio: PIXEL_RATIO };
  }

  const cluster = /^cluster-(\d+)$/.exec(id);
  if (cluster) return { data: drawCluster(Number(cluster[1])), pixelRatio: PIXEL_RATIO };

  return null;
}

/** Registers a resolver so MapLibre asks us for any pin/cluster sprite the first time it needs it. */
export function registerStyleImages(map: MapLibreMap): void {
  map.setMissingStyleImageResolver((id) => {
    if (map.hasImage(id)) return;
    const image = createStyleImage(id);
    if (!image) return;
    map.addImage(id, image.data as unknown as StyleImageInterface | ImageData, {
      pixelRatio: image.pixelRatio,
    });
  });
}
