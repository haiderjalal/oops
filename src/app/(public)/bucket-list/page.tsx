import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Compass } from "lucide-react";

import { Container } from "@/components/layout/Container";
import { GlobePoster } from "@/components/map/GlobePoster";
import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { DemoBadge } from "@/components/shared/Stamp";
import { buttonStyles } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { ROUTES } from "@/constants/routes";
import { getBucketListItems } from "@/features/bucket/queries";
import type { BucketListItemView } from "@/types/domain";
import { countryFlag } from "@/utils/geo";

export const metadata: Metadata = {
  title: "Bucket list",
  description: "Places I haven't been to yet — clearly separate from the ones I have.",
  alternates: { canonical: ROUTES.bucketList },
};

export default async function BucketListPage() {
  const items = await getBucketListItems();
  const planned = items.filter((item) => item.status === "planned");
  const completed = items.filter((item) => item.status === "completed");

  return (
    <Container className="py-12 sm:py-16">
      <SectionHeading
        as="h1"
        eyebrow="Bucket list"
        title="Not yet. But soon-ish."
        description="Places I'm dreaming about. These are wishes, not visits: they never count towards the passport stats."
      />

      {items.length === 0 ? (
        <EmptyState
          className="mt-12"
          emoji="🎒"
          title="The bucket list is empty"
          action={
            <Link href={ROUTES.home} className={buttonStyles({ variant: "primary" })}>
              Back to the globe
            </Link>
          }
        >
          No dream destinations yet. Suspiciously content.
        </EmptyState>
      ) : (
        <>
          <div className="mt-12 grid items-start gap-10 lg:grid-cols-[1fr_20rem]">
            <section aria-labelledby="planned-title">
              <h2 id="planned-title" className="mb-6 flex items-center gap-3 text-3xl">
                <Compass className="size-7 text-sunrise-deep" aria-hidden="true" />
                Still dreaming
                <span className="text-lg font-semibold text-ink-muted">({planned.length})</span>
              </h2>
              {planned.length > 0 ? (
                <ul className="grid gap-5 sm:grid-cols-2">
                  {planned.map((item) => (
                    <li key={item.id}>
                      <BucketCard item={item} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-ink-soft">
                  Every wish has been ticked off. Time to dream bigger.
                </p>
              )}
            </section>

            <aside aria-label="Where the wishes are" className="lg:sticky lg:top-24">
              <div className="postcard p-5">
                <div className="mx-auto aspect-square w-full max-w-64 rounded-full bg-ocean-deep p-2">
                  <GlobePoster
                    places={planned.map((item) => ({
                      slug: item.id,
                      lat: item.lat,
                      lng: item.lng,
                      isDemo: item.isDemo,
                    }))}
                    tone="planned"
                    label="Globe showing where the planned destinations are"
                  />
                </div>
                <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs font-bold text-ink-muted">
                  <span
                    className="inline-block size-3 rounded-full border border-dashed bg-sunrise"
                    aria-hidden="true"
                  />
                  Dashed gold pins are places still to visit
                </p>
              </div>
            </aside>
          </div>

          {completed.length > 0 ? (
            <section aria-labelledby="done-title" className="mt-20">
              <h2 id="done-title" className="mb-6 flex items-center gap-3 text-3xl">
                <CheckCircle2 className="size-7 text-success" aria-hidden="true" />
                Ticked off
                <span className="text-lg font-semibold text-ink-muted">({completed.length})</span>
              </h2>
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {completed.map((item) => (
                  <li key={item.id}>
                    <BucketCard item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </Container>
  );
}

function BucketCard({ item }: { item: BucketListItemView }) {
  const done = item.status === "completed";
  return (
    <article
      className={`postcard flex h-full flex-col gap-3 p-6 ${done ? "bg-parchment-deep/60" : "border-dashed border-sunrise-deep/40"}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={done ? "ocean" : "sunrise"}>{done ? "Ticked off" : "Planned"}</Pill>
        {item.isDemo ? <DemoBadge /> : null}
      </div>
      <h3 className="text-2xl">
        <span aria-hidden="true">{countryFlag(item.countryCode)} </span>
        {item.placeName}
      </h3>
      {item.countryName ? (
        <p className="-mt-2 text-sm font-semibold text-ink-muted">{item.countryName}</p>
      ) : null}
      <p className="leading-relaxed text-ink-soft">{item.note}</p>
      {done ? (
        item.linkedPlace ? (
          <Link
            href={ROUTES.place(item.linkedPlace.slug)}
            className="mt-auto text-sm font-bold text-coral-deep underline underline-offset-4"
          >
            Read the story: {item.linkedPlace.title}
          </Link>
        ) : (
          <p className="mt-auto text-xs font-semibold text-ink-muted">
            Marked complete, but there&rsquo;s no journal entry yet, so it isn&rsquo;t counted as a
            visit.
          </p>
        )
      ) : null}
    </article>
  );
}
