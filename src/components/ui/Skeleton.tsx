import type { HTMLAttributes } from "react";

import { cn } from "@/utils/cn";

/** Loading placeholder. Pulses only when the visitor allows motion. */
export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-xl bg-ink/[0.08] motion-safe:animate-pulse", className)}
      {...rest}
    />
  );
}
