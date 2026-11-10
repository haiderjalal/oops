"use client";

import dynamic from "next/dynamic";
import { type ReactNode, type Ref, useEffect, useState, useSyncExternalStore } from "react";
import { Globe2, Map as MapIcon, Minus, Plus, Scan } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { ClientMapConfig } from "@/lib/config";
import type { PlaceSummary } from "@/types/domain";
import { cn } from "@/utils/cn";

import type { CameraPadding, MapProjection, TravelMapHandle } from "./TravelMap";

// The map (MapLibre ≈ 250 kB gzipped) is a separate chunk that loads only after the page has
// rendered and the browser is idle — never on pages that don't show a map.
const TravelMap = dynamic(() => import("./TravelMap").then((module) => module.TravelMap), {
  ssr: false,
  loading: () => null,
});

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

function isConstrainedNetwork(): boolean {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  return Boolean(connection?.saveData) || /(^|-)2g$/.test(connection?.effectiveType ?? "");
}

/** True when the visitor asked for less data (or is on a very slow link). Stable across renders. */
export function useConstrainedNetwork(): boolean {
  return useSyncExternalStore(
    () => () => {},
    isConstrainedNetwork,
    () => false,
  );
}

type Status = "waiting" | "loading" | "ready" | "failed";

interface MapStageProps {
  /** Server-rendered static globe, visible until the interactive map is ready. */
  poster: ReactNode;
  places: readonly PlaceSummary[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  config: ClientMapConfig;
  visitedCountryCodes: readonly string[];
  cameraPadding: CameraPadding;
  mapHandleRef: Ref<TravelMapHandle>;
  /** Escape hatch when the map can't run: switch the explorer to its list view. */
  onShowList: () => void;
  /** Overlays that live inside the frame (the mobile bottom sheet). */
  children?: ReactNode;
  className?: string;
}

export function MapStage({
  poster,
  places,
  selectedSlug,
  onSelect,
  config,
  visitedCountryCodes,
  cameraPadding,
  mapHandleRef,
  onShowList,
  children,
  className,
}: MapStageProps) {
  const constrained = useConstrainedNetwork();
  const [armed, setArmed] = useState(false);
  const [status, setStatus] = useState<Status>("waiting");
  const [projection, setProjection] = useState<MapProjection>("globe");
  const [usingFallback, setUsingFallback] = useState(false);

  // Arm the map once the page has rendered and the main thread is idle.
  useEffect(() => {
    if (constrained) return;
    let cancelled = false;
    const arm = () => {
      if (!cancelled) setArmed(true);
    };
    // Safari only gained requestIdleCallback recently; fall back to a short timer.
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(arm, { timeout: 2000 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(handle);
      };
    }
    const timer = window.setTimeout(arm, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [constrained]);

  const ready = status === "ready";
  const atlasOnly = config.mode === "offline" || usingFallback;

  return (
    <div
      className={cn(
        "map-stage on-dark h-[68svh] min-h-[28rem] lg:h-[clamp(34rem,calc(100svh-15rem),52rem)]",
        className,
      )}
    >
      {/* Static poster: first paint, no-JS view, and the permanent fallback if the map can't run. */}
      <div
        className={cn(
          // `container-type: size` lets the globe be the largest square that fits (cqw/cqh units)
          // without ever forcing the page wider than a phone screen.
          "[container-type:size] absolute inset-0 grid place-items-center p-6 transition-opacity duration-500",
          ready && "pointer-events-none opacity-0",
        )}
        aria-hidden={ready || undefined}
      >
        <div className="aspect-square w-[min(100cqw,100cqh,34rem)]">{poster}</div>
      </div>

      {armed && status !== "failed" ? (
        <TravelMap
          ref={mapHandleRef}
          places={places}
          selectedSlug={selectedSlug}
          onSelect={onSelect}
          config={config}
          projection={projection}
          visitedCountryCodes={visitedCountryCodes}
          cameraPadding={cameraPadding}
          onReady={() => setStatus("ready")}
          onFallback={() => setUsingFallback(true)}
          onFailure={() => setStatus("failed")}
        />
      ) : null}

      {!ready && status !== "failed" ? (
        <div
          className="absolute inset-x-0 bottom-6 z-10 flex flex-col items-center gap-3 text-center"
          role="status"
        >
          {constrained && !armed ? (
            <>
              <p className="max-w-xs text-sm text-parchment/90">
                Data saver is on, so the interactive globe is paused.
              </p>
              <Button variant="primary" onClick={() => setArmed(true)}>
                <Globe2 className="size-4" aria-hidden="true" />
                Load the interactive globe
              </Button>
            </>
          ) : (
            <p className="rounded-full bg-ocean-deep/60 px-4 py-1.5 text-sm font-semibold text-parchment/85">
              Warming up the globe…
            </p>
          )}
        </div>
      ) : null}

      {status === "failed" ? (
        <div
          className="absolute inset-x-4 bottom-6 z-10 mx-auto flex max-w-md flex-col items-center gap-3 text-center"
          role="alert"
        >
          <p className="rounded-2xl bg-paper px-5 py-3 text-sm text-ink shadow-lg">
            The interactive map couldn&rsquo;t start on this device — no worries, every place is in
            the list.
          </p>
          <Button variant="primary" onClick={onShowList}>
            Browse the list instead
          </Button>
        </div>
      ) : null}

      {ready ? (
        <>
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="bg-paper shadow-[var(--shadow-float)]"
              aria-pressed={projection === "globe"}
              onClick={() => setProjection((value) => (value === "globe" ? "mercator" : "globe"))}
            >
              {projection === "globe" ? (
                <MapIcon className="size-4" aria-hidden="true" />
              ) : (
                <Globe2 className="size-4" aria-hidden="true" />
              )}
              {projection === "globe" ? "Flat map" : "Globe"}
            </Button>
            <div className="flex flex-col gap-1.5" role="group" aria-label="Map zoom">
              <MapButton label="Zoom in" onClick={() => mapHandle(mapHandleRef)?.zoomIn()}>
                <Plus className="size-5" aria-hidden="true" />
              </MapButton>
              <MapButton label="Zoom out" onClick={() => mapHandle(mapHandleRef)?.zoomOut()}>
                <Minus className="size-5" aria-hidden="true" />
              </MapButton>
              <MapButton label="Show all places" onClick={() => mapHandle(mapHandleRef)?.fitAll()}>
                <Scan className="size-5" aria-hidden="true" />
              </MapButton>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-9 left-4 z-10 hidden max-w-[16rem] flex-col gap-1.5 sm:flex">
            <div className="rounded-2xl bg-paper px-4 py-2.5 text-ink shadow-[var(--shadow-float)]">
              <p className="text-[0.65rem] font-extrabold tracking-[0.18em] text-ink-muted uppercase">
                You are exploring
              </p>
              <p className="font-display text-lg leading-tight font-bold">
                Planet Earth{" "}
                <span className="text-coral" aria-hidden="true">
                  ✳
                </span>
              </p>
            </div>
            {atlasOnly ? (
              <p
                className="w-fit rounded-full bg-paper/90 px-3 py-1 text-[0.7rem] font-semibold text-ink-soft"
                title="Streets and points of interest need a licensed map provider, which isn't switched on for this site."
              >
                Atlas view · country level
              </p>
            ) : null}
          </div>
        </>
      ) : null}

      {children}
    </div>
  );
}

function mapHandle(ref: Ref<TravelMapHandle>): TravelMapHandle | null {
  return ref && typeof ref === "object" ? ref.current : null;
}

function MapButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid tap-target place-items-center rounded-xl bg-paper text-ink shadow-[var(--shadow-float)] transition-colors hover:bg-white active:translate-y-px"
    >
      {children}
    </button>
  );
}
