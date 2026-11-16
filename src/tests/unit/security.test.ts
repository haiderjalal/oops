import { randomBytes, scryptSync } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => undefined, set: vi.fn(), delete: vi.fn() })),
  headers: vi.fn(async () => new Headers()),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { headers as requestHeaders } from "next/headers";

import { runOwnerAction } from "@/lib/actions";
import { hashPassword, parseHash, verifyPassword } from "@/lib/auth/password";
import { databaseSsl } from "@/lib/db/ssl";
import { checkEnvironment } from "@/lib/env-check";
import { AppError } from "@/lib/errors";
import { assertSameOrigin, getClientAddress } from "@/lib/request";
import { contentSecurityPolicy, securityHeaders } from "@/lib/security-headers";
import { signRequestSchema } from "@/features/uploads/validation";
import { z } from "zod";

function headerValue(headers: { key: string; value: string }[], key: string): string | undefined {
  return headers.find((header) => header.key === key)?.value;
}

describe("database connections use TLS unless they are on this machine", () => {
  it("keeps plain connections only for local databases", () => {
    expect(databaseSsl("postgresql://u:p@localhost:5432/db")).toBe(false);
    expect(databaseSsl("postgres://u:p@127.0.0.1/db")).toBe(false);
    expect(databaseSsl("postgres://u:p@[::1]:5432/db")).toBe(false);
  });

  it("requires TLS for hosted databases", () => {
    expect(databaseSsl("postgresql://u:p@db.example.supabase.co:5432/postgres")).toBe("require");
    expect(databaseSsl("postgresql://u:p@aws-0-eu-west-2.pooler.supabase.com:6543/postgres")).toBe(
      "require",
    );
  });

  it("treats a URL it cannot parse as remote", () => {
    expect(databaseSsl("not a url")).toBe("require");
  });
});

