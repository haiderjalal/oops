"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Compass } from "lucide-react";

import { PostcardCard } from "@/components/journal/PostcardCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Stamp } from "@/components/shared/Stamp";
import { Button } from "@/components/ui/Button";
import {
  type ExplorerFilters,
  type ExplorerView,
  buildFacets,
  filterPlaces,
  parseExplorerParams,
  toSearchString,
} from "@/features/explorer/filters";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useUrlSearch } from "@/hooks/useUrlSearch";
import type { ClientMapConfig } from "@/lib/config";
import type { PlaceSummary } from "@/types/domain";

import { ExplorerToolbar } from "./ExplorerToolbar";
import { MapStage, useConstrainedNetwork } from "./MapStage";
import { PlaceList } from "./PlaceList";
import { PlacePreviewCard } from "./PlacePreviewCard";
import { PlaceSheet } from "./PlaceSheet";
import type { CameraPadding, TravelMapHandle } from "./TravelMap";

interface WorldExplorerProps {
  places: PlaceSummary[];
  mapConfig: ClientMapConfig;
  /** Server-rendered static globe, passed in so it costs no client JavaScript. */
  poster: ReactNode;
}

const NO_PADDING: CameraPadding = { top: 0, right: 0, bottom: 0, left: 0 };
/** On phones the bottom sheet covers the lower part of the map; keep the selected pin above it. */
const SHEET_PADDING: CameraPadding = { top: 0, right: 0, bottom: 300, left: 0 };

export function WorldExplorer({ places, mapConfig, poster }: WorldExplorerProps) {
  const { search, navigate } = useUrlSearch();
  const filters = useMemo(() => parseExplorerParams(search), [search]);
  const constrained = useConstrainedNetwork();
  const isMobile = useMediaQuery("(max-width: 1023px)");

  const facets = useMemo(() => buildFacets(places), [places]);
  const visited = useMemo(
    () => [...new Set(places.flatMap((place) => (place.countryCode ? [place.countryCode] : [])))],
    [places],
  );
  const visible = useMemo(() => filterPlaces(places, filters), [places, filters]);
  const selected = useMemo(
    () => visible.find((place) => place.slug === filters.place) ?? null,
    [visible, filters.place],
  );

  // Data-saver visitors land on the list; everyone else on the map, unless the URL says otherwise.
  const view: ExplorerView = filters.view ?? (constrained ? "list" : "map");

  const mapHandle = useRef<TravelMapHandle>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [queryDraft, setQueryDraft] = useState(filters.q);
  const [announcement, setAnnouncement] = useState("");

  // Keep the search box in step when navigation (back/forward, clear) changes the URL.
  const [syncedQuery, setSyncedQuery] = useState(filters.q);
  if (syncedQuery !== filters.q) {
    setSyncedQuery(filters.q);
    setQueryDraft(filters.q);
  }

  const update = useCallback(
    (patch: Partial<ExplorerFilters>, mode: "push" | "replace" = "replace") => {
      navigate(toSearchString({ ...parseExplorerParams(window.location.search), ...patch }), mode);
    },
    [navigate],
  );

  const commitQuery = useDebouncedCallback(
    (value: string) => update({ q: value.trim(), place: null }),
    250,
  );

  const select = useCallback((slug: string | null) => update({ place: slug }, "push"), [update]);

  const clearFilters = useCallback(
    () => update({ q: "", type: null, year: null, country: null, place: null }),
    [update],
  );

  const surprise = useCallback(() => {
    if (visible.length === 0) return;
    const pool =
      visible.length > 1 ? visible.filter((place) => place.slug !== filters.place) : visible;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) update({ place: pick.slug, view: "map" }, "push");
  }, [visible, filters.place, update]);

  // Filters change → reframe the map around what's left (never on the very first render).
  const filterKey = `${filters.q}|${filters.type}|${filters.year}|${filters.country}`;
  const lastFilterKey = useRef(filterKey);
  useEffect(() => {
    if (lastFilterKey.current === filterKey) return;
    lastFilterKey.current = filterKey;
    if (!filters.place) mapHandle.current?.fitAll();
  }, [filterKey, filters.place]);

  // Move focus to the newly selected place's heading so keyboard/screen-reader users land on it.
  const lastFocused = useRef<string | null>(filters.place);
  useEffect(() => {
    if (!selected || lastFocused.current === selected.slug) return;
    lastFocused.current = selected.slug;
    headingRef.current?.focus({ preventScroll: true });
    setAnnouncement(`Selected ${selected.title}.`);
  }, [selected]);

  const closePreview = useCallback(() => select(null), [select]);
  const showList = useCallback(() => update({ view: "list", place: null }), [update]);

  const preview = selected ? (
    <PlacePreviewCard
      key={selected.slug}
      place={selected}
      onClose={closePreview}
      headingRef={headingRef}
      className="animate-panel-in"
    />
  ) : null;

  return (
    <div className="flex flex-col gap-5">
      <ExplorerToolbar
        filters={filters}
        facets={facets}
        view={view}
        queryDraft={queryDraft}
        onQueryChange={(value) => {
          setQueryDraft(value);
          commitQuery(value);
        }}
        onFilterChange={(patch) => update({ ...patch, place: null })}
        onClear={clearFilters}
        onViewChange={(next) => update({ view: next })}
        onSurprise={surprise}
        visibleCount={visible.length}
        totalCount={places.length}
      />

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {view === "map" ? (
        // `minmax(0, 1fr)` (not the implicit `auto` track) so nowrap/truncated titles in the list
        // can never widen the page past the screen on phones.
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_23.5rem] xl:grid-cols-[minmax(0,1fr)_25rem]">
          <MapStage
            poster={poster}
            places={visible}
            selectedSlug={selected?.slug ?? null}
            onSelect={select}
            config={mapConfig}
            visitedCountryCodes={visited}
            cameraPadding={isMobile && selected ? SHEET_PADDING : NO_PADDING}
            mapHandleRef={mapHandle}
            onShowList={showList}
          >
            {selected && isMobile ? (
              // `key` remounts the sheet per place, so a newly selected place always opens fully expanded.
              <PlaceSheet key={selected.slug} title={selected.title} onDismiss={closePreview}>
                {preview}
              </PlaceSheet>
            ) : null}
          </MapStage>

          <aside
            aria-label="Postcards"
            className="flex min-h-0 flex-col gap-4 lg:max-h-[clamp(34rem,calc(100svh-15rem),52rem)]"
          >
            {isMobile ? null : (
              <div>
                {preview ?? (
                  <WelcomeCard
                    total={places.length}
                    countries={visited.length}
                    onSurprise={surprise}
                    canSurprise={visible.length > 0}
                  />
                )}
              </div>
            )}
            <div className="postcard flex min-h-0 flex-1 flex-col overflow-hidden">
              <h2 className="flex items-center justify-between border-b border-line/70 px-4 py-3 font-sans text-sm font-extrabold tracking-wide">
                <span>All places</span>
                <span className="text-xs font-semibold text-ink-muted">{visible.length}</span>
              </h2>
              {visible.length > 0 ? (
                <PlaceList
                  places={visible}
                  selectedSlug={selected?.slug ?? null}
                  onSelect={select}
                  className="max-h-80 flex-1 overflow-y-auto overscroll-contain lg:max-h-none"
                />
              ) : (
                <NoResults onClear={clearFilters} compact />
              )}
            </div>
          </aside>
        </div>
      ) : visible.length > 0 ? (
        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((place, index) => (
            <li key={place.slug} className="md:odd:-rotate-[0.5deg] md:even:rotate-[0.5deg]">
              <PostcardCard place={place} eager={index === 0} className="h-full" />
            </li>
          ))}
        </ul>
      ) : (
        <NoResults onClear={clearFilters} />
      )}
    </div>
  );
}

