"use client";

import { useSyncExternalStore } from "react";

/** Reactive `matchMedia`. Returns `serverValue` during SSR and hydration, then the real answer. */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}
