import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ArrowRight, Calendar, ExternalLink, Globe2, MapPin, Route } from "lucide-react";

import { Container } from "@/components/layout/Container";
import { PhotoGallery } from "@/components/journal/PhotoGallery";
import { PlacePhoto } from "@/components/journal/PlacePhoto";
import { PostcardCard, placeSubtitle } from "@/components/journal/PostcardCard";
import { StoryContent } from "@/components/journal/StoryContent";
import { GlobePoster } from "@/components/map/GlobePoster";
import { CopyLinkButton } from "@/components/shared/CopyLinkButton";
import { JsonLd } from "@/components/shared/JsonLd";
import { DemoBadge } from "@/components/shared/Stamp";
import { StarRating } from "@/components/shared/StarRating";
import { buttonStyles } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import { PLACE_TYPE_META } from "@/constants/placeTypes";
import { ROUTES } from "@/constants/routes";
import { findNearbyPlaces } from "@/features/places/nearby";
import {
  getPublishedPlaceBySlug,
  getPublishedPlaceSlugs,
  getPublishedPlaces,
} from "@/features/places/queries";
import { getSiteConfig } from "@/lib/config";
import { formatVisitDate } from "@/utils/date";
import { countryFlag, formatCoordinates } from "@/utils/geo";

export async function generateStaticParams() {
  const slugs = await getPublishedPlaceSlugs();
  // Cache Components needs at least one sample param to validate the route at build time.
  return slugs.length > 0 ? slugs.map((slug) => ({ slug })) : [{ slug: "no-places-yet" }];
}

