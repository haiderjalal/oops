import type { Database } from "@/lib/db/client";
import { isUniqueViolation } from "@/lib/db/errors";
import { AppError, NotFoundError } from "@/lib/errors";
import { slugify, uniqueSlug } from "@/utils/slug";
import { roundTo } from "@/utils/geo";

import { findTripById } from "@/features/trips/trips.repository";

import {
  existingPhotoIds,
  findPlaceById,
  insertPlace,
  isSlugTaken,
  photosAttachedElsewhere,
  replaceTags,
  setDeleted,
  syncPhotos,
  updatePlaceRow,
} from "./places.repository";
import type { PlaceInput } from "./schema";

/**
 * Business rules for saving a place: slug uniqueness, publish timestamps, photo ownership,
 * cover selection. Callers must already have verified the owner and validated `input`.
 */

export interface SavedPlace {
  id: string;
  slug: string;
  status: PlaceInput["status"];
}

const COORDINATE_DECIMALS = 6;

/**
 * When does the place go live?
 *  - drafts have no publication time
 *  - an explicit schedule wins
 *  - otherwise keep an existing time that has already passed, else publish now
 */
export function resolvePublishedAt(
  input: Pick<PlaceInput, "status" | "publishAt">,
  existing: Date | null,
  now: Date,
): Date | null {
  if (input.status !== "published") return null;
  if (input.publishAt) return new Date(input.publishAt);
  return existing && existing.getTime() <= now.getTime() ? existing : now;
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

async function resolveSlug(db: Database, input: PlaceInput, excludeId?: string): Promise<string> {
  if (input.slug) {
    if (await isSlugTaken(db, input.slug, excludeId)) {
      throw new AppError(
        "conflict",
        "Another place already uses that web address. Try a different one.",
      );
    }
    return input.slug;
  }
  return uniqueSlug(slugify(input.title, "place"), (candidate) =>
    isSlugTaken(db, candidate, excludeId),
  );
}

async function assertReferencesExist(
  db: Database,
  input: PlaceInput,
  placeId?: string,
): Promise<void> {
  if (input.tripId && !(await findTripById(db, input.tripId))) {
    throw new AppError("validation", "That trip no longer exists.");
  }

  const photoIds = input.photos.map((photo) => photo.id);
  const existing = await existingPhotoIds(db, photoIds);
  if (existing.size !== photoIds.length) {
    throw new AppError(
      "validation",
      "One of the photos no longer exists. Re-upload it and try again.",
    );
  }
  if ((await photosAttachedElsewhere(db, photoIds, placeId)).length > 0) {
    throw new AppError("validation", "One of those photos already belongs to another place.");
  }
}

function buildRow(
  input: PlaceInput,
  slug: string,
  publishedAt: Date | null,
  coverPhotoId: string | null,
) {
  return {
    slug,
    title: input.title,
    type: input.type,
    lat: roundTo(input.lat, COORDINATE_DECIMALS),
    lng: roundTo(input.lng, COORDINATE_DECIMALS),
    locationPrivacy: input.locationPrivacy,
    geocoderProvider: emptyToNull(input.geocoderProvider),
    providerPlaceId: emptyToNull(input.providerPlaceId),
    placeName: emptyToNull(input.placeName),
    formattedAddress: emptyToNull(input.formattedAddress),
    city: emptyToNull(input.city),
    region: emptyToNull(input.region),
    countryCode: input.countryCode ? input.countryCode.toUpperCase() : null,
    countryName: emptyToNull(input.countryName),
    visitedAt: input.visitedAt || null,
    excerpt: input.excerpt,
    story: input.story,
    funnyMoment: emptyToNull(input.funnyMoment),
    rating: input.rating,
    status: input.status,
    tripId: input.tripId || null,
    coverPhotoId,
    publishedAt,
  };
}

function resolveCover(input: PlaceInput): string | null {
  if (input.coverPhotoId) return input.coverPhotoId;
  return input.photos[0]?.id ?? null;
}

function translateWriteError(error: unknown): never {
  if (isUniqueViolation(error)) {
    throw new AppError(
      "conflict",
      "Another place already uses that web address. Try a different one.",
    );
  }
  throw error;
}

export async function createPlace(
  db: Database,
  input: PlaceInput,
  now: Date = new Date(),
): Promise<SavedPlace> {
  await assertReferencesExist(db, input);
  const slug = await resolveSlug(db, input);
  const publishedAt = resolvePublishedAt(input, null, now);

  try {
    return await db.transaction(async (tx) => {
      // Insert without the cover first: the cover FK can only point at a photo already attached.
      const row = await insertPlace(tx, { ...buildRow(input, slug, publishedAt, null) });
      await replaceTags(tx, row.id, input.tags);
      await syncPhotos(
        tx,
        row.id,
        input.photos.map((photo) => ({
          id: photo.id,
          alt: photo.alt,
          caption: emptyToNull(photo.caption),
        })),
      );
      const coverPhotoId = resolveCover(input);
      if (coverPhotoId) await updatePlaceRow(tx, row.id, { coverPhotoId });
      return { id: row.id, slug: row.slug, status: row.status };
    });
  } catch (error) {
    return translateWriteError(error);
  }
}

export async function updatePlace(
  db: Database,
  id: string,
  input: PlaceInput,
  now: Date = new Date(),
): Promise<SavedPlace> {
  const existing = await findPlaceById(db, id);
  if (!existing) throw new NotFoundError("That place no longer exists.");

  await assertReferencesExist(db, input, id);
  const slug = await resolveSlug(db, input, id);
  const publishedAt = resolvePublishedAt(input, existing.place.publishedAt, now);

  try {
    return await db.transaction(async (tx) => {
      await replaceTags(tx, id, input.tags);
      await syncPhotos(
        tx,
        id,
        input.photos.map((photo) => ({
          id: photo.id,
          alt: photo.alt,
          caption: emptyToNull(photo.caption),
        })),
      );
      const row = await updatePlaceRow(
        tx,
        id,
        buildRow(input, slug, publishedAt, resolveCover(input)),
      );
      if (!row) throw new NotFoundError("That place no longer exists.");
      return { id: row.id, slug: row.slug, status: row.status };
    });
  } catch (error) {
    return translateWriteError(error);
  }
}

/** Soft delete: the place disappears from the public site but can be restored from the dashboard. */
export async function deletePlace(db: Database, id: string): Promise<{ slug: string }> {
  const existing = await findPlaceById(db, id);
  if (!existing) throw new NotFoundError("That place no longer exists.");
  await setDeleted(db, id, true);
  return { slug: existing.place.slug };
}

export async function restorePlace(db: Database, id: string): Promise<{ slug: string }> {
  const existing = await findPlaceById(db, id);
  if (!existing) throw new NotFoundError("That place no longer exists.");
  await setDeleted(db, id, false);
  return { slug: existing.place.slug };
}
