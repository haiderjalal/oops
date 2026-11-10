"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import type { ActionResult } from "@/lib/errors";

/**
 * Runs a server action with pending + error state and refreshes the page on success.
 * Keeps every admin button's behaviour (and its error message) consistent.
 */
export function useOwnerAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    <T>(action: () => Promise<ActionResult<T>>, onSuccess?: (data: T) => void) => {
      setError(null);
      startTransition(async () => {
        const result = await action();
        if (!result.ok) {
          setError(result.error);
          return;
        }
        onSuccess?.(result.data);
        router.refresh();
      });
    },
    [router],
  );

  return { run, pending, error, clearError: () => setError(null) };
}
