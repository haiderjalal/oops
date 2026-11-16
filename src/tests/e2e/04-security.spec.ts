import { expect, test } from "@playwright/test";

import { AUTH_FILE, E2E_OWNER } from "./fixtures";

/**
 * Security checks against the production build, as a visitor would see it. These use only the
 * test-only credentials in fixtures.ts; nothing here touches real data.
 */

const OWNER_ROUTES = [
  "/admin/media",
  "/admin/trips",
  "/admin/bucket-list",
  "/admin/places/new",
  "/admin/places/00000000-0000-4000-8000-000000000000/edit",
];

const SENSITIVE_FILES = [
  "/.env",
  "/.env.local",
  "/.git/config",
  "/package.json",
  "/index.html",
  "/CLAUDE.md",
  "/drizzle/0000_initial_schema.sql",
  "/src/lib/config.ts",
  "/.data/pglite",
];

test.describe("browser security headers", () => {
  test("every page gets HSTS, a strict CSP and anti-framing headers", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();
    expect(headers["strict-transport-security"]).toBe("max-age=63072000; includeSubDomains");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
    expect(headers["content-security-policy"]).not.toContain("'unsafe-eval'");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("owner pages are not readable cross-site", async ({ request }) => {
    const response = await request.get("/admin/login");
    expect(response.headers()["cross-origin-resource-policy"]).toBe("same-origin");
  });
});

test.describe("owner-only endpoints", () => {
  test("refuse visitors without a session", async ({ request }) => {
    expect((await request.get("/api/geocode?q=lisbon")).status()).toBe(401);
    const sign = await request.post("/api/uploads/sign", {
      data: { contentType: "image/png", size: 1000 },
    });
    expect(sign.status()).toBe(401);
  });

  test("refuse cross-site requests before anything else, and never allow cross-origin reads", async ({
    request,
  }) => {
    const evil = { origin: "https://evil.example" };
    const geocode = await request.get("/api/geocode?q=lisbon", { headers: evil });
    expect(geocode.status()).toBe(403);
    expect(geocode.headers()["access-control-allow-origin"]).toBeUndefined();

    const sign = await request.post("/api/uploads/sign", {
      headers: evil,
      data: { contentType: "image/png", size: 1000 },
    });
    expect(sign.status()).toBe(403);
    expect(sign.headers()["access-control-allow-origin"]).toBeUndefined();
  });

  test("public GeoJSON never grants cross-origin credentials", async ({ request }) => {
    const response = await request.get("/api/places", { headers: { origin: "https://evil.example" } });
    expect(response.headers()["access-control-allow-credentials"]).toBeUndefined();
  });
});

test.describe("admin routes when signed out", () => {
  for (const route of OWNER_ROUTES) {
    test(`${route} sends visitors to sign-in`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/admin\/login/);
    });
  }
});

test.describe("nothing internal is served", () => {
  for (const path of SENSITIVE_FILES) {
    test(`${path} is not served`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(404);
    });
  }

  test("error pages show no stack traces or file paths", async ({ request }) => {
    const body = await (await request.get("/nothing-here-at-all")).text();
    expect(body).not.toMatch(/node_modules|\.tsx?:\d+|at async |Error: /);
  });
});

test.describe("no server secret reaches the browser", () => {
  const SECRETS = [E2E_OWNER.authSecret, E2E_OWNER.totpSecret, E2E_OWNER.password];

  for (const path of ["/", "/admin/login"]) {
    test(`the page and every script it loads at ${path} are free of secrets`, async ({ request }) => {
      const html = await (await request.get(path)).text();
      for (const secret of SECRETS) expect(html).not.toContain(secret);

      const scripts = [...html.matchAll(/src="(\/_next\/static\/[^"]+)"/g)].map((match) => match[1]!);
      expect(scripts.length).toBeGreaterThan(0);
      for (const src of scripts) {
        const body = await (await request.get(src)).text();
        for (const secret of SECRETS) expect(body, `secret found in ${src}`).not.toContain(secret);
      }
    });
  }
});

test.describe("owner session cookie", () => {
  test.use({ storageState: AUTH_FILE });

  test("is HttpOnly, Secure, SameSite=Lax and host-locked", async ({ page }) => {
    await page.goto("/admin");
    const cookies = await page.context().cookies();
    const session = cookies.find((cookie) => cookie.name === "__Host-oops_session");
    expect(session).toBeDefined();
    expect(session?.httpOnly).toBe(true);
    expect(session?.secure).toBe(true);
    expect(session?.sameSite).toBe("Lax");
    expect(session?.path).toBe("/");
    expect(session?.domain).toBe("localhost");
  });
});
