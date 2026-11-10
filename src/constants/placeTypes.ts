import type { PlaceType } from "@/types/domain";

export interface PlaceTypeMeta {
  label: string;
  plural: string;
  emoji: string;
}

/** Display metadata per place type. Emoji double as map-pin glyphs (see components/map/pinImages.ts). */
export const PLACE_TYPE_META: Record<PlaceType, PlaceTypeMeta> = {
  country: { label: "Country", plural: "Countries", emoji: "🌍" },
  city: { label: "City", plural: "Cities", emoji: "🏙️" },
  cafe: { label: "Coffee shop", plural: "Coffee shops", emoji: "☕" },
  restaurant: { label: "Restaurant", plural: "Restaurants", emoji: "🍜" },
  attraction: { label: "Attraction", plural: "Attractions", emoji: "🏛️" },
  hotel: { label: "Stay", plural: "Stays", emoji: "🛏️" },
  other: { label: "Somewhere else", plural: "Somewhere else", emoji: "📍" },
};

export function placeTypeLabel(type: PlaceType): string {
  return PLACE_TYPE_META[type].label;
}
