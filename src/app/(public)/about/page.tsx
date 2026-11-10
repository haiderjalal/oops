import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { GlobePoster } from "@/components/map/GlobePoster";
import { PlaneTrail, Sparkle } from "@/components/shared/Doodles";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Stamp } from "@/components/shared/Stamp";
import { buttonStyles } from "@/components/ui/Button";
import { ROUTES } from "@/constants/routes";
import { getSiteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "About",
  description: "A playful travel philosophy and how this atlas works.",
  alternates: { canonical: ROUTES.about },
};

const RULES = [
  ["Wrong turns are features.", "Half the best stories started with “this doesn't look right”."],
  ["Eat the thing you can't pronounce.", "Worst case: a story. Best case: a new favourite."],
  ["Pack light, buy snacks.", "The luggage is for souvenirs and, mostly, snacks."],
  ["Talk to the cat.", "Locals know the best places. Cats know the best sunny steps."],
  ["Write it down the same day.", "Memory is a very creative storyteller. Notes keep it honest."],
] as const;

const HOW_IT_WORKS = [
  [
    "Real places, real coordinates.",
    "Every pin is found with a geocoder and then nudged into position by hand if the search was off.",
  ],
  [
    "Honest numbers.",
    "The passport counts published journal entries only. Wish-list items, drafts and demo content are never mixed in silently.",
  ],
  [
    "Privacy by default.",
    "Photos have their location data stripped before they are stored, and sensitive spots can be shown approximately or held back until later.",
  ],
] as const;

export default function AboutPage() {
  const { ownerName } = getSiteConfig();

  return (
    <>
      <Container className="grid items-center gap-12 py-12 sm:py-16 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <SectionHeading
            as="h1"
            eyebrow="About"
            title={
              <>
                Hello, wanderer. I&rsquo;m {ownerName}
                <Sparkle className="ml-2 inline size-8 align-top text-sunrise" />
              </>
            }
          />
          <div className="mt-8 flex max-w-xl flex-col gap-4 text-lg leading-relaxed text-ink-soft">
            <p>
              This is my little atlas of places I&rsquo;ve been, things I&rsquo;ve eaten, and
              directions I definitely should have double-checked. It started as a way to remember
              trips and became a way to share them.
            </p>
            <p>
              Nothing here is sponsored, optimised or particularly efficient. It&rsquo;s a scrapbook
              with a globe attached. Spin it, poke a pin, and come along.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={ROUTES.home} className={buttonStyles({ variant: "primary", size: "lg" })}>
              Spin the globe
            </Link>
            <Link
              href={ROUTES.timeline}
              className={buttonStyles({ variant: "secondary", size: "lg" })}
            >
              Read the timeline
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <div className="aspect-square rounded-full bg-ocean-deep p-3 shadow-[var(--shadow-lift)]">
            <GlobePoster label="A globe, slightly tilted, as globes should be" />
          </div>
          <Stamp
            top="Certified"
            bottom="professional oops"
            center="✈"
            tone="coral"
            tilt={-14}
            className="absolute -right-4 -bottom-6 size-28"
          />
          <PlaneTrail className="absolute -top-10 -left-10 hidden h-20 w-48 text-coral/80 sm:block" />
        </div>
      </Container>

      <Container as="section" aria-labelledby="rules-title" className="py-12">
        <h2 id="rules-title" className="text-3xl sm:text-4xl">
          My very unofficial travel philosophy
        </h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {RULES.map(([rule, detail], index) => (
            <li key={rule} className="postcard reveal flex gap-4 p-6">
              <span
                className="font-display text-4xl leading-none font-extrabold text-coral-deep"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <div>
                <h3 className="text-xl">{rule}</h3>
                <p className="mt-1.5 leading-relaxed text-ink-soft">{detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>

      <Container as="section" aria-labelledby="how-title" className="py-12">
        <h2 id="how-title" className="text-3xl sm:text-4xl">
          How this atlas works
        </h2>
        <dl className="mt-8 grid gap-5 md:grid-cols-3">
          {HOW_IT_WORKS.map(([term, description]) => (
            <div key={term} className="rounded-3xl border border-ocean/20 bg-ocean/[0.06] p-6">
              <dt className="font-display text-xl font-bold text-ocean">{term}</dt>
              <dd className="mt-2 leading-relaxed text-ink-soft">{description}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </>
  );
}
