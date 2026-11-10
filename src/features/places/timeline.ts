import type { PlaceSummary, TripSummary } from "@/types/domain";
import { yearOf } from "@/utils/date";

/**
 * Groups published places into a chronological timeline: trips become single "chapters" holding
 * their stops in visiting order; standalone places are chapters of their own; chapters are
 * grouped under the year of their most recent date.
 */

export type TimelineChapter =
  | { kind: "trip"; trip: TripSummary; places: PlaceSummary[]; anchor: string | null }
  | { kind: "place"; place: PlaceSummary; anchor: string | null };

export interface TimelineYear {
  /** `null` collects entries with no known date. */
  year: number | null;
  chapters: TimelineChapter[];
}

function compareDescNullsLast(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b.localeCompare(a);
}

export function buildTimeline(
  places: readonly PlaceSummary[],
  trips: readonly TripSummary[],
): TimelineYear[] {
  const tripBySlug = new Map(trips.map((trip) => [trip.slug, trip]));
  const stopsByTrip = new Map<string, PlaceSummary[]>();
  const chapters: TimelineChapter[] = [];

  for (const place of places) {
    const trip = place.tripSlug ? tripBySlug.get(place.tripSlug) : undefined;
    if (trip) {
      stopsByTrip.set(trip.slug, [...(stopsByTrip.get(trip.slug) ?? []), place]);
    } else {
      chapters.push({ kind: "place", place, anchor: place.visitedAt });
    }
  }

  for (const [slug, stops] of stopsByTrip) {
    const trip = tripBySlug.get(slug);
    if (!trip) continue;
    const ordered = [...stops].sort((a, b) =>
      (a.visitedAt ?? "9999").localeCompare(b.visitedAt ?? "9999"),
    );
    const dates = ordered.flatMap((stop) => (stop.visitedAt ? [stop.visitedAt] : []));
    const anchor =
      dates.length > 0
        ? dates.reduce((a, b) => (a >= b ? a : b))
        : (trip.endDate ?? trip.startDate);
    chapters.push({ kind: "trip", trip, places: ordered, anchor });
  }

  chapters.sort((a, b) => compareDescNullsLast(a.anchor, b.anchor));

  const years: TimelineYear[] = [];
  for (const chapter of chapters) {
    const year = yearOf(chapter.anchor);
    const last = years[years.length - 1];
    if (last && last.year === year) last.chapters.push(chapter);
    else years.push({ year, chapters: [chapter] });
  }
  return years;
}
