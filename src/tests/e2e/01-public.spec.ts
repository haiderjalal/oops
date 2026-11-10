import { expect, test } from "@playwright/test";

const ISTANBUL = "demo-hagia-sophia-istanbul";

test.describe("public site", () => {
  test("shows real content immediately, then upgrades to the interactive globe", async ({
    page,
  }) => {
    await page.goto("/");
    // Primary content is in the HTML before any map code runs.
    await expect(page.getByRole("heading", { level: 1 })).toContainText("The world is my");
    await expect(page.getByRole("link", { name: "Hagia Sophia" }).first()).toBeVisible();
    // ...and the map lazy-loads afterwards.
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText("Country shapes © Natural Earth")).toBeVisible(); // attribution is preserved
  });

  test("works without JavaScript: content, static globe poster and crawlable links", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("http://localhost:3100/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("img", { name: /Illustration of the globe/ })).toBeVisible();
    await expect(page.locator(`a[href="/places/${ISTANBUL}"]`).first()).toBeVisible();
    await context.close();
  });

  test("selecting a place updates the URL, shows its postcard, and back/forward work", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Show Hagia Sophia on the map" }).click();
    await expect(page).toHaveURL(new RegExp(`place=${ISTANBUL}`));
    const heading = page.getByRole("heading", { level: 2, name: "Hagia Sophia" });
    await expect(heading).toBeVisible();
    await expect(heading).toBeFocused(); // focus moves to the postcard for keyboard/screen-reader users

    await page.goBack();
    await expect(page).not.toHaveURL(/place=/);
    await expect(heading).toBeHidden();
    await page.goForward();
    await expect(heading).toBeVisible();
  });

  test("deep links open the right place directly", async ({ page }) => {
    await page.goto("/?place=demo-faisal-mosque-islamabad");
    await expect(page.getByRole("heading", { level: 2, name: "Faisal Mosque" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Read the full story" })).toHaveAttribute(
      "href",
      "/places/demo-faisal-mosque-islamabad",
    );
  });

  test("search and filters narrow both the list and the count, and can be cleared", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("status").filter({ hasText: "Showing 12 of 12" })).toBeVisible();

    await page.getByRole("button", { name: /Coffee shops/ }).click();
    await expect(page.getByText("Showing 1 of 12")).toBeVisible();
    await expect(page).toHaveURL(/type=cafe/);

    await page.getByRole("button", { name: "Clear filters" }).click();
    await page.getByLabel("Search places, cities, countries and tags").fill("reykjavik");
    await expect(page.getByText("Showing 1 of 12")).toBeVisible(); // accent-insensitive: "reykjavik" finds Reykjavík
    await page.getByLabel("Search places, cities, countries and tags").fill("zzzz-nothing");
    await expect(page.getByText("No postcards match those filters.")).toBeVisible();
  });

  test("list view offers the same places without the map", async ({ page }) => {
    await page.goto("/?view=list");
    await expect(page.locator("canvas.maplibregl-canvas")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Hagia Sophia" })).toBeVisible();
    expect(await page.getByRole("article").count()).toBeGreaterThanOrEqual(12);
  });

  test("skip link is the first tab stop", async ({ page }) => {
    await page.goto("/about");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  });
});

