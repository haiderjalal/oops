import "server-only";

import { headers } from "next/headers";

import { AppError } from "@/lib/errors";
import { logSecurityEvent } from "@/lib/security-log";

/**
 * The client address used for rate limiting. Each proxy appends to `x-forwarded-for`, so the LAST
 * entry is the one our platform's proxy saw. The first entry is written by the client and could be
 * forged on every request to get a fresh rate-limit bucket each time.
 */
export async function getClientAddress(): Promise<string> {
  const list = await headers();
  const forwarded = list
    .get("x-forwarded-for")
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .pop();
  return (forwarded || list.get("x-real-ip") || "unknown").slice(0, 64);
}

/**
 * CSRF defence for cookie-authenticated route handlers (Server Actions already check Origin).
 * Rejects requests whose Origin header is present and does not match this site's host.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return; // same-origin fetches from older browsers may omit it; SameSite=Lax still applies
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    logSecurityEvent("csrf.rejected", {
      reason: "unparseable_origin",
      origin: origin.slice(0, 200),
    });
    throw new AppError("unauthorized", "Cross-site requests are not allowed.", { status: 403 });
  }
  if (host && originHost !== host) {
    logSecurityEvent("csrf.rejected", {
      reason: "origin_mismatch",
      origin: origin.slice(0, 200),
      path: new URL(request.url).pathname,
    });
    throw new AppError("unauthorized", "Cross-site requests are not allowed.", { status: 403 });
  }
}
