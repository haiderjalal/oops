import type { SVGProps } from "react";

/**
 * Hand-drawn accents, all inline SVG (no image requests). Decorative: always aria-hidden.
 * Colour comes from `currentColor`, so callers pick it with a text-* class.
 */

type DoodleProps = SVGProps<SVGSVGElement>;

export function Squiggle(props: DoodleProps) {
  return (
    <svg viewBox="0 0 120 12" fill="none" aria-hidden="true" preserveAspectRatio="none" {...props}>
      <path
        d="M2 7c8-8 14 6 22-1s14-6 22 0 14 7 22 0 14-6 22 0 14 6 24-1"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Sparkle(props: DoodleProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 1l2.2 7.3L22 11l-7.8 2.7L12 23l-2.2-9.3L2 11l7.8-2.7z" />
    </svg>
  );
}

/** A little plane trailing a dashed flight path, swooping left to right. */
export function PlaneTrail(props: DoodleProps) {
  return (
    <svg viewBox="0 0 220 90" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4 78C40 76 56 26 112 38s54 30 92-18"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="1 9"
      />
      <g transform="translate(190 8) rotate(-24)" fill="currentColor">
        <path d="M2 14l26-10c2-1 4 1 3 3L21 19l-2 9-4-2-1-6-8 2z" />
      </g>
    </svg>
  );
}

export function CurlyArrow(props: DoodleProps) {
  return (
    <svg viewBox="0 0 90 70" fill="none" aria-hidden="true" {...props}>
      <path
        d="M6 8c26-6 52 4 54 24s-26 24-24 6 30-22 42 6M76 36l4 14-14-3"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The brand pin used in the logotype. */
export function PinGlyph(props: DoodleProps) {
  return (
    <svg viewBox="0 0 32 40" aria-hidden="true" {...props}>
      <path
        d="M16 2C8.8 2 3 7.6 3 14.6 3 24 16 38 16 38s13-14 13-23.4C29 7.6 23.2 2 16 2z"
        fill="var(--color-coral)"
        stroke="var(--color-ink)"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <circle
        cx="16"
        cy="14.5"
        r="5"
        fill="var(--color-paper)"
        stroke="var(--color-ink)"
        strokeWidth="2"
      />
    </svg>
  );
}
