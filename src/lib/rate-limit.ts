/**
 * Sliding-window rate limiting behind a small interface.
 *
 * The in-memory implementation is per server instance — fine for one owner on one instance, and a
 * good brake against casual abuse. On serverless platforms where requests hit many instances,
 * swap in a shared store (e.g. Upstash Redis) by implementing `RateLimiter`.
 */

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until another attempt is allowed (0 when `ok`). */
  retryAfterSeconds: number;
  remaining: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
}

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  /** Injectable clock for tests. */
  now?: () => number;
}

const MAX_TRACKED_KEYS = 5_000;

export function createMemoryRateLimiter({
  limit,
  windowMs,
  now = Date.now,
}: RateLimitOptions): RateLimiter {
  const hits = new Map<string, number[]>();

  return {
    check(key) {
      const current = now();
      const cutoff = current - windowMs;
      const recent = (hits.get(key) ?? []).filter((time) => time > cutoff);

      if (recent.length >= limit) {
        const oldest = recent[0] ?? current;
        hits.set(key, recent);
        return {
          ok: false,
          retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - current) / 1000)),
          remaining: 0,
        };
      }

      recent.push(current);
      hits.set(key, recent);

      // Bound memory: drop the oldest keys if an attacker sprays unique keys.
      if (hits.size > MAX_TRACKED_KEYS) {
        const first = hits.keys().next().value;
        if (first !== undefined) hits.delete(first);
      }
      return { ok: true, retryAfterSeconds: 0, remaining: limit - recent.length };
    },
  };
}

declare global {
  var __oopsLimiters: Map<string, RateLimiter> | undefined;
}

/** One limiter per name per process, surviving hot reloads. */
export function getRateLimiter(name: string, options: RateLimitOptions): RateLimiter {
  globalThis.__oopsLimiters ??= new Map();
  let limiter = globalThis.__oopsLimiters.get(name);
  if (!limiter) {
    limiter = createMemoryRateLimiter(options);
    globalThis.__oopsLimiters.set(name, limiter);
  }
  return limiter;
}
