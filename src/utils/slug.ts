const MAX_SLUG_LENGTH = 80;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Turn any title into a URL-safe slug ("Café del Mar, Ibiza" → "cafe-del-mar-ibiza"). */
export function slugify(input: string, fallback = "untitled"): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");

  return slug || fallback;
}

/**
 * Returns `base`, or `base-2`, `base-3`… until `isTaken` says the candidate is free.
 * `isTaken` is async so it can ask the database.
 */
export async function uniqueSlug(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  if (!(await isTaken(base))) return base;

  for (let attempt = 2; attempt < 500; attempt += 1) {
    const candidate = `${base.slice(0, MAX_SLUG_LENGTH - String(attempt).length - 1)}-${attempt}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  // Practically unreachable; a random suffix keeps the function total.
  return `${base.slice(0, MAX_SLUG_LENGTH - 7)}-${Math.random().toString(36).slice(2, 8)}`;
}
