import "server-only";

import { headers } from "next/headers";

import { AppError } from "@/lib/errors";

/** Best-effort client address for rate limiting. Behind a trusted proxy the first hop is the client. */
export async function getClientAddress(): Promise<string> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || list.get("x-real-ip") || "unknown";
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
    throw new AppError("unauthorized", "Cross-site requests are not allowed.", { status: 403 });
  }
  if (host && originHost !== host) {
    throw new AppError("unauthorized", "Cross-site requests are not allowed.", { status: 403 });
  }
}
