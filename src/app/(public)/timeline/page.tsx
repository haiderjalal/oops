import type { Metadata } from "next";
import Link from "next/link";
import { Route } from "lucide-react";

import { Container } from "@/components/layout/Container";
import { TimelineEntry } from "@/components/journal/TimelineEntry";
import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { DemoBadge } from "@/components/shared/Stamp";
import { buttonStyles } from "@/components/ui/Button";
import { ROUTES } from "@/constants/routes";
import { buildTimeline } from "@/features/places/timeline";
import { getPublishedPlaces } from "@/features/places/queries";
import { getPublishedTrips } from "@/features/trips/queries";
import { formatDateRange } from "@/utils/date";

export const metadata: Metadata = {
  title: "Timeline",
  description: "Every place, in order — grouped by trip and year, wrong turns included.",
  alternates: { canonical: ROUTES.timeline },
};

export default async function TimelinePage() {
  const [places, trips] = await Promise.all([getPublishedPlaces(), getPublishedTrips()]);
  const years = buildTimeline(places, trips);

  return (
    <Container className="py-12 sm:py-16">
      <SectionHeading
        as="h1"
        eyebrow="My Travel Timeline"
        title="One wrong turn at a time"
        description="Every stop in order, grouped by trip and year. Newest adventures first."
      />

      {years.length === 0 ? (
        <EmptyState
          className="mt-12"
          emoji="🗺️"
          title="The timeline is waiting for its first stop"
          action={
            <Link href={ROUTES.home} className={buttonStyles({ variant: "primary" })}>
              Back to the globe
            </Link>
          }
        >
          Nothing has been published yet. Check back soon.
        </EmptyState>
      ) : (
        <ol className="mt-14 flex flex-col gap-16">
          {years.map(({ year, chapters }) => (
            <li key={year ?? "undated"} className="grid gap-6 md:grid-cols-[8rem_1fr] md:gap-10">
              <div className="md:sticky md:top-24 md:self-start">
                <h2 className="font-display text-5xl font-extrabold text-ocean md:text-6xl">
                  {year ?? "Undated"}
                </h2>
                <p className="mt-1 text-xs font-bold tracking-widest text-ink-muted uppercase">
                  {chapters.length} {chapters.length === 1 ? "chapter" : "chapters"}
                </p>
              </div>

              <ol className="flex flex-col gap-10 border-l-[3px] border-dashed border-coral/50 pl-6 sm:pl-10">
                {chapters.map((chapter) =>
                  chapter.kind === "place" ? (
                    <li key={chapter.place.slug} className="reveal relative">
                      <TimelineNode />
                      <TimelineEntry place={chapter.place} />
                    </li>
                  ) : (
                    <li key={chapter.trip.slug} className="reveal relative">
                      <TimelineNode trip />
                      <section
                        aria-labelledby={`trip-${chapter.trip.slug}`}
                        className="rounded-3xl border border-ocean/20 bg-ocean/[0.06] p-4 sm:p-6"
                      >
                        <header className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                          <Route className="size-5 text-ocean" aria-hidden="true" />
                          <h3 id={`trip-${chapter.trip.slug}`} className="text-2xl">
                            {chapter.trip.title}
                          </h3>
                          {chapter.trip.isDemo ? <DemoBadge /> : null}
                          <p className="ml-auto text-sm font-semibold text-ink-muted">
                            {formatDateRange(chapter.trip.startDate, chapter.trip.endDate)} ·{" "}
                            {chapter.places.length} {chapter.places.length === 1 ? "stop" : "stops"}
                          </p>
                        </header>
                        {chapter.trip.description ? (
                          <p className="-mt-2 mb-5 max-w-2xl text-ink-soft">
                            {chapter.trip.description}
                          </p>
                        ) : null}
                        <ol className="flex flex-col gap-4">
                          {chapter.places.map((place) => (
                            <li key={place.slug}>
                              <TimelineEntry place={place} />
                            </li>
                          ))}
                        </ol>
                      </section>
                    </li>
                  ),
                )}
              </ol>
            </li>
          ))}
        </ol>
      )}
    </Container>
  );
}

function TimelineNode({ trip = false }: { trip?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute top-6 -left-[calc(1.5rem+9px)] size-4 rounded-full border-[3px] border-paper shadow sm:-left-[calc(2.5rem+9px)] ${trip ? "bg-ocean" : "bg-coral"}`}
    />
  );
}
