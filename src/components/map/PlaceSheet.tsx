"use client";

import {
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/utils/cn";

interface PlaceSheetProps {
  /** Short label shown on the handle while the sheet is collapsed. */
  title: string;
  onDismiss: () => void;
  children: ReactNode;
}

const SWIPE_THRESHOLD = 48;

/**
 * Mobile bottom sheet that sits over the map without blocking it. Non-modal on purpose: the map
 * stays interactive. Collapse/expand via the handle button, a swipe, or the keyboard; Esc dismisses.
 */
export function PlaceSheet({ title, onDismiss, children }: PlaceSheetProps) {
  const [expanded, setExpanded] = useState(true);
  const dragStartY = useRef<number | null>(null);
  /** A swipe is followed by a synthetic click on the same button; ignore that one click. */
  const swiped = useRef(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && ref.current?.contains(document.activeElement)) onDismiss();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    dragStartY.current = event.clientY;
    swiped.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const startY = dragStartY.current;
    dragStartY.current = null;
    if (startY === null) return;
    const delta = event.clientY - startY;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return; // a tap: the click handler toggles
    swiped.current = true;
    if (delta > 0) {
      if (expanded) setExpanded(false);
      else onDismiss();
    } else {
      setExpanded(true);
    }
  }

  return (
    <aside
      ref={ref}
      aria-label="Selected place"
      className="animate-sheet-in absolute inset-x-0 bottom-0 z-20 rounded-t-3xl border-t border-line bg-parchment shadow-[0_-12px_32px_-12px_rgb(13_52_71/0.45)] lg:hidden"
    >
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onClick={() => {
          // Swipes are handled on pointer-up; only genuine taps and keyboard activation toggle.
          if (swiped.current) {
            swiped.current = false;
            return;
          }
          setExpanded((value) => !value);
        }}
        aria-expanded={expanded}
        className="flex min-h-12 w-full touch-none flex-col items-center justify-center gap-1 pt-2 pb-1"
      >
        <span className="h-1.5 w-12 rounded-full bg-ink/25" aria-hidden="true" />
        <span className="inline-flex items-center gap-1 text-xs font-bold text-ink-muted">
          {expanded ? (
            <ChevronDown className="size-3.5" aria-hidden="true" />
          ) : (
            <ChevronUp className="size-3.5" aria-hidden="true" />
          )}
          {expanded ? "Collapse" : title}
        </span>
      </button>
      <div
        className={cn(
          "overflow-y-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))] transition-[max-height] duration-300",
          expanded ? "max-h-[min(62dvh,34rem)]" : "max-h-0 overflow-hidden pb-0",
        )}
        // Collapsed content must not be reachable by keyboard or screen readers.
        inert={!expanded}
      >
        {children}
      </div>
    </aside>
  );
}
