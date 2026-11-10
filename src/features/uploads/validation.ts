import { z } from "zod";

export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;
export type AllowedUploadType = (typeof ALLOWED_UPLOAD_TYPES)[number];

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 100_000_000;
/** Overall library quota: a safety net against runaway storage costs. */
export const MAX_LIBRARY_PHOTOS = 3000;
export const UPLOAD_URL_TTL_SECONDS = 300;

export const signRequestSchema = z.object({
  contentType: z.enum(ALLOWED_UPLOAD_TYPES, "Use a JPEG, PNG, WebP or AVIF image."),
  size: z
    .number()
    .int()
    .min(1, "That file is empty.")
    .max(MAX_UPLOAD_BYTES, `Photos can be up to ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`),
});

export const finalizeRequestSchema = z.object({ uploadId: z.uuid() });

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((value, index) => bytes[offset + index] === value);
}

/**
 * Identify an image by its leading bytes ("magic numbers"), never by file name or the
 * browser-reported MIME type, both of which are trivially forged.
 */
export function detectImageType(bytes: Uint8Array): AllowedUploadType | null {
  if (bytes.length < 12) return null;
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // RIFF....WEBP
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8))
    return "image/webp";
  // ISO base media: ....ftypavif / ftypavis
  if (startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4)) {
    const brand = String.fromCharCode(...bytes.slice(8, 12));
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  return null;
}
