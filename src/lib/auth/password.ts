import { randomBytes, scrypt, scryptSync, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * Password hashing with scrypt (memory-hard, built into Node: no native dependency).
 *
 * Stored format: `scrypt:N:r:p:<salt base64url>:<hash base64url>`. Colons (not `$`) are used because
 * `$` is interpolated by .env loaders.
 */

// OWASP's current minimum for scrypt is N = 2^17 (r = 8, p = 1). Every stored hash records its own
// parameters, so hashes created earlier with a lower N still verify; re-running `npm run setup:owner`
// stores a hash at the current cost.
const N = 2 ** 17;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const PREFIX = "scrypt";

function maxmemFor(n: number, r: number): number {
  return 256 * n * r;
}

/**
 * One scrypt hash at the current cost needs about 128 MiB. Only a few run at once, so a burst of
 * login attempts can't exhaust the server's memory or its crypto thread pool. Waiters are served in
 * order, and a finished hash hands its slot straight to the next waiter.
 */
const MAX_CONCURRENT_HASHES = 2;
let runningHashes = 0;
const hashWaiters: Array<() => void> = [];

async function withHashSlot<T>(work: () => Promise<T>): Promise<T> {
  if (runningHashes < MAX_CONCURRENT_HASHES) {
    runningHashes += 1;
  } else {
    await new Promise<void>((resolve) => hashWaiters.push(resolve));
  }
  try {
    return await work();
  } finally {
    const next = hashWaiters.shift();
    if (next) next();
    else runningHashes -= 1;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const hash = await withHashSlot(() =>
    scryptAsync(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: maxmemFor(N, R) }),
  );
  return [PREFIX, N, R, P, salt.toString("base64url"), hash.toString("base64url")].join(":");
}

/** Synchronous variant for config files and test setup, where top-level `await` isn't available. */
export function hashPasswordSync(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const hash = scryptSync(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: maxmemFor(N, R) });
  return [PREFIX, N, R, P, salt.toString("base64url"), hash.toString("base64url")].join(":");
}

export interface ParsedHash {
  n: number;
  r: number;
  p: number;
  salt: Buffer;
  hash: Buffer;
}

export function parseHash(stored: string): ParsedHash | null {
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== PREFIX) return null;
  const [, n, r, p, salt, hash] = parts as [string, string, string, string, string, string];
  const parsed = { n: Number(n), r: Number(r), p: Number(p) };
  if (![parsed.n, parsed.r, parsed.p].every((value) => Number.isInteger(value) && value > 0))
    return null;
  // Refuse absurd work factors that would let a tampered value exhaust memory.
  if (parsed.n > 2 ** 20 || parsed.r > 32 || parsed.p > 16) return null;
  return { ...parsed, salt: Buffer.from(salt, "base64url"), hash: Buffer.from(hash, "base64url") };
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parseHash(stored);
  if (!parsed) return false;
  const candidate = await withHashSlot(() =>
    scryptAsync(password, parsed.salt, parsed.hash.length, {
      N: parsed.n,
      r: parsed.r,
      p: parsed.p,
      maxmem: maxmemFor(parsed.n, parsed.r),
    }),
  );
  return candidate.length === parsed.hash.length && timingSafeEqual(candidate, parsed.hash);
}

/**
 * A valid hash of a random password, computed once. Verifying against it when the email is wrong
 * keeps response time the same, so timing can't reveal whether an email address is the owner's.
 */
let dummyHash: Promise<string> | undefined;
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
}
