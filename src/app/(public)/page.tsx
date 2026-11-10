import type { Metadata } from "next";

import { Container } from "@/components/layout/Container";
import { HomeHero } from "@/components/journal/HomeHero";
import { PostcardCard } from "@/components/journal/PostcardCard";
import { GlobePoster } from "@/components/map/GlobePoster";
import { WorldExplorer } from "@/components/map/WorldExplorer";
import { JsonLd } from "@/components/shared/JsonLd";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { buttonStyles } from "@/components/ui/Button";
import { ROUTES } from "@/constants/routes";
import { getPublishedPlaces } from "@/features/places/queries";
import { computePassportStats } from "@/features/stats/passportStats";
import { getClientMapConfig, getSiteConfig } from "@/lib/config";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "Oops, I Traveled Again! — a travel atlas & photo journal" },
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const places = await getPublishedPlaces();
  const stats = computePassportStats(places);
  const mapConfig = getClientMapConfig();
  const site = getSiteConfig();

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Oops, I Traveled Again!",
          url: site.url,
          description: "A personal travel atlas and photo journal.",
        }}
      />
      <HomeHero stats={stats} />

      <Container size="wide" as="section" aria-label="World explorer">
        <WorldExplorer
          places={places}
          mapConfig={mapConfig}
          poster={<GlobePoster places={places} />}
        />
      </Container>

      <Container as="section" aria-labelledby="latest-title" className="mt-20">
        <SectionHeading
          eyebrow="Fresh off the plane"
          title={<span id="latest-title">Latest postcards</span>}
          description="The most recent stops, still smelling faintly of airport coffee."
          actions={
            <Link href={ROUTES.timeline} className={buttonStyles({ variant: "dark" })}>
              See the whole timeline
            </Link>
          }
        />
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {places.slice(0, 3).map((place) => (
            <li key={place.slug} className="reveal">
              <PostcardCard place={place} className="h-full" />
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
