import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { generate } from "otplib";

import { hashPassword, parseHash, verifyPassword } from "@/lib/auth/password";
import { newTotpSecret, resetTotpReplayCacheForTests, verifyTotp } from "@/lib/auth/totp";
import { resetConfigForTests } from "@/lib/config";
import { createMemoryRateLimiter } from "@/lib/rate-limit";

// `next/headers` and `next/navigation` are only used by cookie helpers, not by token functions.
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const SECRET = "a-test-secret-that-is-at-least-32-characters-long";

describe("password hashing", () => {
  it("verifies the right password and rejects the wrong one", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("wrong password entirely", hash)).toBe(false);
  });

  it("salts every hash and never stores the password", async () => {
    const [a, b] = await Promise.all([
      hashPassword("same-password-123"),
      hashPassword("same-password-123"),
    ]);
    expect(a).not.toEqual(b);
    expect(a).not.toContain("same-password-123");
    expect(a.startsWith("scrypt:")).toBe(true);
    expect(a).not.toContain("$"); // safe inside .env files
  });

  it("rejects malformed or tampered hashes without throwing", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "bcrypt:1:2:3:4:5")).toBe(false);
    expect(parseHash("scrypt:99999999:8:1:aaaa:bbbb")).toBeNull(); // absurd work factor
    expect(parseHash("scrypt:abc:8:1:aaaa:bbbb")).toBeNull();
  });
});

describe("two-factor codes (TOTP)", () => {
  beforeEach(() => resetTotpReplayCacheForTests());

  it("accepts the current code once and rejects replays", async () => {
    const secret = newTotpSecret();
    const code = await generate({ secret });
    expect(await verifyTotp(secret, code)).toBe(true);
    expect(await verifyTotp(secret, code)).toBe(false); // a captured code cannot be reused
  });

  it("rejects wrong, malformed and empty codes", async () => {
    const secret = newTotpSecret();
    expect(await verifyTotp(secret, "000000")).toBe(false);
    expect(await verifyTotp(secret, "abc123")).toBe(false);
    expect(await verifyTotp(secret, "")).toBe(false);
  });

  it("tolerates spaces typed into the code", async () => {
    const secret = newTotpSecret();
    const code = await generate({ secret });
    expect(await verifyTotp(secret, `${code.slice(0, 3)} ${code.slice(3)}`)).toBe(true);
  });
});

describe("rate limiting", () => {
  it("blocks after the limit and recovers after the window", () => {
    let now = 0;
    const limiter = createMemoryRateLimiter({ limit: 3, windowMs: 1000, now: () => now });
    expect(limiter.check("a").ok).toBe(true);
    expect(limiter.check("a").ok).toBe(true);
    expect(limiter.check("a").ok).toBe(true);
    const blocked = limiter.check("a");
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(limiter.check("b").ok).toBe(true); // other keys are unaffected
    now = 1001;
    expect(limiter.check("a").ok).toBe(true);
  });
});

describe("owner sessions", () => {
  const original = { ...process.env };

  beforeEach(async () => {
    process.env.AUTH_SECRET = SECRET;
    process.env.OWNER_EMAIL = "owner@example.com";
    process.env.OWNER_PASSWORD_HASH = await hashPassword("a-long-enough-password");
    resetConfigForTests();
  });

  afterEach(() => {
    process.env = { ...original };
    resetConfigForTests();
  });

  it("accepts a token it issued", async () => {
    const { createSessionToken, verifySessionToken } = await import("@/lib/auth/session");
    const token = await createSessionToken("owner@example.com");
    expect(await verifySessionToken(token)).toEqual({ email: "owner@example.com" });
  });

  it("rejects tokens signed with another secret or expired", async () => {
    const { verifySessionToken } = await import("@/lib/auth/session");
    const forge = (secret: string, expires: string) =>
      new SignJWT({ sv: "x" })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject("owner@example.com")
        .setIssuer("oops:site")
        .setAudience("oops:owner")
        .setExpirationTime(expires)
        .sign(new TextEncoder().encode(secret));

    expect(
      await verifySessionToken(await forge("a-completely-different-secret-value-123456", "1h")),
    ).toBeNull();
    expect(await verifySessionToken(await forge(SECRET, "-1h"))).toBeNull();
    expect(await verifySessionToken("not.a.token")).toBeNull();
  });

  it("invalidates every session when the password changes", async () => {
    const { createSessionToken, verifySessionToken } = await import("@/lib/auth/session");
    const token = await createSessionToken("owner@example.com");
    process.env.OWNER_PASSWORD_HASH = await hashPassword("a-brand-new-password-456");
    resetConfigForTests();
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("invalidates sessions when the owner email changes", async () => {
    const { createSessionToken, verifySessionToken } = await import("@/lib/auth/session");
    const token = await createSessionToken("owner@example.com");
    process.env.OWNER_EMAIL = "someone-else@example.com";
    resetConfigForTests();
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("refuses everything when auth is not configured", async () => {
    const { verifySessionToken, createSessionToken } = await import("@/lib/auth/session");
    const token = await createSessionToken("owner@example.com");
    delete process.env.AUTH_SECRET;
    resetConfigForTests();
    expect(await verifySessionToken(token)).toBeNull();
  });
});