export async function generateMetadata(props: PageProps<"/places/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const place = await getPublishedPlaceBySlug(slug);
  if (!place) return { title: "Place not found", robots: { index: false, follow: false } };

  const image = place.cover?.url;
  return {
    title: place.title,
    description: place.excerpt || `A postcard from ${placeSubtitle(place)}.`,
    alternates: { canonical: ROUTES.place(place.slug) },
    // Sample content must never be indexed as if it were a real travel story.
    robots: { index: !place.isDemo, follow: true },
    openGraph: {
      type: "article",
      title: place.title,
      description: place.excerpt,
      url: ROUTES.place(place.slug),
      publishedTime: place.publishedAt,
      modifiedTime: place.updatedAt,
      ...(image
        ? {
            images: [
              {
                url: image,
                width: place.cover?.width,
                height: place.cover?.height,
                alt: place.cover?.alt,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: place.title,
      description: place.excerpt,
    },
  };
}

export default function PlacePage(props: PageProps<"/places/[slug]">) {
  return (
    <Suspense fallback={<PlaceSkeleton />}>
      <PlaceArticle params={props.params} />
    </Suspense>
  );
}

async function PlaceArticle({ params }: { params: PageProps<"/places/[slug]">["params"] }) {
  const { slug } = await params;
  const [place, allPlaces] = await Promise.all([
    getPublishedPlaceBySlug(slug),
    getPublishedPlaces(),
  ]);
  if (!place) notFound();

  const site = getSiteConfig();
  const meta = PLACE_TYPE_META[place.type];
  const nearby = findNearbyPlaces(place, allPlaces, 3);
  const index = allPlaces.findIndex((item) => item.slug === place.slug);
  const newer = index > 0 ? allPlaces[index - 1] : undefined;
  const older = index >= 0 ? allPlaces[index + 1] : undefined;
  const url = `${site.url}${ROUTES.place(place.slug)}`;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: place.title,
          description: place.excerpt,
          datePublished: place.publishedAt,
          dateModified: place.updatedAt,
          mainEntityOfPage: url,
          author: { "@type": "Person", name: site.ownerName },
          ...(place.cover ? { image: place.cover.url } : {}),
          about: {
            "@type": "Place",
            name: place.title,
            address: {
              "@type": "PostalAddress",
              ...(place.city ? { addressLocality: place.city } : {}),
              ...(place.countryName ? { addressCountry: place.countryName } : {}),
            },
            // Coordinates are only published when the owner chose exact locations.
            ...(place.approximate
              ? {}
              : { geo: { "@type": "GeoCoordinates", latitude: place.lat, longitude: place.lng } }),
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Explore", item: site.url },
            { "@type": "ListItem", position: 2, name: place.title, item: url },
          ],
        }}
      />

      <Container size="wide" className="pt-6 pb-4">
        <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link
                href={ROUTES.home}
                className="underline-offset-4 hover:text-ink hover:underline"
              >
                Explore
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li aria-current="page" className="font-semibold text-ink">
              {place.title}
            </li>
          </ol>
        </nav>
      </Container>

      <article>
        <Container
          size="wide"
          className="grid items-start gap-10 pb-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14"
        >
          <figure className="postcard relative rotate-0 p-3 sm:p-4 lg:-rotate-1">
            <span className="tape -top-3 left-8 rotate-[-6deg]" aria-hidden="true" />
            <span className="tape -top-3 right-8 rotate-[5deg]" aria-hidden="true" />
            <div className="relative aspect-[4/3] overflow-hidden rounded-[0.9rem]">
              <PlacePhoto
                photo={place.cover}
                slug={place.slug}
                type={place.type}
                eager
                sizes="(min-width: 1024px) 55vw, 92vw"
              />
            </div>
            <figcaption className="flex items-center justify-between gap-3 px-1 pt-3 text-xs font-bold tracking-wide text-ink-muted">
              <span>
                {place.cover?.caption ??
                  (place.cover ? place.cover.alt : "Generated postcard art — photos coming soon")}
              </span>
              <span aria-hidden="true">{countryFlag(place.countryCode)}</span>
            </figcaption>
          </figure>

          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="coral">
                <span aria-hidden="true">{meta.emoji}</span>
                {meta.label}
              </Pill>
              {place.isDemo ? <DemoBadge /> : null}
              {place.tripSlug ? (
                <Pill tone="ocean">
                  <Route className="size-3.5" aria-hidden="true" />
                  {place.tripTitle}
                </Pill>
              ) : null}
            </div>

            <h1 className="text-[2.6rem] leading-[1.02] sm:text-6xl">{place.title}</h1>

            <ul className="flex flex-col gap-2 text-[0.95rem] text-ink-soft">
              <li className="flex items-center gap-2">
                <MapPin className="size-4 shrink-0 text-coral-deep" aria-hidden="true" />
                <span>
                  <span aria-hidden="true">{countryFlag(place.countryCode)} </span>
                  {placeSubtitle(place)}
                  {place.approximate ? (
                    <span className="text-ink-muted"> · approximate location</span>
                  ) : null}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Calendar className="size-4 shrink-0 text-coral-deep" aria-hidden="true" />
                <time dateTime={place.visitedAt ?? undefined}>
                  {formatVisitDate(place.visitedAt, "long")}
                </time>
              </li>
              {place.rating ? (
                <li className="flex items-center gap-2">
                  <StarRating rating={place.rating} />
                  <span className="text-sm text-ink-muted">My verdict</span>
                </li>
              ) : null}
            </ul>

            <p className="font-display text-2xl leading-snug font-semibold text-ink">
              {place.excerpt}
            </p>

            {place.funnyMoment ? (
              <aside
                aria-label="Oops moment"
                className="relative -rotate-1 rounded-xl border border-sunrise-deep/25 bg-sunrise/35 px-5 py-4 shadow-sm sm:ml-3"
              >
                <span
                  className="tape -top-3 left-1/2 w-16 -translate-x-1/2 rotate-2"
                  aria-hidden="true"
                />
                <p className="text-[0.7rem] font-extrabold tracking-[0.2em] text-sunrise-deep uppercase">
                  Oops moment
                </p>
                <p className="mt-1 font-display text-xl leading-snug font-semibold">
                  &ldquo;{place.funnyMoment}&rdquo;
                </p>
              </aside>
            ) : null}

            {place.tags.length > 0 ? (
              <ul className="flex flex-wrap gap-2" aria-label="Tags">
                {place.tags.map((tag) => (
                  <li key={tag}>
                    <Pill>#{tag}</Pill>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Link
                href={ROUTES.explore(place.slug)}
                className={buttonStyles({ variant: "primary" })}
              >
                <Globe2 className="size-4" aria-hidden="true" />
                See it on the globe
              </Link>
              <CopyLinkButton path={ROUTES.place(place.slug)} size="md" />
            </div>
          </div>
        </Container>

        {place.story ? (
          <Container size="prose" className="py-6">
            <h2 className="sr-only">The story</h2>
            <StoryContent markdown={place.story} dropCap />
          </Container>
        ) : null}

        {place.photos.length > 0 ? (
          <Container as="section" aria-labelledby="album-title" className="py-12">
            <h2 id="album-title" className="mb-6 text-3xl">
              Photo album
            </h2>
            <PhotoGallery photos={place.photos} title={place.title} />
          </Container>
        ) : null}

        <Container as="section" aria-labelledby="where-title" className="py-12">
          <div className="postcard grid items-center gap-8 p-6 sm:p-8 md:grid-cols-[16rem_1fr]">
            <div className="mx-auto aspect-square w-full max-w-64 rounded-full bg-ocean-deep p-2">
              <GlobePoster
                places={[place]}
                center={[place.lng, place.lat]}
                label={`Globe centred on ${place.title}`}
              />
            </div>
            <div>
              <h2 id="where-title" className="text-3xl">
                Where is this?
              </h2>
              <dl className="mt-4 grid gap-3 text-[0.95rem] text-ink-soft">
                <div>
                  <dt className="text-xs font-extrabold tracking-widest text-ink-muted uppercase">
                    Place
                  </dt>
                  <dd>{place.placeName ?? place.title}</dd>
                </div>
                {place.formattedAddress ? (
                  <div>
                    <dt className="text-xs font-extrabold tracking-widest text-ink-muted uppercase">
                      Address
                    </dt>
                    <dd>{place.formattedAddress}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs font-extrabold tracking-widest text-ink-muted uppercase">
                    Coordinates
                  </dt>
                  <dd>
                    {place.approximate
                      ? "Kept vague on purpose — the pin is only accurate to about 10 km."
                      : formatCoordinates(place.lat, place.lng)}
                  </dd>
                </div>
              </dl>
              {place.approximate ? null : (
                <a
                  href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=15/${place.lat}/${place.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-coral-deep underline underline-offset-4"
                >
                  Open in OpenStreetMap
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
            </div>
          </div>
        </Container>
      </article>

      {nearby.length > 0 ? (
        <Container as="section" aria-labelledby="nearby-title" className="py-8">
          <h2 id="nearby-title" className="mb-6 text-3xl">
            Nearby postcards
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {nearby.map(({ place: item, distanceKm }) => (
              <li key={item.slug} className="flex flex-col gap-2">
                <PostcardCard place={item} className="flex-1" />
                <p className="px-2 text-xs font-bold text-ink-muted">
                  About {Math.round(distanceKm).toLocaleString("en-GB")} km away
                </p>
              </li>
            ))}
          </ul>
        </Container>
      ) : null}

      <Container
        as="nav"
        aria-label="More postcards"
        className="mt-12 flex flex-wrap items-center justify-between gap-4"
      >
        {newer ? (
          <Link
            href={ROUTES.place(newer.slug)}
            className={buttonStyles({ variant: "secondary", size: "lg" })}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Newer: {newer.title}
          </Link>
        ) : (
          <span />
        )}
        {older ? (
          <Link
            href={ROUTES.place(older.slug)}
            className={buttonStyles({ variant: "secondary", size: "lg" })}
          >
            Older: {older.title}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </Container>
    </>
  );
}

function PlaceSkeleton() {
  return (
    <Container size="wide" className="grid gap-10 py-12 lg:grid-cols-2" aria-busy="true">
      <Skeleton className="aspect-[4/3] w-full rounded-3xl" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    </Container>
  );
}
