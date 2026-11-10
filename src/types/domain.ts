/**
 * Shared domain vocabulary. Imported by the database schema, Zod schemas and the UI so a
 * value can never be valid in one layer and unknown in another.
 */

export const PLACE_TYPES = [
  "country",
  "city",
  "cafe",
  "restaurant",
  "attraction",
  "hotel",
  "other",
] as const;
export type PlaceType = (typeof PLACE_TYPES)[number];

export const PUBLICATION_STATUSES = ["draft", "published"] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export const BUCKET_STATUSES = ["planned", "completed"] as const;
export type BucketStatus = (typeof BUCKET_STATUSES)[number];

/**
 * How precisely a place is shown to the public.
 * `approximate` rounds public coordinates and hides the street address (owner safety).
 */
export const LOCATION_PRIVACY = ["exact", "approximate"] as const;
export type LocationPrivacy = (typeof LOCATION_PRIVACY)[number];

/** A photo as the public site (and the editor) sees it. URLs are already resolved. */
export interface PhotoView {
  id: string;
  url: string;
  thumbUrl: string;
  alt: string;
  caption: string | null;
  width: number;
  height: number;
  blurDataUrl: string | null;
}

/** Everything the map, lists and cards need about a published place. */
export interface PlaceSummary {
  id: string;
  slug: string;
  title: string;
  type: PlaceType;
  /** Public coordinates. Already rounded when `approximate` is true. */
  lat: number;
  lng: number;
  approximate: boolean;
  city: string | null;
  region: string | null;
  countryCode: string | null;
  countryName: string | null;
  /** ISO calendar date (YYYY-MM-DD) or null when unknown. */
  visitedAt: string | null;
  excerpt: string;
  funnyMoment: string | null;
  rating: number | null;
  isDemo: boolean;
  cover: PhotoView | null;
  tripSlug: string | null;
  tripTitle: string | null;
  tags: string[];
}

export interface PlaceDetail extends PlaceSummary {
  story: string;
  placeName: string | null;
  /** Null when the location is approximate. */
  formattedAddress: string | null;
  photos: PhotoView[];
  publishedAt: string;
  updatedAt: string;
}

export interface TripSummary {
  id: string;
  slug: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  description: string;
  isDemo: boolean;
}

export interface BucketListItemView {
  id: string;
  placeName: string;
  lat: number;
  lng: number;
  countryCode: string | null;
  countryName: string | null;
  note: string;
  status: BucketStatus;
  /** Set only when a published place exists for this item — the sole way a completion counts as a visit. */
  linkedPlace: { slug: string; title: string } | null;
  isDemo: boolean;
}

/** Normalised result from any geocoding provider. */
export interface GeocodeResult {
  provider: string;
  providerPlaceId: string | null;
  placeName: string;
  formattedAddress: string;
  city: string | null;
  region: string | null;
  countryCode: string | null;
  countryName: string | null;
  lat: number;
  lng: number;
  suggestedType: PlaceType;
}
