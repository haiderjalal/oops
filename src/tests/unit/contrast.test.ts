import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * WCAG 2.2 colour-contrast checks against the real design tokens in globals.css.
 * Text needs 4.5:1 (3:1 for large text); focus rings and UI boundaries need 3:1.
 */

const css = readFileSync(path.resolve(__dirname, "../../styles/globals.css"), "utf8");

function token(name: string): string {
  const match = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (!match?.[1]) throw new Error(`Missing colour token --color-${name}`);
  return match[1];
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(token(foreground)), luminance(token(background))].sort(
    (a, b) => b - a,
  ) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

const TEXT_PAIRS: [string, string][] = [
  ["ink", "parchment"],
  ["ink-soft", "parchment"],
  ["ink-muted", "parchment"],
  ["ink-muted", "paper"],
  ["ink-muted", "parchment-deep"],
  ["coral-deep", "parchment"],
  ["coral-deep", "paper"],
  ["ocean", "parchment"],
  ["ocean", "paper"],
  ["sunrise-deep", "paper"],
  ["lavender-deep", "paper"],
  ["parchment", "ocean-deep"],
  ["parchment", "ink"],
  ["sunrise", "ocean-deep"],
  ["ink", "coral"], // primary button: ink text on coral
  ["ink", "sunrise"],
  ["success", "paper"],
  ["danger", "paper"],
];

describe("colour contrast (WCAG AA)", () => {
  it.each(TEXT_PAIRS)("%s on %s has at least 4.5:1", (foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it("white text on the danger button is readable", () => {
    expect(contrast("danger", "paper")).toBeGreaterThanOrEqual(4.5);
  });

  it("focus rings are visible on both light and dark surfaces (3:1)", () => {
    expect(contrast("ocean", "parchment")).toBeGreaterThanOrEqual(3);
    expect(contrast("sunrise", "ocean-deep")).toBeGreaterThanOrEqual(3);
  });

  it("documents why coral itself is never used for small text", () => {
    // Coral on parchment is below 4.5:1, which is exactly why `coral-deep` exists.
    expect(contrast("coral", "parchment")).toBeLessThan(4.5);
  });
});
