"use client";

import Link from "next/link";
import { useEffect } from "react";

import { buttonStyles } from "@/components/ui/Button";

/**
 * Route-level error boundary. Shows a friendly message and a retry — never the raw error,
 * which could expose internals. The digest lets the owner match it to server logs.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error", error.digest ?? "");
  }, [error]);

  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center gap-4 px-6 py-24 text-center outline-none"
    >
      <p className="text-6xl" aria-hidden="true">
        🌧️
      </p>
      <h1 className="text-4xl">Well, that went sideways</h1>
      <p className="text-lg leading-relaxed text-ink-soft">
        Something broke on our side. Nothing you did. Give it another go, or head back to the globe.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className={buttonStyles({ variant: "primary", size: "lg" })}
        >
          Try again
        </button>
        <Link href="/" className={buttonStyles({ variant: "secondary", size: "lg" })}>
          Back to the globe
        </Link>
      </div>
      {error.digest ? <p className="text-xs text-ink-muted">Reference: {error.digest}</p> : null}
    </main>
  );
}
