import type { Database } from "@/lib/db/client";
import { AppError, NotFoundError } from "@/lib/errors";
import { roundTo } from "@/utils/geo";

import { findPlaceById } from "@/features/places/places.repository";

import {
  deleteBucketItemRow,
  findBucketItemById,
  insertBucketItem,
  updateBucketItemRow,
} from "./bucket.repository";
import type { BucketItemInput } from "./schema";

async function toRow(db: Database, input: BucketItemInput) {
  let linkedPlaceId: string | null = null;
  if (input.linkedPlaceId) {
    const place = await findPlaceById(db, input.linkedPlaceId);
    if (!place) throw new AppError("validation", "That journal entry no longer exists.");
    linkedPlaceId = place.place.id;
  }

  return {
    placeName: input.placeName,
    lat: roundTo(input.lat, 6),
    lng: roundTo(input.lng, 6),
    countryCode: input.countryCode ? input.countryCode.toUpperCase() : null,
    countryName: input.countryName || null,
    geocoderProvider: input.geocoderProvider || null,
    providerPlaceId: input.providerPlaceId || null,
    note: input.note,
    status: input.status,
    // A planned wish can't be linked to a visit.
    linkedPlaceId: input.status === "completed" ? linkedPlaceId : null,
  };
}

export async function createBucketItem(
  db: Database,
  input: BucketItemInput,
): Promise<{ id: string }> {
  const row = await insertBucketItem(db, await toRow(db, input));
  return { id: row.id };
}

export async function updateBucketItem(
  db: Database,
  id: string,
  input: BucketItemInput,
): Promise<{ id: string }> {
  if (!(await findBucketItemById(db, id)))
    throw new NotFoundError("That bucket-list item no longer exists.");
  const row = await updateBucketItemRow(db, id, await toRow(db, input));
  if (!row) throw new NotFoundError("That bucket-list item no longer exists.");
  return { id: row.id };
}

export async function removeBucketItem(db: Database, id: string): Promise<void> {
  if (!(await deleteBucketItemRow(db, id)))
    throw new NotFoundError("That bucket-list item no longer exists.");
}
