import { type Page, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { generate } from "otplib";
import sharp from "sharp";

/**
 * TEST-ONLY credentials for the throw-away server that Playwright starts (in-memory database,
 * never deployed, never used anywhere else). They exist so the sign-in + two-factor flow can be
 * exercised end to end.
 */
export const E2E_OWNER = {
  email: "owner@e2e.test",
  password: "e2e-only-correct-horse-battery",
  // 160 bits, like real secrets from `npm run setup:owner` (otplib refuses anything under 128 bits).
  totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
  authSecret: "e2e-only-secret-for-signing-test-sessions-0123456789",
} as const;

/** Where the signed-in session is saved by auth.setup.ts (git-ignored under .data/). */
export const AUTH_FILE = ".data/e2e-auth.json";

/** Sign in through the real login form, including the authenticator code. */
export async function signIn(page: Page): Promise<void> {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(E2E_OWNER.email);
  await page.getByLabel("Password").fill(E2E_OWNER.password);
  await page
    .getByLabel("Authenticator code")
    .fill(await generate({ secret: E2E_OWNER.totpSecret }));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** WCAG 2.2 AA automated checks (axe). Fails with a readable summary of each violation. */
export async function expectNoA11yViolations(
  page: Page,
  options: { exclude?: string[] } = {},
): Promise<void> {
  // axe reads *computed* colours. A button mid-way through a colour transition (or a card half-way
  // through its scroll reveal) would be measured while partly faded — a false alarm. Wait for every
  // finite animation to settle first; endless decorative ones (the wobbling sparkle) are ignored.
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => {
      const timing = animation.effect?.getComputedTiming();
      return animation.playState !== "running" || timing?.iterations === Infinity;
    }),
  );

  let builder = new AxeBuilder({ page }).withTags([
    "wcag2a",
    "wcag2aa",
    "wcag21a",
    "wcag21aa",
    "wcag22aa",
  ]);
  for (const selector of options.exclude ?? []) builder = builder.exclude(selector);
  const { violations } = await builder.analyze();

  const summary = violations
    .map(
      (violation) =>
        `${violation.id} (${violation.impact}): ${violation.help}\n  ${violation.nodes
          .slice(0, 3)
          .map((node) => node.target.join(" "))
          .join("\n  ")}`,
    )
    .join("\n");
  expect(violations, summary).toEqual([]);
}

/** A real JPEG that carries GPS EXIF, to prove the server strips it. */
export async function jpegWithGps(): Promise<Buffer> {
  return sharp({
    create: { width: 1200, height: 800, channels: 3, background: { r: 230, g: 120, b: 80 } },
  })
    .jpeg()
    .withExif({
      IFD0: { Make: "SecretCam" },
      IFD3: {
        GPSLatitudeRef: "N",
        GPSLatitude: "38/1 43/1 20/1",
        GPSLongitudeRef: "W",
        GPSLongitude: "9/1 8/1 21/1",
      },
    })
    .toBuffer();
}