function WelcomeCard({
  total,
  countries,
  onSurprise,
  canSurprise,
}: {
  total: number;
  countries: number;
  onSurprise: () => void;
  canSurprise: boolean;
}) {
  return (
    <div className="postcard airmail relative overflow-hidden p-6 pt-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-[0.7rem] font-extrabold tracking-[0.2em] text-coral-deep uppercase">
            ✳ A passport to chaos
          </p>
          <h2 className="text-[1.7rem] leading-tight">Pick a pin, read a postcard</h2>
        </div>
        <Stamp
          top="Wanderer"
          bottom="since forever"
          center="✈"
          tone="coral"
          tilt={9}
          className="-mt-1 size-20"
        />
      </div>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Every pin on the globe opens a little page of my travels — the photos, the story, and at
        least one thing that went wrong.
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-dashed border-line pt-4 text-center">
        <div>
          <dt className="text-[0.65rem] font-extrabold tracking-widest text-ink-muted uppercase">
            Places
          </dt>
          <dd className="font-display text-3xl font-extrabold text-ocean">{total}</dd>
        </div>
        <div>
          <dt className="text-[0.65rem] font-extrabold tracking-widest text-ink-muted uppercase">
            Countries
          </dt>
          <dd className="font-display text-3xl font-extrabold text-ocean">{countries}</dd>
        </div>
      </dl>
      <Button
        variant="secondary"
        size="sm"
        className="mt-4 w-full"
        onClick={onSurprise}
        disabled={!canSurprise}
      >
        <Compass className="size-4" aria-hidden="true" />
        Take me somewhere random
      </Button>
    </div>
  );
}

function NoResults({ onClear, compact = false }: { onClear: () => void; compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
        <p className="text-sm text-ink-soft">No postcards match those filters.</p>
        <Button variant="secondary" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      </div>
    );
  }
  return (
    <EmptyState
      emoji="🔍"
      title="No postcards match that"
      action={
        <Button variant="primary" onClick={onClear}>
          Clear filters
        </Button>
      }
    >
      Try a different word, or wander back to everywhere.
    </EmptyState>
  );
}
