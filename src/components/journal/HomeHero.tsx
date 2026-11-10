import { PlaneTrail, Sparkle, Squiggle } from "@/components/shared/Doodles";
import { Container } from "@/components/layout/Container";
import type { PassportStats } from "@/features/stats/passportStats";

interface HomeHeroProps {
  stats: PassportStats;
}

/** Headline strip above the explorer: playful, fast to render, and honest about sample data. */
export function HomeHero({ stats }: HomeHeroProps) {
  return (
    <Container
      size="wide"
      as="section"
      aria-labelledby="home-title"
      className="pt-8 pb-6 sm:pt-12 sm:pb-8"
    >
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="animate-rise mb-4 text-xs font-extrabold tracking-[0.22em] text-coral-deep uppercase">
            <span aria-hidden="true">✳ </span>Welcome to my little corner of the planet
          </p>
          <h1
            id="home-title"
            className="animate-rise animate-rise-delay-1 text-[2.9rem] leading-[0.95] sm:text-6xl lg:text-7xl"
          >
            The world is my{" "}
            <span className="relative inline-block text-coral-deep">
              oops!
              <Squiggle className="absolute -bottom-2 left-0 h-3 w-full text-coral" />
              <Sparkle
                className="motion-safe:animate-wobble absolute -top-3 -right-8 size-8 text-sunrise"
                style={{ ["--tilt" as string]: "-8deg" }}
              />
            </span>
          </h1>
          <p className="animate-rise animate-rise-delay-2 mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            Collecting memories, wrong turns, and questionable travel decisions. Spin the globe,
            pick a pin, and come along for the ride.
          </p>
        </div>

        <div className="animate-rise animate-rise-delay-2 relative">
          <PlaneTrail className="pointer-events-none absolute -top-12 -left-24 hidden h-20 w-52 text-coral/80 xl:block" />
          <dl className="ticket postcard flex items-stretch gap-0 px-2 py-4 text-center">
            <Stat value={stats.placeCount} label="Places" />
            <Stat value={stats.countryCount} label="Countries" />
            <Stat value={stats.tripCount} label="Trips" />
          </dl>
          {stats.demoCount > 0 ? (
            <p className="mt-2 text-center text-xs font-bold tracking-wide text-lavender-deep">
              Counts include {stats.demoCount} demo {stats.demoCount === 1 ? "place" : "places"}
            </p>
          ) : null}
        </div>
      </div>
    </Container>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-[6.5rem] flex-1 border-r border-dashed border-line px-5 last:border-r-0">
      <dd className="font-display text-4xl leading-none font-extrabold text-ocean">
        {String(value).padStart(2, "0")}
      </dd>
      <dt className="mt-1.5 text-[0.65rem] font-extrabold tracking-[0.18em] text-ink-muted uppercase">
        {label}
      </dt>
    </div>
  );
}
