"use client";

import Link from "next/link";
import type { Ref } from "react";
import { ArrowRight, Calendar, MapPin, X } from "lucide-react";

import { placeSubtitle } from "@/components/journal/PostcardCard";
import { PlacePhoto } from "@/components/journal/PlacePhoto";
import { CopyLinkButton } from "@/components/shared/CopyLinkButton";
import { DemoBadge } from "@/components/shared/Stamp";
import { StarRating } from "@/components/shared/StarRating";
import { buttonStyles } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { PLACE_TYPE_META } from "@/constants/placeTypes";
import { ROUTES } from "@/constants/routes";
import type { PlaceSummary } from "@/types/domain";
import { cn } from "@/utils/cn";
import { formatVisitDate } from "@/utils/date";
import { countryFlag } from "@/utils/geo";

interface PlacePreviewCardProps {
  place: PlaceSummary;
  onClose: () => void;
  headingRef?: Ref<HTMLHeadingElement>;
  className?: string;
}

/** The postcard that opens when a pin is selected: photo, title, date and a funny note. */
export function PlacePreviewCard({ place, onClose, headingRef, className }: PlacePreviewCardProps) {
  const meta = PLACE_TYPE_META[place.type];

  return (
    <article
      className={cn("postcard airmail overflow-hidden", className)}
      aria-labelledby={`preview-${place.slug}`}
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <PlacePhoto
          photo={place.cover}
          slug={place.slug}
          type={place.type}
          sizes="(min-width: 1024px) 380px, 92vw"
          className="object-cover"
        />
        <div className="absolute top-4 left-3 flex items-center gap-2">
          <Pill className="border-transparent bg-paper/95 text-ink shadow-sm">
            <span aria-hidden="true">{meta.emoji}</span>
            {meta.label}
          </Pill>
          {place.isDemo ? <DemoBadge /> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${place.title}`}
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-paper/95 text-ink shadow-sm hover:bg-white"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-col gap-3 p-5">
        <div>
          <h2
            id={`preview-${place.slug}`}
            ref={headingRef}
            tabIndex={-1}
            className="text-[1.65rem] leading-tight outline-none"
          >
            {place.title}
          </h2>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" />
              <span aria-hidden="true">{countryFlag(place.countryCode)}</span>
              {placeSubtitle(place)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3.5" aria-hidden="true" />
              {formatVisitDate(place.visitedAt, "long")}
            </span>
            <StarRating rating={place.rating} />
          </p>
        </div>

        <p className="leading-relaxed text-ink-soft">{place.excerpt}</p>

        {place.funnyMoment ? (
          <p className="-rotate-1 rounded-lg border border-sunrise-deep/25 bg-sunrise/30 px-4 py-3 text-sm leading-snug text-ink shadow-sm">
            <span className="mr-1 text-[0.7rem] font-extrabold tracking-widest text-sunrise-deep uppercase">
              Oops moment ·
            </span>
            <span className="font-display font-semibold">{place.funnyMoment}</span>
          </p>
        ) : null}

        {place.approximate ? (
          <p className="text-xs text-ink-muted">Location is approximate on purpose.</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link
            href={ROUTES.place(place.slug)}
            className={buttonStyles({ variant: "primary", size: "md" })}
          >
            Read the full story
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <CopyLinkButton path={ROUTES.explore(place.slug)} label="Copy link" />
        </div>
      </div>
    </article>
  );
}