describe("security headers", () => {
  const origins = ["https://api.maptiler.com", "https://cdn.example.com"];

  it("sends HSTS only in production (browsers ignore it over plain HTTP anyway)", () => {
    const production = securityHeaders({ isProduction: true, origins });
    const development = securityHeaders({ isProduction: false, origins });
    expect(headerValue(production, "Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains",
    );
    expect(headerValue(development, "Strict-Transport-Security")).toBeUndefined();
  });

  it("always sends anti-sniffing, anti-framing and referrer controls", () => {
    const headers = securityHeaders({ isProduction: true, origins });
    expect(headerValue(headers, "X-Content-Type-Options")).toBe("nosniff");
    expect(headerValue(headers, "X-Frame-Options")).toBe("DENY");
    expect(headerValue(headers, "Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headerValue(headers, "X-Permitted-Cross-Domain-Policies")).toBe("none");
  });

  it("uses a strict production CSP without eval and forces HTTPS for subresources", () => {
    const csp = contentSecurityPolicy({ isProduction: true, origins });
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("allows eval only in development, where the dev tooling needs it", () => {
    const csp = contentSecurityPolicy({ isProduction: false, origins });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("allows external content only from the configured origins", () => {
    const csp = contentSecurityPolicy({ isProduction: true, origins });
    expect(csp).toContain(
      "img-src 'self' data: blob: https://api.maptiler.com https://cdn.example.com",
    );
    expect(csp).toContain(
      "connect-src 'self' blob: https://api.maptiler.com https://cdn.example.com",
    );
    expect(csp).not.toContain("evil.example");
  });
});

describe("environment checks", () => {
  const good = {
    NODE_ENV: "production",
    SITE_URL: "https://oops.example.com",
    AUTH_SECRET: "x".repeat(48),
    OWNER_EMAIL: "owner@example.com",
    OWNER_PASSWORD_HASH: "scrypt:131072:8:1:c2FsdA:aGFzaA",
    OWNER_TOTP_SECRET: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
    DATABASE_URL: "postgresql://u:p@db.example.supabase.co:5432/postgres",
    STORAGE_DRIVER: "s3",
    S3_REGION: "auto",
    S3_BUCKET: "photos",
    S3_ACCESS_KEY_ID: "id",
    S3_SECRET_ACCESS_KEY: "secret",
    S3_PUBLIC_BASE_URL: "https://cdn.example.com",
    MAPTILER_PUBLIC_KEY: "public-key",
    MAPTILER_GEOCODING_KEY: "server-key",
  };

  it("passes a complete production configuration", () => {
    expect(checkEnvironment(good).filter((issue) => issue.level === "error")).toEqual([]);
  });

  it("names the missing production settings", () => {
    const names = checkEnvironment({}).map((issue) => issue.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "AUTH_SECRET",
        "OWNER_EMAIL",
        "OWNER_PASSWORD_HASH",
        "OWNER_TOTP_SECRET",
        "DATABASE_URL",
        "STORAGE_DRIVER",
        "SITE_URL",
      ]),
    );
  });

  it("refuses a secret that the browser would receive", () => {
    const issues = checkEnvironment({ ...good, NEXT_PUBLIC_AUTH_SECRET: "leak" });
    expect(issues).toContainEqual(
      expect.objectContaining({ level: "error", name: "NEXT_PUBLIC_AUTH_SECRET" }),
    );
  });

  it("flags weak or local settings that would not work on a hosted site", () => {
    expect(checkEnvironment({ ...good, AUTH_SECRET: "short" })).toContainEqual(
      expect.objectContaining({ level: "error", name: "AUTH_SECRET" }),
    );
    expect(checkEnvironment({ ...good, ALLOW_LOCAL_SERVICES: "true" })).toContainEqual(
      expect.objectContaining({ level: "error", name: "ALLOW_LOCAL_SERVICES" }),
    );
    expect(
      checkEnvironment({ ...good, DATABASE_URL: "postgresql://u:p@localhost:5432/db" }),
    ).toContainEqual(expect.objectContaining({ level: "error", name: "DATABASE_URL" }));
    expect(
      checkEnvironment({ ...good, S3_PUBLIC_BASE_URL: "http://cdn.example.com" }),
    ).toContainEqual(expect.objectContaining({ level: "error", name: "S3_PUBLIC_BASE_URL" }));
    expect(checkEnvironment({ ...good, SITE_URL: "http://oops.example.com" })).toContainEqual(
      expect.objectContaining({ level: "error", name: "SITE_URL" }),
    );
  });

  it("warns about an old password hash and about reusing one key for two jobs", () => {
    const issues = checkEnvironment({
      ...good,
      OWNER_PASSWORD_HASH: "scrypt:32768:8:1:c2FsdA:aGFzaA",
      MAPTILER_GEOCODING_KEY: "public-key",
    });
    expect(issues).toContainEqual(
      expect.objectContaining({ level: "warn", name: "OWNER_PASSWORD_HASH" }),
    );
    expect(issues).toContainEqual(
      expect.objectContaining({ level: "warn", name: "MAPTILER_GEOCODING_KEY" }),
    );
  });

  it("never echoes a value into its messages", () => {
    const secret = "short-secret-value-that-must-not-print";
    const text = JSON.stringify(
      checkEnvironment({
        ...good,
        AUTH_SECRET: secret,
        DATABASE_URL: "postgresql://u:hunter2@localhost/db",
      }),
    );
    expect(text).not.toContain(secret);
    expect(text).not.toContain("hunter2");
  });
});

describe("client address for rate limiting", () => {
  it("uses the last proxy hop, which a client cannot forge", async () => {
    vi.mocked(requestHeaders).mockResolvedValueOnce(
      new Headers({ "x-forwarded-for": "203.0.113.9, 198.51.100.7" }),
    );
    expect(await getClientAddress()).toBe("198.51.100.7");
  });

  it("falls back to x-real-ip, then to a fixed placeholder, and caps the length", async () => {
    vi.mocked(requestHeaders).mockResolvedValueOnce(new Headers({ "x-real-ip": "192.0.2.4" }));
    expect(await getClientAddress()).toBe("192.0.2.4");
    vi.mocked(requestHeaders).mockResolvedValueOnce(new Headers());
    expect(await getClientAddress()).toBe("unknown");
    vi.mocked(requestHeaders).mockResolvedValueOnce(
      new Headers({ "x-forwarded-for": "x".repeat(200) }),
    );
    expect((await getClientAddress()).length).toBe(64);
  });
});

describe("password hashing", () => {
  it("runs many concurrent hashes without losing any, and every one verifies", async () => {
    const hashes = await Promise.all(
      Array.from({ length: 5 }, (_, i) => hashPassword(`parallel-password-${i}`)),
    );
    const results = await Promise.all(
      hashes.map((hash, i) => verifyPassword(`parallel-password-${i}`, hash)),
    );
    expect(results.every(Boolean)).toBe(true);
  }, 60_000);

  it("creates hashes at the current cost", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(parseHash(hash)?.n).toBe(2 ** 17);
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("wrong password entirely", hash)).toBe(false);
  });

  it("still verifies hashes created with the older, lower cost", async () => {
    const salt = randomBytes(16);
    const digest = scryptSync("legacy-password-123", salt, 64, {
      N: 2 ** 15,
      r: 8,
      p: 1,
      maxmem: 256 * 2 ** 15 * 8,
    });
    const legacy = [
      "scrypt",
      2 ** 15,
      8,
      1,
      salt.toString("base64url"),
      digest.toString("base64url"),
    ].join(":");
    expect(await verifyPassword("legacy-password-123", legacy)).toBe(true);
    expect(await verifyPassword("not-the-password", legacy)).toBe(false);
  });
});

describe("upload restrictions", () => {
  it("accepts only the image types the pipeline can verify", () => {
    expect(signRequestSchema.safeParse({ contentType: "image/jpeg", size: 1000 }).success).toBe(
      true,
    );
    expect(signRequestSchema.safeParse({ contentType: "image/webp", size: 1000 }).success).toBe(
      true,
    );
  });

  it.each(["image/svg+xml", "text/html", "application/javascript", "application/pdf", "image/gif"])(
    "refuses %s, which can carry scripts or is not allowed",
    (contentType) => {
      expect(signRequestSchema.safeParse({ contentType, size: 1000 }).success).toBe(false);
    },
  );

  it("refuses empty files and files over the size limit", () => {
    expect(signRequestSchema.safeParse({ contentType: "image/png", size: 0 }).success).toBe(false);
    expect(
      signRequestSchema.safeParse({ contentType: "image/png", size: 16 * 1024 * 1024 }).success,
    ).toBe(false);
  });
});

describe("cross-site request protection", () => {
  // Only `url` and `headers` are read by assertSameOrigin, so a minimal stand-in keeps the test
  // independent of the runtime's rules about which headers a Request may carry.
  const request = (origin: string | null, host = "oops.example.com") =>
    ({
      url: `https://${host}/api/geocode?q=lisbon`,
      headers: new Headers({ host, ...(origin ? { origin } : {}) }),
    }) as unknown as Request;

  it("allows requests without an Origin header (same-site navigations)", () => {
    expect(() => assertSameOrigin(request(null))).not.toThrow();
  });

  it("allows requests from this site", () => {
    expect(() => assertSameOrigin(request("https://oops.example.com"))).not.toThrow();
  });

  it("refuses requests from another site with a 403", () => {
    try {
      assertSameOrigin(request("https://evil.example"));
      expect.unreachable("a cross-site request must be refused");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).status).toBe(403);
    }
  });

  it("refuses an Origin it cannot parse", () => {
    expect(() => assertSameOrigin(request("%%not-an-origin%%"))).toThrow(AppError);
  });
});

describe("owner-only actions refuse visitors", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a refusal and never runs the handler without a session", async () => {
    const handler = vi.fn(async () => "should not run");
    const result = await runOwnerAction({
      name: "testAction",
      schema: z.object({ id: z.string() }),
      input: { id: "x" },
      handler,
    });
    expect(result.ok).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });
});
