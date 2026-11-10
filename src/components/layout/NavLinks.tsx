"use client";

import { usePathname } from "next/navigation";

import { NavList, activeNavHref } from "./NavList";

interface NavLinksProps {
  orientation?: "horizontal" | "vertical";
  onNavigate?: () => void;
}

/**
 * Navigation with the current page highlighted. `usePathname()` is runtime data, so render this
 * inside <Suspense> with a `<NavList activeHref={null} />` fallback (see SiteHeader / MobileNav);
 * otherwise routes with dynamic segments cannot be prerendered.
 */
export function NavLinks({ orientation, onNavigate }: NavLinksProps) {
  const activeHref = activeNavHref(usePathname());
  return (
    <NavList
      activeHref={activeHref}
      {...(orientation ? { orientation } : {})}
      {...(onNavigate ? { onNavigate } : {})}
    />
  );
}
