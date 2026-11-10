"use client";

import { useCallback, useSyncExternalStore } from "react";

const URL_CHANGE_EVENT = "oops:urlchange";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  window.addEventListener(URL_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(URL_CHANGE_EVENT, onChange);
  };
}

/**
 * The current query string, kept in sync with back/forward navigation.
 *
 * Server and hydration snapshots are empty, so the static HTML always renders the default
 * state (no layout shift); the real URL state applies right after hydration.
 */
export function useUrlSearch(): {
  search: string;
  navigate: (search: string, mode: "push" | "replace") => void;
} {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search.replace(/^\?/, ""),
    () => "",
  );

  const navigate = useCallback((next: string, mode: "push" | "replace") => {
    const target = `${window.location.pathname}${next ? `?${next}` : ""}${window.location.hash}`;
    if (target === `${window.location.pathname}${window.location.search}${window.location.hash}`)
      return;
    // Pass the existing history.state through so Next.js' router keeps working on back/forward.
    if (mode === "push") window.history.pushState(window.history.state, "", target);
    else window.history.replaceState(window.history.state, "", target);
    window.dispatchEvent(new Event(URL_CHANGE_EVENT));
  }, []);

  return { search, navigate };
}
