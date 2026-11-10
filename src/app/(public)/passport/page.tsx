import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { PostcardCard } from "@/components/journal/PostcardCard";
import { GlobePoster } from "@/components/map/GlobePoster";
import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Stamp, type StampTone } from "@/components/shared/Stamp";
import { hashString } from "@/components/shared/PostcardArt";
import { buttonStyles } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { PLACE_TYPE_META } from "@/constants/placeTypes";
import { ROUTES } from "@/constants/routes";
import { getPublishedPlaces } from "@/features/places/queries";
import { type CountryStat, computePassportStats } from "@/features/stats/passportStats";
import { getSiteConfig } from "@/lib/config";
import { PLACE_TYPES } from "@/types/domain";
import { formatVisitDate } from "@/utils/date";
import { countryFlag } from "@/utils/geo";

export const metadata: Metadata = {
  title: "Passport & stats",
  description:
    "Countries stamped, cities collected and honest numbers — all derived from published journal entries.",
  alternates: { canonical: ROUTES.passport },
};

const STAMP_TONES: StampTone[] = ["coral", "ocean", "sunrise", "ink"];

function stampTone(country: CountryStat): StampTone {
  if (country.demo) return "lavender";
  return STAMP_TONES[hashString(country.code) % STAMP_TONES.length] ?? "coral";
}

function stampDate(value: string | null): string {
  return value ? formatVisitDate(value, "month").toUpperCase() : "SOMETIME";
}

