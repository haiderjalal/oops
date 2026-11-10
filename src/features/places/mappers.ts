import type { PhotoRow } from "@/lib/db/schema";
import type { PhotoView, PlaceDetail, PlaceSummary } from "@/types/domain";
import { approximateCoordinates } from "@/utils/geo";
import { variantKey } from "@/features/uploads/keys";

import type { PlaceDetailRecord, PlaceRecord } from "./places.repository";
import type { PlaceInput } from "./schema";

/** Turns a storage key into a public URL. Injected so mappers stay pure and testable. */
export interface MapperContext {
  publicUrl: (key: string) => string;
}

export function toPhotoView(row: PhotoRow, context: MapperContext): PhotoView {
  return {
    id: row.id,
    url: context.publicUrl(variantKey(row.storageKey, "full")),
    thumbUrl: context.publicUrl(variantKey(row.storageKey, "thumb")),
    alt: row.alt,
    caption: row.caption,
    width: row.width,
    height: row.height,
    blurDataUrl: row.blurDataUrl,
  };
}

/**
 * Public view of a place. This is the privacy boundary: exact coordinates and street-level
 * detail never leave the server for places marked "approximate".
 */
export function toPlaceSummary(record: PlaceRecord, context: MapperContext): PlaceSummary {
  const { place } = record;
  const approximate = place.locationPrivacy === "approximate";
  const coordinates = approximate
    ? approximateCoordinates(place.lat, place.lng)
    : { lat: place.lat, lng: place.lng };

  return {
    id: place.id,
    slug: place.slug,
    title: place.title,
    type: place.type,
    lat: coordinates.lat,
    lng: coordinates.lng,
    approximate,
    city: place.city,
    region: place.region,
    countryCode: place.countryCode,
    countryName: place.countryName,
    visitedAt: place.visitedAt,
    excerpt: place.excerpt,
    funnyMoment: place.funnyMoment,
    rating: place.rating,
    isDemo: place.isDemo,
    cover: record.cover ? toPhotoView(record.cover, context) : null,
    tripSlug: record.trip?.slug ?? null,
    tripTitle: record.trip?.title ?? null,
    tags: record.tags,
  };
}

export function toPlaceDetail(record: PlaceDetailRecord, context: MapperContext): PlaceDetail {
  const summary = toPlaceSummary(record, context);
  const { place } = record;

  return {
    ...summary,
    story: place.story,
    placeName: summary.approximate ? null : place.placeName,
    formattedAddress: summary.approximate ? null : place.formattedAddress,
    photos: record.photos.map((photo) => toPhotoView(photo, context)),
    publishedAt: (place.publishedAt ?? place.createdAt).toISOString(),
    updatedAt: place.updatedAt.toISOString(),
  };
}

/** Admin: hydrate the editor form from a stored place (exact coordinates, never rounded). */
export function toPlaceInput(record: PlaceDetailRecord): PlaceInput {
  const { place } = record;
  return {
    title: place.title,
    slug: place.slug,
    type: place.type,
    lat: place.lat,
    lng: place.lng,
    locationPrivacy: place.locationPrivacy,
    geocoderProvider: place.geocoderProvider ?? "",
    providerPlaceId: place.providerPlaceId ?? "",
    placeName: place.placeName ?? "",
    formattedAddress: place.formattedAddress ?? "",
    city: place.city ?? "",
    region: place.region ?? "",
    countryCode: place.countryCode ?? "",
    countryName: place.countryName ?? "",
    visitedAt: place.visitedAt ?? "",
    excerpt: place.excerpt,
    story: place.story,
    funnyMoment: place.funnyMoment ?? "",
    rating: place.rating,
    tripId: place.tripId ?? "",
    tags: record.tags,
    status: place.status,
    // Only surface a schedule when it is genuinely in the future.
    publishAt:
      place.status === "published" && place.publishedAt && place.publishedAt.getTime() > Date.now()
        ? place.publishedAt.toISOString()
        : "",
    coverPhotoId: place.coverPhotoId ?? "",
    photos: record.photos.map((photo) => ({
      id: photo.id,
      alt: photo.alt,
      caption: photo.caption ?? "",
    })),
  };
}
