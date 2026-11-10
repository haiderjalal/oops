import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { resetConfigForTests } from "@/lib/config";
import { createLocalStorage } from "@/lib/storage/local";
import { createS3Storage } from "@/lib/storage/s3";
import { signUploadToken, verifyUploadToken } from "@/lib/storage/uploadToken";
import { isSafeStorageKey, photoBaseKey, variantKey } from "@/features/uploads/keys";
import { processImage } from "@/features/uploads/process";
import { detectImageType } from "@/features/uploads/validation";

async function jpegWithGps(width = 1600, height = 1000): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 200, g: 80, b: 60 } } })
    .jpeg()
    .withExif({
      IFD0: { Copyright: "Secret Owner", Make: "SecretCam" },
      IFD3: {
        GPSLatitudeRef: "N",
        GPSLatitude: "38/1 43/1 20/1",
        GPSLongitudeRef: "W",
        GPSLongitude: "9/1 8/1 21/1",
      },
    })
    .toBuffer();
}

describe("image type detection (by bytes, not by name)", () => {
  it("recognises real images", async () => {
    expect(detectImageType(await jpegWithGps(20, 20))).toBe("image/jpeg");
    expect(
      detectImageType(
        await sharp({ create: { width: 8, height: 8, channels: 3, background: "#fff" } })
          .png()
          .toBuffer(),
      ),
    ).toBe("image/png");
    expect(
      detectImageType(
        await sharp({ create: { width: 8, height: 8, channels: 3, background: "#fff" } })
          .webp()
          .toBuffer(),
      ),
    ).toBe("image/webp");
  });

  it("rejects scripts, HTML and truncated data pretending to be images", () => {
    expect(
      detectImageType(new TextEncoder().encode("<script>alert(1)</script>............")),
    ).toBeNull();
    expect(
      detectImageType(new TextEncoder().encode("GIF89a...........................".padEnd(40))),
    ).toBeNull();
    expect(detectImageType(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});

describe("image processing (privacy)", () => {
  it("strips EXIF — including GPS position — from every output", async () => {
    const original = await jpegWithGps();
    // Sanity: the input really does carry metadata, so the test can fail.
    expect((await sharp(original).metadata()).exif).toBeDefined();

    const processed = await processImage(original);
    for (const output of [processed.full, processed.thumb]) {
      const meta = await sharp(output).metadata();
      expect(meta.exif).toBeUndefined();
      expect(meta.format).toBe("webp");
      expect(output.toString("latin1")).not.toContain("SecretCam");
      expect(output.toString("latin1")).not.toContain("Secret Owner");
    }
  });

  it("bakes in the orientation so portraits are not left sideways", async () => {
    const rotated = await sharp({
      create: { width: 400, height: 200, channels: 3, background: "#123" },
    })
      .jpeg()
      .withMetadata({ orientation: 6 }) // "rotate 90° to display" (withExif silently drops this tag)
      .toBuffer();
    // Guard: the fixture really is tagged, so the assertion below can fail.
    expect((await sharp(rotated).metadata()).orientation).toBe(6);
    const processed = await processImage(rotated);
    expect(processed.width).toBe(200);
    expect(processed.height).toBe(400);
  });

  it("downsizes large images, makes a thumbnail and a tiny blur placeholder", async () => {
    const processed = await processImage(await jpegWithGps(4000, 3000));
    expect(Math.max(processed.width, processed.height)).toBe(2400);
    expect((await sharp(processed.thumb).metadata()).width).toBe(640);
    expect(processed.blurDataUrl.startsWith("data:image/webp;base64,")).toBe(true);
    expect(processed.blurDataUrl.length).toBeLessThan(1500);
  });

  it("never enlarges small images", async () => {
    const processed = await processImage(await jpegWithGps(300, 200));
    expect(processed.width).toBe(300);
  });

  it("rejects non-images and corrupt images with a friendly error", async () => {
    await expect(
      processImage(new TextEncoder().encode("hello world, definitely not an image")),
    ).rejects.toMatchObject({ code: "validation" });
    const truncated = (await jpegWithGps()).subarray(0, 400);
    await expect(processImage(truncated)).rejects.toMatchObject({ code: "validation" });
  });
});

describe("storage keys", () => {
  it("builds predictable keys", () => {
    const base = photoBaseKey("abc", new Date("2026-11-03T00:00:00Z"));
    expect(base).toBe("photos/2026/11/abc");
    expect(variantKey(base, "thumb")).toBe("photos/2026/11/abc-thumb.webp");
  });

  it("rejects path traversal and foreign prefixes", () => {
    expect(isSafeStorageKey("photos/2026/11/abc-full.webp")).toBe(true);
    expect(isSafeStorageKey("incoming/abc")).toBe(true);
    expect(isSafeStorageKey("../etc/passwd")).toBe(false);
    expect(isSafeStorageKey("photos/../../secret")).toBe(false);
    expect(isSafeStorageKey("photos//double")).toBe(false);
    expect(isSafeStorageKey("other/abc")).toBe(false);
  });
});

describe("local storage driver", () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "oops-storage-"));
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("round-trips objects and reports missing ones as null", async () => {
    const storage = createLocalStorage(dir);
    await storage.putObject("photos/2026/11/x-full.webp", new Uint8Array([1, 2, 3]), "image/webp");
    expect(Array.from((await storage.getObject("photos/2026/11/x-full.webp")) ?? [])).toEqual([
      1, 2, 3,
    ]);
    await storage.deleteObject("photos/2026/11/x-full.webp");
    expect(await storage.getObject("photos/2026/11/x-full.webp")).toBeNull();
    expect(storage.publicUrl("photos/a-full.webp")).toBe("/api/media/photos/a-full.webp");
  });

  it("refuses keys that would escape the storage folder", async () => {
    const storage = createLocalStorage(dir);
    await expect(storage.getObject("photos/../../outside")).rejects.toThrow();
    await expect(
      storage.putObject("../outside", new Uint8Array([1]), "image/webp"),
    ).rejects.toThrow();
  });
});

describe("signed upload tokens", () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = "an-upload-signing-secret-of-sufficient-length";
    resetConfigForTests();
  });

  it("round-trips claims and rejects tampering and expiry", async () => {
    const token = await signUploadToken(
      { key: "incoming/abc", contentType: "image/png", contentLength: 1234 },
      60,
    );
    expect(await verifyUploadToken(token)).toEqual({
      key: "incoming/abc",
      contentType: "image/png",
      contentLength: 1234,
    });
    expect(await verifyUploadToken(`${token}x`)).toBeNull();
    expect(await verifyUploadToken("garbage")).toBeNull();
    const expired = await signUploadToken(
      { key: "incoming/abc", contentType: "image/png", contentLength: 1 },
      -10,
    );
    expect(await verifyUploadToken(expired)).toBeNull();
  });
});

