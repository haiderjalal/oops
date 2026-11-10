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

const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const PREFIX = "scrypt";

function maxmemFor(n: number, r: number): number {
  return 256 * n * r;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const hash = await scryptAsync(password, salt, KEY_LENGTH, {
    N,
    r: R,
    p: P,
    maxmem: maxmemFor(N, R),
  });
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
  const candidate = await scryptAsync(password, parsed.salt, parsed.hash.length, {
    N: parsed.n,
    r: parsed.r,
    p: parsed.p,
    maxmem: maxmemFor(parsed.n, parsed.r),
  });
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
