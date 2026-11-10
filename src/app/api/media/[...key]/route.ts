import { NextResponse } from "next/server";

import { getStorageConfig } from "@/lib/config";
import { getStorage } from "@/lib/storage";
import { isSafeStorageKey } from "@/features/uploads/keys";

/**
 * Serves processed photos from the local storage driver (development only; production serves
 * them straight from the CDN/bucket). Only the `photos/` prefix is public — never `incoming/`
 * originals, which still carry their metadata.
 */
export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  if (getStorageConfig().driver !== "local") return new NextResponse(null, { status: 404 });

  const { key: segments } = await context.params;
  const key = segments.join("/");
  if (!key.startsWith("photos/") || !key.endsWith(".webp") || !isSafeStorageKey(key)) {
    return new NextResponse(null, { status: 404 });
  }

  const bytes = await getStorage().getObject(key);
  if (!bytes) return new NextResponse(null, { status: 404 });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
