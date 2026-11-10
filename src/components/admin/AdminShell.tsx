import Link from "next/link";
import type { ReactNode } from "react";
import {
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  MapPinPlus,
  Route,
  ScrollText,
} from "lucide-react";

import { PinGlyph } from "@/components/shared/Doodles";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/constants/routes";
import { logoutAction } from "@/features/auth/actions";

const NAV = [
  { href: ROUTES.admin.root, label: "Dashboard", icon: LayoutDashboard },
  { href: ROUTES.admin.newPlace, label: "New place", icon: MapPinPlus },
  { href: ROUTES.admin.trips, label: "Trips", icon: Route },
  { href: ROUTES.admin.bucketList, label: "Bucket list", icon: ScrollText },
  { href: ROUTES.admin.media, label: "Photos", icon: ImageIcon },
] as const;

export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="on-dark bg-ocean-deep text-parchment lg:sticky lg:top-0 lg:h-dvh">
        <div className="flex flex-col gap-4 px-4 py-4 lg:h-full lg:gap-8 lg:py-6">
          <Link
            href={ROUTES.admin.root}
            className="flex items-center gap-2 font-display text-lg leading-tight font-extrabold"
          >
            <PinGlyph className="h-7 w-5 shrink-0" />
            Field desk
          </Link>

          <nav
            aria-label="Admin"
            className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:flex-col lg:overflow-visible"
          >
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex tap-target shrink-0 items-center gap-2.5 rounded-xl px-3.5 text-sm font-bold whitespace-nowrap text-parchment/90 hover:bg-parchment/10 hover:text-parchment"
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto hidden flex-col gap-3 text-sm lg:flex">
            <Link
              href={ROUTES.home}
              className="text-parchment/80 underline underline-offset-4 hover:text-sunrise"
            >
              View public site ↗
            </Link>
            <p className="truncate text-xs text-parchment/70" title={email}>
              Signed in as {email}
            </p>
            <form action={logoutAction}>
              <Button type="submit" variant="secondary" size="sm" className="w-full">
                <LogOut className="size-4" aria-hidden="true" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl px-4 py-8 outline-none sm:px-8 sm:py-10"
        >
          {children}
        </main>
        <form action={logoutAction} className="px-4 pb-8 sm:px-8 lg:hidden">
          <Button type="submit" variant="secondary" size="sm">
            <LogOut className="size-4" aria-hidden="true" />
            Sign out ({email})
          </Button>
        </form>
      </div>
    </div>
  );
}
