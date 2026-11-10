import { beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/lib/db/client";
import { seedDemoContent, purgeDemoContent } from "@/lib/db/seed-demo";
import { photos } from "@/lib/db/schema";
import { toPlaceDetail, toPlaceSummary } from "@/features/places/mappers";
import {
  findPlaceById,
  findPublishedPlaceBySlug,
  findPublishedPlaces,
  listPlacesForAdmin,
} from "@/features/places/places.repository";
import { emptyPlaceInput, placeInputSchema, type PlaceInput } from "@/features/places/schema";
import {
  createPlace,
  deletePlace,
  resolvePublishedAt,
  restorePlace,
  updatePlace,
} from "@/features/places/service";

import { createTestDatabase } from "./helpers/testDb";

const context = { publicUrl: (key: string) => `https://cdn.test/${key}` };

function input(overrides: Partial<PlaceInput> = {}): PlaceInput {
  return {
    ...emptyPlaceInput(),
    title: "Café Oops",
    type: "cafe",
    lat: 38.7223,
    lng: -9.1393,
    city: "Lisbon",
    countryCode: "pt",
    countryName: "Portugal",
    excerpt: "Very good coffee, very wrong turn.",
    ...overrides,
  };
}

async function insertPhoto(db: Database, key: string) {
  const [row] = await db
    .insert(photos)
    .values({ storageKey: key, width: 1200, height: 800, bytes: 1000 })
    .returning();
  return row!;
}

describe("places service (real PostgreSQL via PGlite)", () => {
  let db: Database;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  it("keeps drafts private and publishes on demand", async () => {
    const draft = await createPlace(db, input({ title: "Secret Draft", status: "draft" }));
    expect(draft.status).toBe("draft");

    expect(
      (await findPublishedPlaces(db, { includeDemo: true })).map((r) => r.place.slug),
    ).not.toContain(draft.slug);

    await updatePlace(
      db,
      draft.id,
      input({ title: "Secret Draft", slug: draft.slug, status: "published" }),
    );
    const published = await findPublishedPlaces(db, { includeDemo: true });
    expect(published.map((r) => r.place.slug)).toContain(draft.slug);
  });

  it("generates unique slugs and rejects a taken explicit slug", async () => {
    const a = await createPlace(db, input({ title: "Same Name" }));
    const b = await createPlace(db, input({ title: "Same Name" }));
    expect(a.slug).toBe("same-name");
    expect(b.slug).toBe("same-name-2");

    await expect(
      createPlace(db, input({ title: "Other", slug: "same-name" })),
    ).rejects.toMatchObject({
      code: "conflict",
    });
  });

  it("normalises the country code and stores coordinates precisely", async () => {
    const saved = await createPlace(
      db,
      input({ title: "Precise", lat: 38.722252, lng: -9.139337 }),
    );
    const record = await findPlaceById(db, saved.id);
    expect(record?.place.countryCode).toBe("PT");
    expect(record?.place.lat).toBeCloseTo(38.722252, 6);
    expect(record?.place.lng).toBeCloseTo(-9.139337, 6);
  });

  it("hides scheduled places until their publication time", async () => {
    const future = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const saved = await createPlace(
      db,
      input({ title: "Scheduled", status: "published", publishAt: future }),
    );
    const visible = await findPublishedPlaces(db, { includeDemo: true });
    expect(visible.map((r) => r.place.slug)).not.toContain(saved.slug);
    expect(
      resolvePublishedAt({ status: "published", publishAt: "" }, new Date(future), new Date()),
    ).not.toEqual(new Date(future));
  });

  it("rounds public coordinates and hides the address for approximate places", async () => {
    const saved = await createPlace(
      db,
      input({
        title: "Private Spot",
        status: "published",
        locationPrivacy: "approximate",
        lat: 38.713912,
        lng: -9.133412,
        formattedAddress: "Rua Secreta 12, Lisboa",
        placeName: "Secret flat",
      }),
    );
    const record = await findPublishedPlaceBySlug(db, saved.slug, { includeDemo: true });
    expect(record).not.toBeNull();

    const summary = toPlaceSummary(record!, context);
    expect(summary.approximate).toBe(true);
    expect(summary.lat).toBe(38.7);
    expect(summary.lng).toBe(-9.1);

    const detail = toPlaceDetail(record!, context);
    expect(detail.formattedAddress).toBeNull();
    expect(detail.placeName).toBeNull();
    // The owner still sees exact values in the editor.
    expect((await findPlaceById(db, saved.id))?.place.lat).toBeCloseTo(38.713912, 6);
  });

  it("attaches photos in order, sets the cover and returns removed photos to the library", async () => {
    const p1 = await insertPhoto(db, "photos/2026/11/aaa");
    const p2 = await insertPhoto(db, "photos/2026/11/bbb");
    const saved = await createPlace(
      db,
      input({
        title: "With Photos",
        status: "published",
        photos: [
          { id: p2.id, alt: "Second photo shown first", caption: "" },
          { id: p1.id, alt: "First photo shown second", caption: "A caption" },
        ],
        coverPhotoId: p1.id,
      }),
    );

    const detail = await findPublishedPlaceBySlug(db, saved.slug, { includeDemo: true });
    expect(detail!.photos.map((p) => p.id)).toEqual([p2.id, p1.id]);
    expect(detail!.cover?.id).toBe(p1.id);
    expect(toPlaceDetail(detail!, context).photos[0]?.url).toBe(
      "https://cdn.test/photos/2026/11/bbb-full.webp",
    );

    await updatePlace(
      db,
      saved.id,
      input({
        title: "With Photos",
        slug: saved.slug,
        status: "published",
        photos: [{ id: p2.id, alt: "Only one", caption: "" }],
      }),
    );
    const after = await findPlaceById(db, saved.id);
    expect(after!.photos.map((p) => p.id)).toEqual([p2.id]);
    expect(after!.cover?.id).toBe(p2.id); // cover falls back to the first photo
    const [orphan] = await db.select().from(photos);
    expect(orphan).toBeDefined();
  });

  it("refuses photos that belong to another place", async () => {
    const shared = await insertPhoto(db, "photos/2026/11/shared");
    await createPlace(
      db,
      input({ title: "Owner One", photos: [{ id: shared.id, alt: "mine", caption: "" }] }),
    );
    await expect(
      createPlace(
        db,
        input({ title: "Thief", photos: [{ id: shared.id, alt: "stolen", caption: "" }] }),
      ),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("soft-deletes and restores", async () => {
    const saved = await createPlace(db, input({ title: "Deletable", status: "published" }));
    await deletePlace(db, saved.id);
    expect(
      (await findPublishedPlaces(db, { includeDemo: true })).map((r) => r.place.slug),
    ).not.toContain(saved.slug);
    expect(
      (await listPlacesForAdmin(db, { includeDeleted: false })).map((r) => r.id),
    ).not.toContain(saved.id);
    expect((await listPlacesForAdmin(db, { includeDeleted: true })).map((r) => r.id)).toContain(
      saved.id,
    );

    await restorePlace(db, saved.id);
    expect(
      (await findPublishedPlaces(db, { includeDemo: true })).map((r) => r.place.slug),
    ).toContain(saved.slug);
  });

  it("replaces tags exactly", async () => {
    const saved = await createPlace(
      db,
      input({ title: "Tagged", tags: ["Coffee", "wrong turns"] }),
    );
    expect((await findPlaceById(db, saved.id))!.tags.sort()).toEqual(["Coffee", "wrong turns"]);
    await updatePlace(db, saved.id, input({ title: "Tagged", slug: saved.slug, tags: ["coffee"] }));
    expect((await findPlaceById(db, saved.id))!.tags).toEqual(["Coffee"]);
  });
});

describe("demo content", () => {
  it("seeds once, labels everything as demo, hides drafts, and purges cleanly", async () => {
    const demoDb = await createTestDatabase();
    expect(await seedDemoContent(demoDb)).toBe(true);
    expect(await seedDemoContent(demoDb)).toBe(false); // idempotent

    const visible = await findPublishedPlaces(demoDb, { includeDemo: true });
    expect(visible.length).toBeGreaterThanOrEqual(10);
    expect(visible.every((r) => r.place.isDemo)).toBe(true);
    expect(visible.map((r) => r.place.slug)).not.toContain("demo-draft-patagonia");

    // Demo content can be switched off without deleting it.
    expect(await findPublishedPlaces(demoDb, { includeDemo: false })).toHaveLength(0);

    const removed = await purgeDemoContent(demoDb);
    expect(removed.places).toBeGreaterThan(0);
    expect(await findPublishedPlaces(demoDb, { includeDemo: true })).toHaveLength(0);
    // Purging does not bring demo content back on the next boot.
    expect(await seedDemoContent(demoDb)).toBe(false);
  });
});

describe("place input validation", () => {
  it("requires alt text and a teaser to publish, but not to save a draft", () => {
    const photoId = crypto.randomUUID();
    const draft = placeInputSchema.safeParse(
      input({ excerpt: "", photos: [{ id: photoId, alt: "", caption: "" }] }),
    );
    expect(draft.success).toBe(true);

    const published = placeInputSchema.safeParse(
      input({ status: "published", excerpt: "", photos: [{ id: photoId, alt: "", caption: "" }] }),
    );
    expect(published.success).toBe(false);
    const paths = published.success
      ? []
      : published.error.issues.map((issue) => issue.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["excerpt", "photos.0.alt"]));
  });

  it("rejects a cover that is not one of the photos", () => {
    const result = placeInputSchema.safeParse(input({ coverPhotoId: crypto.randomUUID() }));
    expect(result.success).toBe(false);
  });
});
