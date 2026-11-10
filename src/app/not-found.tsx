import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { Footer } from "@/components/layout/Footer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PlaneTrail } from "@/components/shared/Doodles";
import { buttonStyles } from "@/components/ui/Button";
import { ROUTES } from "@/constants/routes";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        <Container size="prose" className="py-24 text-center">
          <p className="font-display text-8xl font-extrabold text-coral-deep">404</p>
          <h1 className="mt-4 text-4xl">Oops. Wrong turn.</h1>
          <PlaneTrail className="mx-auto mt-6 h-16 w-44 text-coral/80" />
          <p className="mt-6 text-lg leading-relaxed text-ink-soft">
            That page doesn&rsquo;t exist — or it does, and it&rsquo;s keeping very quiet.
            Let&rsquo;s get you back on the map.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={ROUTES.home} className={buttonStyles({ variant: "primary", size: "lg" })}>
              Back to the globe
            </Link>
            <Link
              href={ROUTES.timeline}
              className={buttonStyles({ variant: "secondary", size: "lg" })}
            >
              Browse the timeline
            </Link>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
