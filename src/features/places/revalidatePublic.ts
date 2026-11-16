import "server-only";

import { revalidatePath, updateTag } from "next/cache";

import { CACHE_TAGS } from "./cacheTags";

/**
 * Expires cached public pages after owner content changes.
 *
 * Tag invalidation alone left statically rendered pages (such as the home page) showing removed
 * demo entries, so the root layout is revalidated too, which covers every page beneath it.
 */
export function invalidatePublicContent(): void {
  updateTag(CACHE_TAGS.places);
  updateTag(CACHE_TAGS.trips);
  updateTag(CACHE_TAGS.bucket);
  revalidatePath("/", "layout");
}
