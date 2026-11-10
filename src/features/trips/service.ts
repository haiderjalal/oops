import type { Database } from "@/lib/db/client";
import { isUniqueViolation } from "@/lib/db/errors";
import { AppError, NotFoundError } from "@/lib/errors";
import { slugify, uniqueSlug } from "@/utils/slug";

import {
  deleteTripRow,
  findTripById,
  insertTrip,
  isTripSlugTaken,
  updateTripRow,
} from "./trips.repository";
import type { TripInput } from "./schema";

function toRow(input: TripInput, slug: string) {
  return {
    slug,
    title: input.title,
    startDate: input.startDate || null,
    endDate: input.endDate || null,
    description: input.description,
    status: input.status,
  };
}

async function resolveSlug(db: Database, input: TripInput, excludeId?: string): Promise<string> {
  if (input.slug) {
    if (await isTripSlugTaken(db, input.slug, excludeId)) {
      throw new AppError("conflict", "Another trip already uses that web address.");
    }
    return input.slug;
  }
  return uniqueSlug(slugify(input.title, "trip"), (candidate) =>
    isTripSlugTaken(db, candidate, excludeId),
  );
}

export async function createTrip(
  db: Database,
  input: TripInput,
): Promise<{ id: string; slug: string }> {
  const slug = await resolveSlug(db, input);
  try {
    const row = await insertTrip(db, toRow(input, slug));
    return { id: row.id, slug: row.slug };
  } catch (error) {
    if (isUniqueViolation(error))
      throw new AppError("conflict", "Another trip already uses that web address.");
    throw error;
  }
}

export async function updateTrip(
  db: Database,
  id: string,
  input: TripInput,
): Promise<{ id: string; slug: string }> {
  if (!(await findTripById(db, id))) throw new NotFoundError("That trip no longer exists.");
  const slug = await resolveSlug(db, input, id);
  try {
    const row = await updateTripRow(db, id, toRow(input, slug));
    if (!row) throw new NotFoundError("That trip no longer exists.");
    return { id: row.id, slug: row.slug };
  } catch (error) {
    if (isUniqueViolation(error))
      throw new AppError("conflict", "Another trip already uses that web address.");
    throw error;
  }
}

export async function removeTrip(db: Database, id: string): Promise<void> {
  if (!(await deleteTripRow(db, id))) throw new NotFoundError("That trip no longer exists.");
}
