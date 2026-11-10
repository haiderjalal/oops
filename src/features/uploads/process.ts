import sharp from "sharp";

import { AppError } from "@/lib/errors";

import { MAX_IMAGE_PIXELS, MAX_UPLOAD_BYTES, detectImageType } from "./validation";

/**
 * Turns an uploaded original into the files the site actually serves.
 *
 * Privacy: sharp writes NO metadata unless asked to, so every output is stripped of EXIF
 * (including GPS position, camera serial numbers, timestamps) and embedded profiles. The
 * original — which does contain them — is deleted right after processing and never served.
 */

export const FULL_MAX_EDGE = 2400;
export const THUMB_MAX_EDGE = 640;

export interface ProcessedImage {
  full: Buffer;
  thumb: Buffer;
  /** ~300 byte base64 placeholder for next/image `blurDataURL`. */
  blurDataUrl: string;
  width: number;
  height: number;
}

export async function processImage(input: Uint8Array): Promise<ProcessedImage> {
  if (input.byteLength > MAX_UPLOAD_BYTES) {
    throw new AppError("validation", `Photos can be up to ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);
  }
  if (!detectImageType(input)) {
    throw new AppError("validation", "That file isn't a JPEG, PNG, WebP or AVIF image.");
  }

  try {
    // `.rotate()` with no arguments applies the EXIF orientation to the pixels, so removing the
    // metadata doesn't leave portrait photos lying on their side.
    const base = sharp(input, { failOn: "error", limitInputPixels: MAX_IMAGE_PIXELS }).rotate();

    const { data: full, info } = await base
      .clone()
      .resize({
        width: FULL_MAX_EDGE,
        height: FULL_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    const thumb = await base
      .clone()
      .resize({
        width: THUMB_MAX_EDGE,
        height: THUMB_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 76, effort: 4 })
      .toBuffer();

    const blur = await base.clone().resize({ width: 16 }).webp({ quality: 30 }).toBuffer();

    return {
      full,
      thumb,
      blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
      width: info.width,
      height: info.height,
    };
  } catch (cause) {
    throw new AppError(
      "validation",
      "We couldn't read that image. It may be corrupted or too large.",
      { cause },
    );
  }
}
