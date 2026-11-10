import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";

import { DemoBadge } from "@/components/shared/Stamp";
import { StarRating } from "@/components/shared/StarRating";
import { Pill } from "@/components/ui/Pill";
import { PLACE_TYPE_META } from "@/constants/placeTypes";
import { ROUTES } from "@/constants/routes";
import type { PlaceSummary } from "@/types/domain";
import { formatVisitDate } from "@/utils/date";
import { countryFlag } from "@/utils/geo";
import { cn } from "@/utils/cn";

import { PlacePhoto } from "./PlacePhoto";

export function placeSubtitle(
  place: Pick<PlaceSummary, "city" | "countryCode" | "countryName">,
): string {
  return [place.city, place.countryName].filter(Boolean).join(", ") || "Somewhere on Earth";
}

interface PostcardCardProps {
  place: PlaceSummary;
  className?: string;
  /** Only for the first image above the fold. */
  eager?: boolean;
}

/** Postcard tile used by the list view, the timeline and "nearby places". */
export function PostcardCard({ place, className, eager = false }: PostcardCardProps) {
  const meta = PLACE_TYPE_META[place.type];

  return (
    <article
      className={cn("postcard lift group relative flex flex-col overflow-hidden", className)}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-[calc(var(--radius-postcard)-1px)]">
        <PlacePhoto
          photo={place.cover}
          slug={place.slug}
          type={place.type}
          thumb
          eager={eager}
          sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 92vw"
          className="transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <Pill className="border-transparent bg-paper/95 text-ink shadow-sm">
            <span aria-hidden="true">{meta.emoji}</span>
            {meta.label}
          </Pill>
          {place.isDemo ? <DemoBadge /> : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="flex flex-wrap items-center gap-x-2 text-xs font-bold tracking-wide text-ink-muted uppercase">
          <span aria-hidden="true">{countryFlag(place.countryCode)}</span>
          {formatVisitDate(place.visitedAt, "month")}
          <StarRating rating={place.rating} className="ml-auto" />
        </p>
        <h3 className="text-2xl leading-tight">
          <Link
            href={ROUTES.place(place.slug)}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-[var(--radius-postcard)]"
          >
            {place.title}
          </Link>
        </h3>
        <p className="flex items-center gap-1 text-sm text-ink-muted">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          {placeSubtitle(place)}
          {place.approximate ? <span>· approximate</span> : null}
        </p>
        <p className="line-clamp-2 text-[0.95rem] leading-relaxed text-ink-soft">{place.excerpt}</p>
        <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-bold text-coral-deep">
          Read the story
          <ArrowUpRight
            className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden="true"
          />
        </span>
      </div>
    </article>
  );
}
