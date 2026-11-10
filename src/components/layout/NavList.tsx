import Link from "next/link";

import { MAIN_NAV } from "@/constants/routes";
import { cn } from "@/utils/cn";

/** Which nav item is current for a pathname (`/places/*` belongs to Explore). */
export function activeNavHref(pathname: string | null): string | null {
  if (!pathname) return null;
  if (pathname === "/" || pathname.startsWith("/places")) return "/";
  const match = MAIN_NAV.find(
    (item) => item.href !== "/" && (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );
  return match?.href ?? null;
}

interface NavListProps {
  /** `null` renders every link as inactive — the static fallback shown before the path is known. */
  activeHref: string | null;
  orientation?: "horizontal" | "vertical";
  onNavigate?: () => void;
}

/**
 * Presentational navigation list. It has no hooks, so it can be prerendered into the static
 * shell (as the Suspense fallback) while `NavLinks` adds the "current page" highlight.
 */
export function NavList({ activeHref, orientation = "horizontal", onNavigate }: NavListProps) {
  return (
    <ul
      className={cn("flex gap-1", orientation === "vertical" ? "flex-col gap-2" : "items-center")}
    >
      {MAIN_NAV.map((item) => {
        const active = item.href === activeHref;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex items-center rounded-full font-bold transition-colors",
                orientation === "vertical"
                  ? "w-full px-5 py-3 font-display text-2xl"
                  : "tap-target px-4 py-2 text-sm",
                active
                  ? "bg-ink text-parchment"
                  : "text-ink-soft hover:bg-ink/[0.07] hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
