"use client";

import { useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";

import { Input } from "@/components/ui/fields";
import { PLACE_TYPE_META } from "@/constants/placeTypes";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import type { GeocodeResult } from "@/types/domain";
import { countryFlag } from "@/utils/geo";

interface LocationSearchProps {
  onPick: (result: GeocodeResult) => void;
}

interface SearchResponse {
  results?: GeocodeResult[];
  error?: string;
  provider?: string;
  production?: boolean;
}

/** Search a country, city, café, restaurant or street address, then pick a result to drop the pin. */
export function LocationSearch({ onPick }: LocationSearchProps) {
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const controller = useRef<AbortController | null>(null);

  const search = useDebouncedCallback(async (query: string) => {
    controller.current?.abort();
    if (query.trim().length < 2) {
      setResults([]);
      setStatus("idle");
      return;
    }

    const abort = new AbortController();
    controller.current = abort;
    setStatus("loading");
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`, {
        signal: abort.signal,
      });
      const body = (await response.json()) as SearchResponse;
      if (!response.ok) throw new Error(body.error ?? "Search failed.");
      setResults(body.results ?? []);
      setOffline(body.production === false);
      setMessage(null);
      setStatus("done");
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setResults([]);
      setMessage(
        (error as Error).message || "Search failed. You can still click the map to place the pin.",
      );
      setStatus("error");
    }
  }, 350);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="location-search" className="text-sm font-bold">
        Find the place
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
        <Input
          id="location-search"
          type="search"
          autoComplete="off"
          placeholder="A country, a city, a café, a street address…"
          onChange={(event) => search(event.target.value)}
          aria-describedby="location-search-help"
          className="pl-11"
        />
        {status === "loading" ? (
          <Loader2
            className="absolute top-1/2 right-4 size-4 -translate-y-1/2 animate-spin text-ink-muted"
            aria-hidden="true"
          />
        ) : null}
      </div>
      <p id="location-search-help" className="text-xs text-ink-muted">
        Pick a result to drop the pin, then fine-tune it on the map if the search was a little off.
      </p>

      <div role="status" aria-live="polite" className="text-sm">
        {status === "done" && results.length === 0 ? (
          <p className="text-ink-muted">No matches. Try another spelling, or click the map.</p>
        ) : null}
        {status === "error" && message ? (
          <p className="font-semibold text-danger">{message}</p>
        ) : null}
        {offline && status === "done" ? (
          <p className="mt-1 rounded-lg bg-sunrise/30 px-3 py-2 text-xs text-ink">
            Using the offline city list (about 45 major cities). Add{" "}
            <code>MAPTILER_GEOCODING_KEY</code> to search cafés, restaurants and street addresses.
          </p>
        ) : null}
      </div>

      {results.length > 0 ? (
        <ul
          className="divide-y divide-line/70 overflow-hidden rounded-xl border border-line bg-white"
          aria-label="Search results"
        >
          {results.map((result) => (
            <li
              key={`${result.provider}:${result.providerPlaceId ?? result.formattedAddress}:${result.lat}`}
            >
              <button
                type="button"
                onClick={() => {
                  onPick(result);
                  setResults([]);
                  setStatus("idle");
                }}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-parchment-deep/60"
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-coral-deep" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block font-bold">
                    <span aria-hidden="true">{countryFlag(result.countryCode)} </span>
                    {result.placeName}
                    <span className="ml-2 text-xs font-semibold text-ink-muted">
                      {PLACE_TYPE_META[result.suggestedType].emoji}{" "}
                      {PLACE_TYPE_META[result.suggestedType].label}
                    </span>
                  </span>
                  <span className="block truncate text-xs text-ink-muted">
                    {result.formattedAddress}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
