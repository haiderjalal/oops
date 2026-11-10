import "server-only";

import { SignJWT, jwtVerify } from "jose";

import { getAuthConfig } from "@/lib/config";
import { ConfigError } from "@/lib/errors";

/**
 * Short-lived signed token authorising ONE upload of a known size and type to ONE key.
 * Used by the local development driver (the S3 driver uses native presigned URLs instead).
 */

export interface UploadTokenClaims {
  key: string;
  contentType: string;
  contentLength: number;
}

function secretKey(): Uint8Array {
  const { secret } = getAuthConfig();
  if (!secret) throw new ConfigError("AUTH_SECRET must be set before uploads can be signed.");
  return new TextEncoder().encode(secret);
}

export async function signUploadToken(
  claims: UploadTokenClaims,
  expiresInSeconds: number,
): Promise<string> {
  return new SignJWT({ k: claims.key, ct: claims.contentType, len: claims.contentLength })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("oops:upload")
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(secretKey());
}

export async function verifyUploadToken(token: string): Promise<UploadTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      audience: "oops:upload",
      algorithms: ["HS256"],
    });
    const { k, ct, len } = payload as { k?: unknown; ct?: unknown; len?: unknown };
    if (typeof k !== "string" || typeof ct !== "string" || typeof len !== "number") return null;
    return { key: k, contentType: ct, contentLength: len };
  } catch {
    return null;
  }
}
