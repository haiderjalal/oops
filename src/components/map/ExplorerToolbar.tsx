"use client";

import { LayoutGrid, Map as MapIcon, Search, Shuffle, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/fields";
import { PLACE_TYPE_META } from "@/constants/placeTypes";
import {
  type ExplorerFilters,
  type ExplorerView,
  type Facets,
  hasActiveFilters,
} from "@/features/explorer/filters";
import type { PlaceType } from "@/types/domain";
import { cn } from "@/utils/cn";
import { countryFlag } from "@/utils/geo";

interface ExplorerToolbarProps {
  filters: ExplorerFilters;
  facets: Facets;
  view: ExplorerView;
  queryDraft: string;
  onQueryChange: (value: string) => void;
  onFilterChange: (patch: Partial<ExplorerFilters>) => void;
  onClear: () => void;
  onViewChange: (view: ExplorerView) => void;
  onSurprise: () => void;
  visibleCount: number;
  totalCount: number;
}

export function ExplorerToolbar({
  filters,
  facets,
  view,
  queryDraft,
  onQueryChange,
  onFilterChange,
  onClear,
  onViewChange,
  onSurprise,
  visibleCount,
  totalCount,
}: ExplorerToolbarProps) {
  return (
    <section aria-label="Search and filter places" className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div role="search" className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <label htmlFor="explorer-search" className="sr-only">
            Search places, cities, countries and tags
          </label>
          <input
            id="explorer-search"
            type="search"
            value={queryDraft}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search a place, a city, a snack…"
            autoComplete="off"
            enterKeyHint="search"
            className="h-12 w-full rounded-full border border-line bg-white pr-12 pl-11 text-[0.95rem] text-ink shadow-sm transition-colors placeholder:text-ink-muted hover:border-ink/30"
          />
          {queryDraft ? (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-ink-muted hover:bg-ink/[0.07] hover:text-ink"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="explorer-year">
            Filter by year
          </label>
          <Select
            id="explorer-year"
            value={filters.year ?? ""}
            onChange={(event) =>
              onFilterChange({ year: event.target.value ? Number(event.target.value) : null })
            }
            className="h-12 w-auto min-w-[7.5rem] rounded-full bg-white px-4"
          >
            <option value="">Any year</option>
            {facets.years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>

          <label className="sr-only" htmlFor="explorer-country">
            Filter by country
          </label>
          <Select
            id="explorer-country"
            value={filters.country ?? ""}
            onChange={(event) => onFilterChange({ country: event.target.value || null })}
            className="h-12 w-auto min-w-[9rem] rounded-full bg-white px-4"
          >
            <option value="">Any country</option>
            {facets.countries.map((country) => (
              <option key={country.code} value={country.code}>
                {countryFlag(country.code)} {country.name}
              </option>
            ))}
          </Select>

          <div
            role="group"
            aria-label="View"
            className="flex rounded-full border border-line bg-white p-1 shadow-sm"
          >
            <ViewButton
              active={view === "map"}
              onClick={() => onViewChange("map")}
              icon={<MapIcon className="size-4" aria-hidden="true" />}
            >
              Map
            </ViewButton>
            <ViewButton
              active={view === "list"}
              onClick={() => onViewChange("list")}
              icon={<LayoutGrid className="size-4" aria-hidden="true" />}
            >
              List
            </ViewButton>
          </div>

          <Button variant="dark" size="md" onClick={onSurprise} disabled={visibleCount === 0}>
            <Shuffle className="size-4" aria-hidden="true" />
            Surprise me
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* One swipeable row on phones (keeps the map near the top); wraps on larger screens. */}
        <div
          role="group"
          aria-label="Filter by type"
          className="-mx-4 flex w-[calc(100%+2rem)] [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:w-auto sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
        >
          <TypeChip active={filters.type === null} onClick={() => onFilterChange({ type: null })}>
            All places
          </TypeChip>
          {facets.types.map(({ type, count }) => (
            <TypeChip
              key={type}
              active={filters.type === type}
              onClick={() =>
                onFilterChange({ type: filters.type === type ? null : (type as PlaceType) })
              }
            >
              <span aria-hidden="true">{PLACE_TYPE_META[type].emoji}</span>
              {PLACE_TYPE_META[type].plural}
              <span className="text-xs font-semibold opacity-75">{count}</span>
            </TypeChip>
          ))}
        </div>
        <p
          role="status"
          aria-live="polite"
          className="ml-auto text-sm font-semibold text-ink-muted"
        >
          Showing {visibleCount} of {totalCount} {totalCount === 1 ? "place" : "places"}
          {hasActiveFilters(filters) ? (
            <>
              {" · "}
              <button
                type="button"
                onClick={onClear}
                className="font-bold text-coral-deep underline underline-offset-4"
              >
                Clear filters
              </button>
            </>
          ) : null}
        </p>
      </div>
    </section>
  );
}

function ViewButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex tap-target items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors",
        active ? "bg-ink text-parchment" : "text-ink-soft hover:bg-ink/[0.07]",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function TypeChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-bold whitespace-nowrap transition-colors",
        active
          ? "border-ocean bg-ocean text-parchment"
          : "border-line bg-white text-ink-soft hover:border-ink/40 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
