import { cacheLife } from "next/cache";
import Link from "next/link";

import { PlaneTrail } from "@/components/shared/Doodles";
import { MAIN_NAV, ROUTES } from "@/constants/routes";

import { Container } from "./Container";
import { Brand } from "./SiteHeader";

export async function Footer() {
  // `use cache` lets the footer read the clock during prerendering (the year only changes once a year).
  "use cache";
  cacheLife("days");

  return (
    <footer className="on-dark relative mt-24 overflow-hidden bg-ocean-deep text-parchment">
      <PlaneTrail className="pointer-events-none absolute -top-9 right-6 hidden h-24 w-60 text-sunrise/70 sm:block" />
      <Container size="wide" className="grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="[&_a]:text-parchment [&_span.text-coral-deep]:text-sunrise">
            <Brand />
          </div>
          <p className="mt-4 max-w-sm leading-relaxed text-parchment/80">
            Collecting memories, wrong turns, and questionable travel decisions.
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="mb-3 font-sans text-xs font-extrabold tracking-[0.2em] text-sunrise uppercase">
            Wander
          </h2>
          <ul className="grid gap-2">
            {MAIN_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-parchment/90 underline-offset-4 hover:text-sunrise hover:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="mb-3 font-sans text-xs font-extrabold tracking-[0.2em] text-sunrise uppercase">
            Fine print
          </h2>
          <ul className="grid gap-2 text-sm leading-relaxed text-parchment/80">
            <li>
              Map data and styles belong to their providers; attribution is shown on every map.
            </li>
            <li>
              Photos are shared with their owner&rsquo;s permission, with location metadata
              stripped.
            </li>
            <li>
              <Link
                href={ROUTES.admin.login}
                className="underline underline-offset-4 hover:text-sunrise"
              >
                Owner sign-in
              </Link>
            </li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-parchment/15">
        <Container
          size="wide"
          className="flex flex-wrap items-center justify-between gap-2 py-5 text-xs text-parchment/70"
        >
          <p>© {new Date().getUTCFullYear()} Oops, I Traveled Again! All wrong turns reserved.</p>
          <p>Built with curiosity, coffee and a slightly unreliable sense of direction.</p>
        </Container>
      </div>
    </footer>
  );
}
