import { expect, test } from "@playwright/test";
import sharp from "sharp";

import { AUTH_FILE, E2E_OWNER, jpegWithGps } from "./fixtures";

test.describe("owner access control (signed out)", () => {
  test("visitors are sent to sign-in and cannot call owner APIs", async ({ page, request }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto("/admin/places/new");
    await expect(page).toHaveURL(/\/admin\/login/);

    expect((await request.get("/api/geocode?q=lisbon")).status()).toBe(401);
    const sign = await request.post("/api/uploads/sign", {
      data: { contentType: "image/png", size: 1000 },
    });
    expect(sign.status()).toBe(401);
  });

  test("a forged session cookie is rejected by server-side verification", async ({
    page,
    context,
  }) => {
    // The proxy only checks that *a* cookie exists; the real check happens on the server.
    await context.addCookies([
      { name: "oops_session", value: "forged.token.value", url: "http://localhost:3100" },
      {
        name: "__Host-oops_session",
        value: "forged.token.value",
        domain: "localhost",
        path: "/",
        secure: true,
      },
    ]);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("wrong credentials or codes are refused with one generic message", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(E2E_OWNER.email);
    await page.getByLabel("Password").fill("definitely-the-wrong-password");
    await page.getByLabel("Authenticator code").fill("123456");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Those details didn't match" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);

    // The email survives a failed attempt (only the secrets are cleared).
    await expect(page.getByLabel("Email")).toHaveValue(E2E_OWNER.email);

    // Right password, wrong code: refused, and the message doesn't say which part was wrong.
    await page.getByLabel("Password").fill(E2E_OWNER.password);
    await page.getByLabel("Authenticator code").fill("000000");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Those details didn't match" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});

test.describe("owner session", () => {
  test.use({ storageState: AUTH_FILE });

  test("the saved session reaches the dashboard, and signing out ends it", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1, name: "Field desk" })).toBeVisible();
    await page
      .getByRole("button", { name: /Sign out/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});

test.describe
  .serial("owner workflow: create → photo → publish → edit → unpublish → delete → restore → purge demo", () => {
  test.use({ storageState: AUTH_FILE });

  const title = "E2E Porto Café";
  let editUrl = "";
  let slug = "";

  test("create a place with the geocoder, pin and a photo, then publish it", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("link", { name: "New place" }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: "New place" })).toBeVisible();

    // Saving without choosing a location is refused.
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Teaser").fill("Pastéis de nata and a very wrong turn.");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(
      page.getByText("Search for the place or click the map to drop the pin first.").first(),
    ).toBeVisible();

    // Search → pick → the pin and coordinates fill in.
    await page.getByLabel("Find the place").fill("porto");
    await page.getByRole("button", { name: /Porto/ }).first().click();
    await expect(page.getByLabel("Latitude")).toHaveValue(/^41\.15/);
    await expect(page.getByLabel("Longitude")).toHaveValue(/^-8\.6/);
    await page.getByLabel("Title").fill(title);

    // Photo: direct signed upload, server-side processing, then alt text.
    await page.setInputFiles("#photo-files", {
      name: "porto-gps.jpg",
      mimeType: "image/jpeg",
      buffer: await jpegWithGps(),
    });
    const altField = page.getByLabel(/Describe this photo/);
    await expect(altField).toBeVisible({ timeout: 30_000 });

    // Publishing without alt text is blocked with a clear message.
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(
      page.getByText("Describe this photo for screen readers before publishing."),
    ).toBeVisible();

    await altField.fill("A pastel de nata on a blue-and-white tile table");
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Saved and published. Visitors can see it now.")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page).toHaveURL(/\/admin\/places\/[0-9a-f-]{36}\/edit/);
    editUrl = page.url();
  });

  test("the published place appears publicly with its processed, metadata-free photo", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    await page.getByLabel("Search places, cities, countries and tags").fill("porto");
    const link = page.getByRole("link", { name: title, exact: true }).first();
    await expect(link).toBeVisible();
    slug = (await link.getAttribute("href"))!.replace("/places/", "");

    await page.goto(`/places/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    // Real content is never labelled demo. (Scoped to this place: "Nearby postcards" below may
    // legitimately show demo neighbours, and the site-wide banner mentions the word too.)
    await expect(page.locator("main > article").getByText("DEMO", { exact: true })).toHaveCount(0);

    const image = page
      .getByRole("img", { name: "A pastel de nata on a blue-and-white tile table" })
      .first();
    await expect(image).toBeVisible();
    await expect
      .poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
      .toBeGreaterThan(0);

    // Fetch the stored file itself and prove the GPS/camera metadata is gone.
    const optimizerSrc = (await image.getAttribute("src"))!;
    const storedPath = decodeURIComponent(
      new URL(optimizerSrc, "http://localhost:3100").searchParams.get("url") ?? "",
    );
    expect(storedPath).toMatch(/^\/api\/media\/photos\/.+-(full|thumb)\.webp$/);
    const stored = Buffer.from(await (await request.get(storedPath)).body());
    expect((await sharp(stored).metadata()).exif).toBeUndefined();
    expect(stored.toString("latin1")).not.toContain("SecretCam");

    // The passport now counts one real place on top of the demo ones.
    await page.goto("/passport");
    await expect(page.getByText(/INCLUDES 12 DEMO PLACES/)).toBeVisible();
    await expect(page.getByRole("region", { name: "Passport summary" })).toContainText("13");
  });

  test("edit the story, then unpublish: it vanishes from the public site", async ({ page }) => {
    await page.goto(editUrl);
    await page.getByLabel("The oops moment").fill("Walked into a glass door. It won.");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved and published.")).toBeVisible({ timeout: 20_000 });

    await page.goto(`/places/${slug}`);
    await expect(page.getByText("Walked into a glass door. It won.")).toBeVisible();

    await page.goto(editUrl);
    await page.getByRole("button", { name: "Move back to draft" }).click();
    await expect(page.getByText("Saved as a draft. Only you can see it.")).toBeVisible({
      timeout: 20_000,
    });

    await page.goto(`/places/${slug}`);
    await expect(
      page.getByRole("heading", { name: "That postcard got lost in the mail" }),
    ).toBeVisible();
  });

  test("delete is reversible from the dashboard", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("button", { name: `Delete ${title}` }).click();
    await page.getByRole("button", { name: "Delete place" }).click();
    await expect(page.getByRole("link", { name: title, exact: true })).toHaveCount(0);

    await page.getByRole("link", { name: /Show deleted/ }).click();
    await expect(page.getByRole("link", { name: title, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Restore" }).click();
    await page.getByRole("link", { name: "Hide deleted" }).click();
    await expect(page.getByRole("link", { name: title, exact: true })).toBeVisible();
  });

  test("demo content can be removed in one click without touching real content", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.getByRole("button", { name: "Remove demo content" }).click();
    await page.getByRole("button", { name: "Remove demo content" }).last().click();
    await expect(page.getByText(/demo (entry is|entries are)/)).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByRole("link", { name: title, exact: true })).toBeVisible(); // the real (draft) place survives

    await page.goto("/passport");
    await expect(page.getByText(/INCLUDES .* DEMO/)).toHaveCount(0);
    await page.goto("/");
    await expect(page.getByText("DEMO", { exact: true })).toHaveCount(0);
  });
});
