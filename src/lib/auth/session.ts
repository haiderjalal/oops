import "server-only";

import { createHash } from "node:crypto";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAuthConfig, getSiteConfig } from "@/lib/config";
import { ConfigError, UnauthorizedError } from "@/lib/errors";

/**
 * Owner sessions: an HS256-signed JWT in an HttpOnly, SameSite=Lax cookie.
 *
 * The token carries a "session version" derived from the stored password hash, so changing the
 * owner's password instantly invalidates every existing session. Every mutation re-checks the
 * session on the server via `assertOwner()` — hiding the admin UI is never the protection.
 */

const ISSUER = "oops:site";
const AUDIENCE = "oops:owner";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export interface OwnerSession {
  email: string;
}

function cookieName(): string {
  // The __Host- prefix pins the cookie to this exact host over HTTPS. It requires `Secure`, which
  // plain-http localhost can't use, so development uses an unprefixed name.
  return getSiteConfig().isProduction ? "__Host-oops_session" : "oops_session";
}

function secretKey(): Uint8Array {
  const { secret } = getAuthConfig();
  if (!secret) throw new ConfigError("AUTH_SECRET is not configured.");
  return new TextEncoder().encode(secret);
}

function sessionVersion(): string {
  const { passwordHash } = getAuthConfig();
  return createHash("sha256")
    .update(passwordHash ?? "")
    .digest("hex")
    .slice(0, 16);
}

export async function createSessionToken(email: string): Promise<string> {
  return new SignJWT({ sv: sessionVersion() })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<OwnerSession | null> {
  const config = getAuthConfig();
  if (!config.configured) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });
    if (payload.sv !== sessionVersion()) return null;
    if (typeof payload.sub !== "string") return null;
    // The email must still be the configured owner (it may have been changed since sign-in).
    if (payload.sub.toLowerCase() !== config.ownerEmail?.toLowerCase()) return null;
    return { email: payload.sub };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(cookieName(), token, {
    httpOnly: true,
    secure: getSiteConfig().isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  // Expire the cookie with the *same attributes* it was set with. A `__Host-` cookie can only be
  // modified by a response that also says `Secure; Path=/`, so a bare `cookies().delete()` would be
  // silently ignored by the browser in production and the session would survive "sign out".
  (await cookies()).set(cookieName(), "", {
    httpOnly: true,
    secure: getSiteConfig().isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

/** The signed-in owner, or null. Safe to call anywhere on the server. */
export async function getOwnerSession(): Promise<OwnerSession | null> {
  const token = (await cookies()).get(cookieName())?.value;
  return token ? verifySessionToken(token) : null;
}

/** For pages and layouts: send visitors to the sign-in page. */
export async function requireOwner(): Promise<OwnerSession> {
  const session = await getOwnerSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** For server actions and route handlers: throw so nothing after it runs. */
export async function assertOwner(): Promise<OwnerSession> {
  const session = await getOwnerSession();
  if (!session) throw new UnauthorizedError();
  return session;
}
