import { useId } from "react";

import { cn } from "@/utils/cn";

export type StampTone = "coral" | "ocean" | "sunrise" | "lavender" | "ink";

const TONES: Record<StampTone, { stroke: string; fill: string; text: string }> = {
  coral: {
    stroke: "var(--color-coral-deep)",
    fill: "rgb(250 107 74 / 0.10)",
    text: "var(--color-coral-deep)",
  },
  ocean: {
    stroke: "var(--color-ocean)",
    fill: "rgb(22 79 104 / 0.08)",
    text: "var(--color-ocean)",
  },
  sunrise: {
    stroke: "var(--color-sunrise-deep)",
    fill: "rgb(242 198 109 / 0.22)",
    text: "var(--color-sunrise-deep)",
  },
  lavender: {
    stroke: "var(--color-lavender-deep)",
    fill: "rgb(168 164 230 / 0.2)",
    text: "var(--color-lavender-deep)",
  },
  ink: { stroke: "var(--color-ink)", fill: "rgb(32 44 55 / 0.06)", text: "var(--color-ink)" },
};

interface StampProps {
  /** Curved along the top edge (keep it short, ≤ 16 characters). */
  top: string;
  /** Curved along the bottom edge. */
  bottom?: string;
  /** Big centre mark — a flag, emoji or a short word. */
  center: string;
  tone?: StampTone;
  /** Degrees of rotation, for that "stamped by hand" look. */
  tilt?: number;
  className?: string;
  /** Accessible description. Stamps are otherwise decorative. */
  label?: string;
}

/** A circular passport stamp with text curved around the rim. */
export function Stamp({
  top,
  bottom,
  center,
  tone = "coral",
  tilt = -8,
  className,
  label,
}: StampProps) {
  const id = useId();
  const colors = TONES[tone];
  const topPath = `${id}-top`;
  const bottomPath = `${id}-bottom`;

  return (
    <svg
      viewBox="0 0 120 120"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("shrink-0", className)}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <defs>
        <path id={topPath} d="M 60 60 m -43 0 a 43 43 0 1 1 86 0" />
        <path id={bottomPath} d="M 60 60 m -49 0 a 49 49 0 0 0 98 0" />
      </defs>
      <circle
        cx="60"
        cy="60"
        r="56"
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth="3"
        strokeDasharray="2 4"
      />
      <circle cx="60" cy="60" r="33" fill="none" stroke={colors.stroke} strokeWidth="2" />
      <text
        fill={colors.text}
        fontFamily="var(--font-sans)"
        fontWeight="800"
        fontSize="11.5"
        letterSpacing="2.4"
        textAnchor="middle"
      >
        <textPath href={`#${topPath}`} startOffset="50%">
          {top.toUpperCase()}
        </textPath>
      </text>
      {bottom ? (
        <text
          fill={colors.text}
          fontFamily="var(--font-sans)"
          fontWeight="800"
          fontSize="10"
          letterSpacing="2"
          textAnchor="middle"
        >
          <textPath href={`#${bottomPath}`} startOffset="50%">
            {bottom.toUpperCase()}
          </textPath>
        </text>
      ) : null}
      <text
        x="60"
        y="72"
        textAnchor="middle"
        fontSize="32"
        fill={colors.text}
        fontFamily="var(--font-display)"
        fontWeight="800"
      >
        {center}
      </text>
    </svg>
  );
}

/** "DEMO" label for synthetic sample content. Always shown wherever demo data appears. */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex -rotate-3 items-center rounded-md border-2 border-dashed border-lavender-deep/50 bg-lavender/30 px-2 py-0.5 text-[0.68rem] leading-none font-extrabold tracking-[0.18em] text-lavender-deep",
        className,
      )}
      title="Sample content, not the owner's real travel history"
    >
      DEMO
    </span>
  );
}