describe("S3-compatible storage", () => {
  const storage = createS3Storage({
    driver: "s3",
    endpoint: "https://example-account.r2.cloudflarestorage.com",
    region: "auto",
    bucket: "photos",
    accessKeyId: "AKIATESTTESTTESTTEST",
    secretAccessKey: "test-secret-test-secret-test-secret-00",
    publicBaseUrl: "https://cdn.example.com",
    forcePathStyle: true,
  });

  it("builds public CDN URLs", () => {
    expect(storage.publicUrl("photos/a-full.webp")).toBe(
      "https://cdn.example.com/photos/a-full.webp",
    );
  });

  it("signs short-lived upload URLs bound to the key, type and length", async () => {
    const target = await storage.createUploadTarget({
      key: "incoming/abc",
      contentType: "image/jpeg",
      contentLength: 2048,
      expiresInSeconds: 300,
    });
    const url = new URL(target.url);
    expect(url.pathname).toContain("incoming/abc");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("300");
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
    expect(url.searchParams.get("X-Amz-SignedHeaders")).toContain("content-type");
    expect(target.method).toBe("PUT");
    expect(target.headers["Content-Type"]).toBe("image/jpeg");
    // The secret never appears in the URL.
    expect(target.url).not.toContain("test-secret");
  });

  it("refuses unsafe keys", async () => {
    await expect(
      storage.createUploadTarget({
        key: "../evil",
        contentType: "image/png",
        contentLength: 1,
        expiresInSeconds: 60,
      }),
    ).rejects.toThrow();
  });
});
