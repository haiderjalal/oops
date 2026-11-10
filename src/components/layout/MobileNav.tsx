"use client";

import { Suspense, useState } from "react";
import { Menu } from "lucide-react";

import { Dialog } from "@/components/ui/Dialog";

import { NavLinks } from "./NavLinks";
import { NavList } from "./NavList";

/** Small-screen menu: a native modal dialog, so focus handling and Esc come from the browser. */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-haspopup="dialog"
        className="grid tap-target place-items-center rounded-full border border-line bg-paper text-ink"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Where to?" className="mt-4 mb-auto">
        <nav aria-label="Main">
          <Suspense
            fallback={
              <NavList activeHref={null} orientation="vertical" onNavigate={() => setOpen(false)} />
            }
          >
            <NavLinks orientation="vertical" onNavigate={() => setOpen(false)} />
          </Suspense>
        </nav>
      </Dialog>
    </div>
  );
}