export default async function PassportPage() {
  const places = await getPublishedPlaces();
  const stats = computePassportStats(places);
  const { ownerName } = getSiteConfig();
  const maxYear = Math.max(1, ...stats.byYear.map((entry) => entry.count));

  return (
    <Container className="py-12 sm:py-16">
      <SectionHeading
        as="h1"
        eyebrow="Passport & stats"
        title="Stamps, collected honestly"
        description="Every number here is counted from published journal entries — nothing estimated, nothing from the wish list."
      />

      {places.length === 0 ? (
        <EmptyState
          className="mt-12"
          emoji="🛂"
          title="A blank passport (for now)"
          action={
            <Link href={ROUTES.home} className={buttonStyles({ variant: "primary" })}>
              Back to the globe
            </Link>
          }
        >
          No places are published yet, so there is nothing to stamp. Come back after the next
          adventure.
        </EmptyState>
      ) : (
        <>
          {/* Passport cover */}
          <section
            aria-label="Passport summary"
            className="on-dark relative mt-12 overflow-hidden rounded-[2rem] bg-ocean-deep p-3 text-parchment shadow-[var(--shadow-lift)]"
          >
            <div className="relative grid items-center gap-8 rounded-[1.5rem] border-2 border-dashed border-sunrise/60 p-6 sm:p-10 md:grid-cols-[1fr_16rem]">
              <div>
                <p className="text-xs font-extrabold tracking-[0.4em] text-sunrise uppercase">
                  ✳ Passport ✳
                </p>
                <p className="mt-3 font-display text-4xl leading-tight font-extrabold sm:text-5xl">
                  Oops, I Traveled Again!
                </p>
                <p className="mt-2 text-sm font-semibold tracking-wide text-parchment/80">
                  Holder: {ownerName}
                </p>
                <dl className="mt-8 grid max-w-xl grid-cols-2 gap-6 sm:grid-cols-4">
                  <Figure value={stats.countryCount} label="Countries" />
                  <Figure value={stats.cityCount} label="Cities" />
                  <Figure value={stats.placeCount} label="Places" />
                  <Figure value={stats.tripCount} label="Trips" />
                </dl>
                {stats.demoCount > 0 ? (
                  <p className="mt-6 inline-block rounded-full bg-lavender px-4 py-1.5 text-xs font-extrabold tracking-wide text-ink">
                    INCLUDES {stats.demoCount} DEMO {stats.demoCount === 1 ? "PLACE" : "PLACES"} ·
                    SAMPLE DATA
                  </p>
                ) : null}
              </div>
              <div className="mx-auto aspect-square w-full max-w-64">
                <GlobePoster places={places} label="Globe showing every published place" />
              </div>
            </div>
          </section>

          {/* Country stamps */}
          <section aria-labelledby="stamps-title" className="mt-20">
            <h2 id="stamps-title" className="text-3xl sm:text-4xl">
              Country stamps
            </h2>
            <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
              {stats.countries.map((country, index) => (
                <li key={country.code} className="reveal flex flex-col items-center text-center">
                  <Stamp
                    top={country.name.length > 15 ? `${country.name.slice(0, 14)}…` : country.name}
                    bottom={stampDate(country.firstVisitedAt)}
                    center={countryFlag(country.code)}
                    tone={stampTone(country)}
                    tilt={((hashString(country.code) % 17) - 8) * 1.4}
                    className="size-36 sm:size-40"
                    label={`${country.name} stamp`}
                  />
                  <p className="mt-3 font-display text-xl leading-tight font-bold">
                    {country.name}
                    <span className="sr-only"> (stamp {index + 1})</span>
                  </p>
                  <p className="text-sm text-ink-muted">
                    {country.placeCount} {country.placeCount === 1 ? "place" : "places"}
                    {country.cities.length > 0 ? ` · ${country.cities.slice(0, 2).join(", ")}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-20 grid gap-8 lg:grid-cols-2">
            <section aria-labelledby="years-title" className="postcard p-6 sm:p-8">
              <h2 id="years-title" className="text-2xl">
                Years on the road
              </h2>
              <ul className="mt-6 flex flex-col gap-3">
                {stats.byYear.map(({ year, count }) => (
                  <li
                    key={year}
                    className="grid grid-cols-[3.5rem_1fr_2rem] items-center gap-3 text-sm font-bold"
                  >
                    <span>{year}</span>
                    <span
                      className="h-3 overflow-hidden rounded-full bg-parchment-deep"
                      role="presentation"
                    >
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-coral to-sunrise"
                        style={{ width: `${(count / maxYear) * 100}%` }}
                      />
                    </span>
                    <span className="text-right text-ink-muted">{count}</span>
                  </li>
                ))}
                {stats.byYear.length === 0 ? (
                  <li className="text-sm text-ink-muted">No dated visits yet.</li>
                ) : null}
              </ul>
            </section>

            <section aria-labelledby="collect-title" className="postcard p-6 sm:p-8">
              <h2 id="collect-title" className="text-2xl">
                What I collect
              </h2>
              <ul className="mt-6 flex flex-wrap gap-3">
                {PLACE_TYPES.filter((type) => stats.byType[type]).map((type) => (
                  <li key={type}>
                    <Pill tone="ocean" className="px-4 py-2 text-sm">
                      <span aria-hidden="true">{PLACE_TYPE_META[type].emoji}</span>
                      {PLACE_TYPE_META[type].plural}
                      <span className="ml-1 rounded-full bg-ocean px-2 py-0.5 text-xs text-parchment">
                        {stats.byType[type]}
                      </span>
                    </Pill>
                  </li>
                ))}
              </ul>
              {stats.firstVisit && stats.latestVisit ? (
                <p className="mt-6 text-sm leading-relaxed text-ink-soft">
                  First stamp: <strong>{formatVisitDate(stats.firstVisit, "long")}</strong>. Most
                  recent: <strong>{formatVisitDate(stats.latestVisit, "long")}</strong>.
                </p>
              ) : null}
            </section>
          </div>

          {stats.topRated.length > 0 ? (
            <section aria-labelledby="highlights-title" className="mt-20">
              <h2 id="highlights-title" className="text-3xl sm:text-4xl">
                Five-star highlights
              </h2>
              <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {stats.topRated.map((place) => (
                  <li key={place.slug} className="reveal">
                    <PostcardCard place={place} className="h-full" />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="mx-auto mt-16 max-w-2xl text-center text-sm leading-relaxed text-ink-muted">
            Stats are calculated from {stats.placeCount} published{" "}
            {stats.placeCount === 1 ? "entry" : "entries"}. Drafts, scheduled posts and bucket-list
            wishes never count as visits.
          </p>
        </>
      )}
    </Container>
  );
}

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dd className="font-display text-5xl leading-none font-extrabold text-sunrise">{value}</dd>
      <dt className="mt-1 text-[0.65rem] font-extrabold tracking-[0.2em] text-parchment/80 uppercase">
        {label}
      </dt>
    </div>
  );
}
