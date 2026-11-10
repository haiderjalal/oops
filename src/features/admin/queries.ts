import "server-only";

import { assertOwner } from "@/lib/auth/session";
import { getIntegrationStatus } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import { getStorage } from "@/lib/storage";
import type { PhotoView } from "@/types/domain";

import { findBucketItems } from "@/features/bucket/bucket.repository";
import { toPhotoView, toPlaceInput } from "@/features/places/mappers";
import {
  type AdminPlaceRow,
  findPlaceById,
  listPlacesForAdmin,
} from "@/features/places/places.repository";
import type { PlaceInput } from "@/features/places/schema";
import { listTripsForAdmin } from "@/features/trips/trips.repository";
import { type LibraryPhoto, listLibraryPhotos } from "@/features/uploads/photos.repository";

/**
 * Owner-only reads for the dashboard. Every function re-checks the session: these are never
 * cached and never reachable by visitors, even if a route were wired up by mistake.
 */

export interface AdminOverview {
  counts: { published: number; scheduled: number; drafts: number; deleted: number; demo: number };
  recent: AdminPlaceRow[];
  integrations: ReturnType<typeof getIntegrationStatus>;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  await assertOwner();
  const rows = await listPlacesForAdmin(await getDb(), { includeDeleted: true });
  const now = Date.now();

  const live = rows.filter((row) => !row.deletedAt);
  return {
    counts: {
      published: live.filter(
        (row) => row.status === "published" && (row.publishedAt?.getTime() ?? 0) <= now,
      ).length,
      scheduled: live.filter(
        (row) => row.status === "published" && (row.publishedAt?.getTime() ?? 0) > now,
      ).length,
      drafts: live.filter((row) => row.status === "draft").length,
      deleted: rows.length - live.length,
      demo: live.filter((row) => row.isDemo).length,
    },
    recent: live.slice(0, 8),
    integrations: getIntegrationStatus(),
  };
}

/** A dashboard row with its public visibility worked out on the server (no clock reads in components). */
export interface AdminPlaceView extends AdminPlaceRow {
  scheduled: boolean;
  live: boolean;
}

export async function getAdminPlaces(includeDeleted: boolean): Promise<AdminPlaceView[]> {
  await assertOwner();
  const rows = await listPlacesForAdmin(await getDb(), { includeDeleted });
  const now = Date.now();
  return rows.map((row) => {
    const reached = (row.publishedAt?.getTime() ?? Infinity) <= now;
    const published = row.status === "published" && !row.deletedAt;
    return { ...row, scheduled: published && !reached, live: published && reached };
  });
}

export interface PlaceFormData {
  id: string;
  slug: string;
  isDemo: boolean;
  deleted: boolean;
  isLive: boolean;
  values: PlaceInput;
  photos: PhotoView[];
}

export async function getPlaceFormData(id: string): Promise<PlaceFormData | null> {
  await assertOwner();
  const record = await findPlaceById(await getDb(), id);
  if (!record) return null;

  const storage = getStorage();
  const context = { publicUrl: (key: string) => storage.publicUrl(key) };
  return {
    id: record.place.id,
    slug: record.place.slug,
    isDemo: record.place.isDemo,
    deleted: Boolean(record.place.deletedAt),
    isLive:
      record.place.status === "published" &&
      !record.place.deletedAt &&
      (record.place.publishedAt?.getTime() ?? Infinity) <= Date.now(),
    values: toPlaceInput(record),
    photos: record.photos.map((photo) => toPhotoView(photo, context)),
  };
}

export interface TripOption {
  id: string;
  title: string;
}

export async function getTripOptions(): Promise<TripOption[]> {
  await assertOwner();
  const trips = await listTripsForAdmin(await getDb());
  return trips.map((trip) => ({ id: trip.id, title: trip.title }));
}

export async function getAdminTrips() {
  await assertOwner();
  return listTripsForAdmin(await getDb());
}

export async function getAdminBucketItems() {
  await assertOwner();
  return findBucketItems(await getDb(), { includeDemo: true });
}

export interface LibraryEntry extends LibraryPhoto {
  view: PhotoView;
}

export async function getMediaLibrary(): Promise<LibraryEntry[]> {
  await assertOwner();
  const storage = getStorage();
  const context = { publicUrl: (key: string) => storage.publicUrl(key) };
  const entries = await listLibraryPhotos(await getDb());
  return entries.map((entry) => ({ ...entry, view: toPhotoView(entry.photo, context) }));
}

/** Published places the owner can link a completed bucket-list item to. */
export async function getLinkablePlaces(): Promise<{ id: string; title: string }[]> {
  await assertOwner();
  const rows = await listPlacesForAdmin(await getDb(), { includeDeleted: false });
  return rows
    .filter((row) => row.status === "published")
    .map((row) => ({ id: row.id, title: row.title }));
}
