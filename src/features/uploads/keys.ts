/**
 * Storage key conventions. The database stores one base key per photo; every processed
 * variant is derived from it, so a photo is always exactly one row.
 *
 *   photos/2026/11/3f2a…        ← storageKey (base)
 *   photos/2026/11/3f2a…-full.webp
 *   photos/2026/11/3f2a…-thumb.webp
 *
 * Originals are uploaded under `incoming/` and deleted once processed.
 */

export type PhotoVariant = "full" | "thumb";

export function variantKey(storageKey: string, variant: PhotoVariant): string {
  return `${storageKey}-${variant}.webp`;
}

export function incomingKey(id: string): string {
  return `incoming/${id}`;
}

export function photoBaseKey(id: string, date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `photos/${year}/${month}/${id}`;
}

/** Keys are produced by the server, but anything arriving from a URL or token is re-validated. */
const SAFE_KEY = /^(incoming|photos)\/[A-Za-z0-9/_.-]+$/;

export function isSafeStorageKey(key: string): boolean {
  return SAFE_KEY.test(key) && !key.includes("..") && !key.includes("//");
}
