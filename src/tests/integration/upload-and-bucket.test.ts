import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";

import { createBucketItem, updateBucketItem } from "@/features/bucket/service";
import { emptyBucketItemInput } from "@/features/bucket/schema";
import { findBucketItems } from "@/features/bucket/bucket.repository";
import { emptyPlaceInput } from "@/features/places/schema";
import { createPlace, updatePlace } from "@/features/places/service";
import { findPlaceById } from "@/features/places/places.repository";
import { createTrip } from "@/features/trips/service";
import { findPublishedTrips } from "@/features/trips/trips.repository";
import { finalizeUpload, removePhoto, requestUpload } from "@/features/uploads/service";
import type { Database } from "@/lib/db/client";
import type { StorageProvider } from "@/lib/storage/types";

import { createTestDatabase } from "./helpers/testDb";

/** In-memory storage double that records what the pipeline writes and deletes. */
function memoryStorage(): StorageProvider & { files: Map<string, Uint8Array> } {
  const files = new Map<string, Uint8Array>();
  return {
    driver: "local",
    files,
    publicUrl: (key) => `https://cdn.test/${key}`,
    createUploadTarget: async (input) => ({
      url: `https://upload.test/${input.key}`,
      method: "PUT",
      headers: { "Content-Type": input.contentType },
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }),
    getObject: async (key) => files.get(key) ?? null,
    putObject: async (key, body) => void files.set(key, body),
    deleteObject: async (key) => void files.delete(key),
  };
}

async function jpegWithGps(): Promise<Uint8Array> {
  return new Uint8Array(
    await sharp({ create: { width: 900, height: 600, channels: 3, background: "#c84" } })
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
      .toBuffer(),
  );
}

describe("photo upload pipeline", () => {
  let db: Database;
  beforeAll(async () => {
    db = await createTestDatabase();
  });

  it("signs, processes, strips metadata, deletes the original and attaches to a place", async () => {
    const storage = memoryStorage();
    const { uploadId, target } = await requestUpload(storage, db, {
      contentType: "image/jpeg",
      size: 1000,
    });
    expect(target.url).toContain(`incoming/${uploadId}`);

    // The browser "uploads" the original (with GPS) straight to storage.
    storage.files.set(`incoming/${uploadId}`, await jpegWithGps());

    const photo = await finalizeUpload(storage, db, uploadId, new Date("2026-11-03T00:00:00Z"));
    expect(photo.url).toBe(`https://cdn.test/photos/2026/11/${uploadId}-full.webp`);
    expect(photo.width).toBe(900);

    // Original is gone; only processed WebP variants remain.
    expect(storage.files.has(`incoming/${uploadId}`)).toBe(false);
    const stored = [...storage.files.keys()];
    expect(stored).toEqual(
      expect.arrayContaining([
        `photos/2026/11/${uploadId}-full.webp`,
        `photos/2026/11/${uploadId}-thumb.webp`,
      ]),
    );
    const full = storage.files.get(`photos/2026/11/${uploadId}-full.webp`)!;
    expect((await sharp(full).metadata()).exif).toBeUndefined();
    expect(Buffer.from(full).toString("latin1")).not.toContain("SecretCam");

    const saved = await createPlace(db, {
      ...emptyPlaceInput(),
      title: "With Upload",
      excerpt: "x",
      status: "published",
      photos: [{ id: photo.id, alt: "A test image", caption: "" }],
    });
    expect((await findPlaceById(db, saved.id))?.cover?.id).toBe(photo.id);

    // A photo that is on a place cannot be deleted out from under it.
    await expect(removePhoto(storage, db, photo.id)).rejects.toMatchObject({ code: "conflict" });
  });

  it("rejects an upload that never arrived and an upload that isn't an image — and cleans up", async () => {
    const storage = memoryStorage();
    await expect(finalizeUpload(storage, db, crypto.randomUUID())).rejects.toMatchObject({
      code: "not_found",
    });

    const id = crypto.randomUUID();
    storage.files.set(
      `incoming/${id}`,
      new TextEncoder().encode("<?php system($_GET['c']); ?> not an image at all"),
    );
    await expect(finalizeUpload(storage, db, id)).rejects.toMatchObject({ code: "validation" });
    expect(storage.files.has(`incoming/${id}`)).toBe(false); // never left lying around
    expect([...storage.files.keys()].filter((key) => key.startsWith("photos/"))).toHaveLength(0);
  });

  it("refuses oversized upload requests", async () => {
    await expect(
      requestUpload(memoryStorage(), db, { contentType: "image/png", size: 50 * 1024 * 1024 }),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("deletes unused photos from the database and storage", async () => {
    const storage = memoryStorage();
    const { uploadId } = await requestUpload(storage, db, {
      contentType: "image/jpeg",
      size: 1000,
    });
    storage.files.set(`incoming/${uploadId}`, await jpegWithGps());
    const photo = await finalizeUpload(storage, db, uploadId);

    await removePhoto(storage, db, photo.id);
    expect([...storage.files.keys()].filter((key) => key.includes(uploadId))).toHaveLength(0);
    await expect(removePhoto(storage, db, photo.id)).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("bucket list honesty", () => {
  let db: Database;
  beforeAll(async () => {
    db = await createTestDatabase();
  });

  const base = {
    ...emptyBucketItemInput(),
    placeName: "Petra",
    lat: 30.3285,
    lng: 35.4444,
    countryCode: "jo",
    countryName: "Jordan",
  };

  it("links a completed wish to a visit only when a published place exists", async () => {
    const draft = await createPlace(db, {
      ...emptyPlaceInput(),
      title: "Petra Visit",
      status: "draft",
    });
    const item = await createBucketItem(db, {
      ...base,
      status: "completed",
      linkedPlaceId: draft.id,
    });

    // A draft place doesn't count: no link is exposed publicly.
    let [record] = await findBucketItems(db, { includeDemo: true });
    expect(record?.item.status).toBe("completed");
    expect(record?.linkedPlace).toBeNull();

    await updatePlace(db, draft.id, {
      ...emptyPlaceInput(),
      title: "Petra Visit",
      slug: draft.slug,
      excerpt: "Done!",
      status: "published",
    });
    [record] = await findBucketItems(db, { includeDemo: true });
    expect(record?.linkedPlace).toEqual({ slug: draft.slug, title: "Petra Visit" });

    // A planned wish can never carry a link, whatever the form says.
    await updateBucketItem(db, item.id, { ...base, status: "planned", linkedPlaceId: draft.id });
    [record] = await findBucketItems(db, { includeDemo: true });
    expect(record?.item.linkedPlaceId).toBeNull();
    expect(record?.item.countryCode).toBe("JO");
  });

  it("rejects a link to a place that does not exist", async () => {
    await expect(
      createBucketItem(db, { ...base, status: "completed", linkedPlaceId: crypto.randomUUID() }),
    ).rejects.toMatchObject({ code: "validation" });
  });
});

describe("trips", () => {
  it("hides draft trips from the public and generates unique slugs", async () => {
    const db = await createTestDatabase();
    const input = {
      title: "Spring Trip",
      slug: "",
      startDate: "2024-03-01",
      endDate: "2024-03-10",
      description: "",
      status: "published" as const,
    };
    const a = await createTrip(db, input);
    const b = await createTrip(db, input);
    expect([a.slug, b.slug]).toEqual(["spring-trip", "spring-trip-2"]);
    await createTrip(db, { ...input, title: "Secret Trip", status: "draft" });

    const visible = await findPublishedTrips(db, { includeDemo: true });
    expect(visible.map((trip) => trip.title)).toEqual(["Spring Trip", "Spring Trip"]);
  });
});