test.describe("journal pages", () => {
  test("a place page tells the story and labels demo content", async ({ page }) => {
    await page.goto(`/places/${ISTANBUL}`);
    await expect(page.getByRole("heading", { level: 1, name: "Hagia Sophia" })).toBeVisible();
    await expect(page.getByText("DEMO").first()).toBeVisible();
    await expect(page.getByText("Oops moment").first()).toBeVisible();
    await expect(page).toHaveTitle(/Hagia Sophia/);
    // Sample content must never be indexed as a real story.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('script[type="application/ld+json"]').first()).toBeAttached();
  });

  test("approximate places never leak exact coordinates or addresses", async ({
    page,
    request,
  }) => {
    await page.goto("/places/demo-secret-rooftop-lisbon");
    await expect(page.getByText("Kept vague on purpose")).toBeVisible();
    await expect(page.getByText("Baixa")).toHaveCount(0); // the street-level address is hidden
    const jsonLd = (
      await page.locator('script[type="application/ld+json"]').allTextContents()
    ).join("");
    expect(jsonLd).not.toContain("GeoCoordinates");

    const geo = (await (await request.get("/api/places")).json()) as {
      features: { geometry: { coordinates: number[] }; properties: { slug: string } }[];
    };
    const feature = geo.features.find(
      (item) => item.properties.slug === "demo-secret-rooftop-lisbon",
    );
    expect(feature?.geometry.coordinates).toEqual([-9.1, 38.7]); // rounded to ~11 km, never the real 38.7139,-9.1334
  });

  test("drafts stay private everywhere", async ({ page, request }) => {
    await page.goto("/places/demo-draft-patagonia");
    await expect(
      page.getByRole("heading", { name: "That postcard got lost in the mail" }),
    ).toBeVisible();
    await expect(page.getByText("Somewhere Windy in Patagonia")).toHaveCount(0);

    const geo = await (await request.get("/api/places")).text();
    expect(geo).not.toContain("demo-draft-patagonia");
    expect(await (await request.get("/sitemap.xml")).text()).not.toContain("patagonia");
  });

  test("timeline groups trips into chapters by year", async ({ page }) => {
    await page.goto("/timeline");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("One wrong turn at a time");
    await expect(page.getByRole("heading", { name: "The Wrong Turns Tour (demo)" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "2023" })).toBeVisible();
  });

  test("passport stats come from published entries and say so", async ({ page }) => {
    await page.goto("/passport");
    const summary = page.getByRole("region", { name: "Passport summary" });
    await expect(summary.getByText("Countries")).toBeVisible();
    await expect(summary).toContainText("7"); // PT, TR, JP, IS, ZA, PE, PK — the draft's country (CL) is excluded
    await expect(summary).not.toContainText("Chile");
    await expect(page.getByText(/INCLUDES 12 DEMO PLACES/)).toBeVisible();
    await expect(page.getByText(/never count as visits/)).toBeVisible();
  });

  test("bucket list never claims a visit that has no journal entry", async ({ page }) => {
    await page.goto("/bucket-list");
    await expect(page.getByRole("heading", { name: "Still dreaming" })).toBeVisible();
    const santorini = page.getByRole("article").filter({ hasText: "Santorini sunrise" });
    await expect(santorini).toContainText("isn’t counted as a visit");
    await expect(santorini.getByRole("link")).toHaveCount(0);
    const tableMountain = page.getByRole("article").filter({ hasText: "Table Mountain" });
    await expect(tableMountain.getByRole("link", { name: /Read the story/ })).toBeVisible();
  });
});

test.describe("phone layout", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  const PAGES = [
    "/",
    "/?view=list",
    "/?place=demo-hagia-sophia-istanbul",
    "/places/demo-hagia-sophia-istanbul",
    "/timeline",
    "/passport",
    "/bucket-list",
    "/about",
    "/admin/login",
  ];

  for (const path of PAGES) {
    test(`no sideways scrolling at 375px: ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      // A wider-than-screen element makes phones zoom the whole page out and crop it.
      const overflow = await page.evaluate(() => ({
        viewport: window.innerWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(
        overflow.content,
        `content is ${overflow.content}px wide in a ${overflow.viewport}px viewport`,
      ).toBeLessThanOrEqual(overflow.viewport);
    });
  }

  test("selecting a place opens the bottom sheet over the map, and it can be collapsed and dismissed", async ({
    page,
  }) => {
    await page.goto("/?place=demo-hagia-sophia-istanbul");
    const sheet = page.getByRole("complementary", { name: "Selected place" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("heading", { level: 2, name: "Hagia Sophia" })).toBeVisible();

    await sheet.getByRole("button", { name: /Collapse/ }).click();
    // Collapsed content is clipped to zero height AND made `inert`, so keyboard and screen-reader
    // users can't reach it (Playwright's geometric "visible" can't tell, so assert the attribute).
    await expect(sheet.locator("[inert]")).toHaveCount(1);
    // The handle shows the title when collapsed (exact: "Close Hagia Sophia" is a different button).
    await sheet.getByRole("button", { name: "Hagia Sophia", exact: true }).click();
    await expect(sheet.locator("[inert]")).toHaveCount(0);
    await expect(sheet.getByRole("heading", { name: "Hagia Sophia" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(page).not.toHaveURL(/place=/);
  });
});

test.describe("platform", () => {
  test("sends security headers", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("robots and sitemap behave", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBe(true);
  });

  test("health endpoint reports a working database", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBe(true);
    expect(await response.json()).toEqual({ status: "ok", database: "ok" });
  });

  test("unknown routes show the friendly 404", async ({ page }) => {
    const response = await page.goto("/definitely/not/a/page");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Oops. Wrong turn." })).toBeVisible();
  });
});
