/** Driver-agnostic helpers for recognising PostgreSQL error classes (Drizzle wraps driver errors in `cause`). */

function postgresCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

export function isUniqueViolation(error: unknown): boolean {
  return postgresCode(error) === "23505";
}

export function isForeignKeyViolation(error: unknown): boolean {
  return postgresCode(error) === "23503";
}

export function isCheckViolation(error: unknown): boolean {
  return postgresCode(error) === "23514";
}
