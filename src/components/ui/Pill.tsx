import type { HTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export type PillTone = "neutral" | "coral" | "ocean" | "sunrise" | "lavender" | "ink";

const TONES: Record<PillTone, string> = {
  neutral: "bg-parchment-deep text-ink-soft border-line",
  coral: "bg-coral/15 text-coral-deep border-coral/40",
  ocean: "bg-ocean/10 text-ocean border-ocean/30",
  sunrise: "bg-sunrise/30 text-sunrise-deep border-sunrise-deep/30",
  lavender: "bg-lavender/25 text-lavender-deep border-lavender-deep/30",
  ink: "bg-ink text-parchment border-ink",
};

interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: PillTone;
}

/** Small rounded label: place types, statuses, tags. */
export function Pill({ tone = "neutral", className, ...rest }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold tracking-wide whitespace-nowrap",
        TONES[tone],
        className,
      )}
      {...rest}
    />
  );
}
