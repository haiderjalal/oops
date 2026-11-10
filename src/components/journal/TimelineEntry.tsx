import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";

import { DemoBadge } from "@/components/shared/Stamp";
import { StarRating } from "@/components/shared/StarRating";
import { PLACE_TYPE_META } from "@/constants/placeTypes";
import { ROUTES } from "@/constants/routes";
import type { PlaceSummary } from "@/types/domain";
import { formatVisitDate } from "@/utils/date";
import { countryFlag } from "@/utils/geo";

import { PlacePhoto } from "./PlacePhoto";
import { placeSubtitle } from "./PostcardCard";

/** Horizontal postcard used in the timeline: photo on the left, the short story on the right. */
export function TimelineEntry({ place }: { place: PlaceSummary }) {
  const meta = PLACE_TYPE_META[place.type];

  return (
    <article className="postcard lift group relative grid overflow-hidden sm:grid-cols-[11rem_1fr]">
      <div className="relative aspect-[16/9] sm:aspect-auto sm:min-h-full">
        <PlacePhoto
          photo={place.cover}
          slug={place.slug}
          type={place.type}
          thumb
          sizes="(min-width: 640px) 176px, 92vw"
        />
      </div>
      <div className="flex flex-col gap-1.5 p-5">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold tracking-wide text-ink-muted uppercase">
          <time dateTime={place.visitedAt ?? undefined}>
            {formatVisitDate(place.visitedAt, "long")}
          </time>
          <span>
            <span aria-hidden="true">{meta.emoji} </span>
            {meta.label}
          </span>
          {place.isDemo ? <DemoBadge /> : null}
          <StarRating rating={place.rating} className="ml-auto" />
        </p>
        <h3 className="text-2xl leading-tight">
          <Link
            href={ROUTES.place(place.slug)}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {place.title}
          </Link>
        </h3>
        <p className="flex items-center gap-1 text-sm text-ink-muted">
          <MapPin className="size-3.5" aria-hidden="true" />
          <span aria-hidden="true">{countryFlag(place.countryCode)}</span>
          {placeSubtitle(place)}
        </p>
        <p className="mt-1 text-[0.95rem] leading-relaxed text-ink-soft">{place.excerpt}</p>
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
