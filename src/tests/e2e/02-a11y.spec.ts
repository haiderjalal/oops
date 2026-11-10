import { test } from "@playwright/test";

import { AUTH_FILE, expectNoA11yViolations } from "./fixtures";

/**
 * Automated WCAG 2.2 AA checks (axe-core). These catch contrast, naming, landmark and ARIA
 * problems; they complement — not replace — manual keyboard and screen-reader checks.
 */
const PUBLIC_PAGES = [
  ["home (map view)", "/"],
  ["home (list view)", "/?view=list"],
  ["home with a place selected", "/?place=demo-hagia-sophia-istanbul"],
  ["place page", "/places/demo-hagia-sophia-istanbul"],
  ["timeline", "/timeline"],
  ["passport", "/passport"],
  ["bucket list", "/bucket-list"],
  ["about", "/about"],
  ["not found", "/nothing-here"],
  ["owner sign-in", "/admin/login"],
] as const;

// Audit the reduced-motion presentation: no scroll-reveal fades or fly-to animations, so every
// element is measured at its final colour. (Motion is opt-in; this is also what many users get.)
test.use({ reducedMotion: "reduce" });

for (const [name, path] of PUBLIC_PAGES) {
  test(`accessibility: ${name}`, async ({ page }) => {
    await page.goto(path);
    if (path === "/" || path.startsWith("/?place")) {
      // Let the lazy map initialise so its controls are audited too.
      await page.locator("canvas.maplibregl-canvas").waitFor({ timeout: 25_000 });
    }
    await expectNoA11yViolations(page);
  });
}

test.describe("owner dashboard", () => {
  test.use({ storageState: AUTH_FILE });

  test("accessibility: dashboard and place editor", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("heading", { level: 1, name: "Field desk" }).waitFor();
    await expectNoA11yViolations(page);
    await page.goto("/admin/places/new");
    await page.getByRole("heading", { level: 1, name: "New place" }).waitFor();
    await expectNoA11yViolations(page);
    await page.goto("/admin/trips");
    await expectNoA11yViolations(page);
    await page.goto("/admin/bucket-list");
    await expectNoA11yViolations(page);
  });
});
