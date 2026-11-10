"use client";

import Link from "next/link";
import { Crosshair } from "lucide-react";

import { placeSubtitle } from "@/components/journal/PostcardCard";
import { PlacePhoto } from "@/components/journal/PlacePhoto";
import { DemoBadge } from "@/components/shared/Stamp";
import { PLACE_TYPE_META } from "@/constants/placeTypes";
import { ROUTES } from "@/constants/routes";
import type { PlaceSummary } from "@/types/domain";
import { cn } from "@/utils/cn";
import { formatVisitDate } from "@/utils/date";
import { countryFlag } from "@/utils/geo";

interface PlaceListProps {
  places: readonly PlaceSummary[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  className?: string;
}

/**
 * Every place as a plain list: the keyboard- and screen-reader-friendly twin of the map.
 * Each row has a real link (crawlable, works without JavaScript) and a "show on map" button.
 */
/** Only very long lists benefit from skipping off-screen row rendering. */
const VIRTUALISE_ABOVE = 80;

export function PlaceList({ places, selectedSlug, onSelect, className }: PlaceListProps) {
  const skipOffscreen = places.length > VIRTUALISE_ABOVE;
  return (
    <ul className={cn("divide-y divide-line/70", className)}>
      {places.map((place) => {
        const selected = place.slug === selectedSlug;
        return (
          <li
            key={place.slug}
            aria-current={selected ? "true" : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 transition-colors",
              skipOffscreen && "[contain-intrinsic-size:auto_76px] [content-visibility:auto]",
              selected ? "bg-coral/10" : "hover:bg-parchment-deep/60",
            )}
          >
            <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
              <PlacePhoto
                photo={place.cover}
                slug={place.slug}
                type={place.type}
                thumb
                sizes="56px"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2">
                <Link
                  href={ROUTES.place(place.slug)}
                  className="truncate font-display text-[1.02rem] leading-tight font-bold hover:underline"
                >
                  {place.title}
                </Link>
                {place.isDemo ? <DemoBadge className="shrink-0 scale-90" /> : null}
              </p>
              <p className="truncate text-xs text-ink-muted">
                <span aria-hidden="true">{PLACE_TYPE_META[place.type].emoji} </span>
                {placeSubtitle(place)} · {formatVisitDate(place.visitedAt, "month")}
              </p>
              <p className="sr-only">{countryFlag(place.countryCode)}</p>
            </div>
            <button
              type="button"
              onClick={() => onSelect(place.slug)}
              aria-label={`Show ${place.title} on the map`}
              aria-pressed={selected}
              className={cn(
                "grid tap-target shrink-0 place-items-center rounded-full border transition-colors",
                selected
                  ? "border-coral bg-coral text-ink"
                  : "border-line bg-transparent text-ink-soft hover:bg-white hover:text-ink",
              )}
            >
              <Crosshair className="size-4" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
