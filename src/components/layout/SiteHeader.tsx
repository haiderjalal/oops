import Link from "next/link";
import { Suspense } from "react";

import { PinGlyph, Squiggle } from "@/components/shared/Doodles";
import { ROUTES } from "@/constants/routes";

import { Container } from "./Container";
import { MobileNav } from "./MobileNav";
import { NavLinks } from "./NavLinks";
import { NavList } from "./NavList";

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href={ROUTES.home}
      className={`group inline-flex items-center gap-2.5 ${className ?? ""}`}
      aria-label="Oops, I Traveled Again! — home"
    >
      <PinGlyph className="h-8 w-6 shrink-0 transition-transform duration-300 group-hover:-rotate-12" />
      <span className="font-display text-[1.2rem] leading-none font-extrabold tracking-tight sm:text-[1.45rem]">
        Oops, I{" "}
        <span className="relative inline-block text-coral-deep">
          Traveled
          <Squiggle className="absolute -bottom-1.5 left-0 h-1.5 w-full text-coral" />
        </span>{" "}
        Again!
      </span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-parchment/85 backdrop-blur-md">
      <Container size="wide" className="flex h-16 items-center justify-between gap-6">
        <Brand />
        <nav aria-label="Main" className="hidden md:block">
          {/* The current-page highlight needs the URL (runtime data); the links themselves are static. */}
          <Suspense fallback={<NavList activeHref={null} />}>
            <NavLinks />
          </Suspense>
        </nav>
        <MobileNav />
      </Container>
    </header>
  );
}
