import { randomUUID } from "node:crypto";

import type { Database } from "@/lib/db/client";
import { AppError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { StorageProvider, UploadTarget } from "@/lib/storage/types";
import type { PhotoView } from "@/types/domain";

import { toPhotoView } from "@/features/places/mappers";

import { incomingKey, photoBaseKey, variantKey } from "./keys";
import { countPhotos, deletePhotoRow, findPhotoById, insertPhoto } from "./photos.repository";
import { processImage } from "./process";
import {
  type AllowedUploadType,
  MAX_LIBRARY_PHOTOS,
  MAX_UPLOAD_BYTES,
  UPLOAD_URL_TTL_SECONDS,
} from "./validation";

const WEBP = "image/webp";

/** Step 1: approve an upload and hand the browser a short-lived, size-bound target. */
export async function requestUpload(
  storage: StorageProvider,
  db: Database,
  input: { contentType: AllowedUploadType; size: number },
): Promise<{ uploadId: string; target: UploadTarget }> {
  if (input.size > MAX_UPLOAD_BYTES) throw new AppError("validation", "That photo is too large.");
  if ((await countPhotos(db)) >= MAX_LIBRARY_PHOTOS) {
    throw new AppError("validation", "The photo library is full. Delete some unused photos first.");
  }

  const uploadId = randomUUID();
  const target = await storage.createUploadTarget({
    key: incomingKey(uploadId),
    contentType: input.contentType,
    contentLength: input.size,
    expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
  });
  return { uploadId, target };
}

/**
 * Step 2: after the browser has uploaded the original, verify and process it on the server.
 * Nothing the client claims is trusted: type is detected from bytes, metadata is stripped,
 * and only processed files are ever made public.
 */
export async function finalizeUpload(
  storage: StorageProvider,
  db: Database,
  uploadId: string,
  now: Date = new Date(),
): Promise<PhotoView> {
  const original = await storage.getObject(incomingKey(uploadId));
  if (!original)
    throw new NotFoundError("That upload expired or never arrived. Please add the photo again.");

  try {
    const processed = await processImage(original);
    const base = photoBaseKey(uploadId, now);

    await Promise.all([
      storage.putObject(variantKey(base, "full"), processed.full, WEBP),
      storage.putObject(variantKey(base, "thumb"), processed.thumb, WEBP),
    ]);

    const row = await insertPhoto(db, {
      storageKey: base,
      width: processed.width,
      height: processed.height,
      bytes: processed.full.byteLength,
      blurDataUrl: processed.blurDataUrl,
    });
    return toPhotoView(row, { publicUrl: (key) => storage.publicUrl(key) });
  } finally {
    // The original (with its metadata) must never outlive processing, success or not.
    await storage.deleteObject(incomingKey(uploadId)).catch((error: unknown) => {
      logger.warn("Could not delete an incoming upload", { error });
    });
  }
}

/** Deletes a photo row and its stored files. Photos still shown on a place are refused. */
export async function removePhoto(
  storage: StorageProvider,
  db: Database,
  id: string,
): Promise<void> {
  const photo = await findPhotoById(db, id);
  if (!photo) throw new NotFoundError("That photo no longer exists.");
  if (photo.placeId) {
    throw new AppError(
      "conflict",
      "That photo is used by a place. Remove it from the place first.",
    );
  }

  await deletePhotoRow(db, id);
  await Promise.all(
    (["full", "thumb"] as const).map((variant) =>
      storage.deleteObject(variantKey(photo.storageKey, variant)).catch((error: unknown) => {
        logger.warn("Could not delete a stored photo file", { error });
      }),
    ),
  );
}
