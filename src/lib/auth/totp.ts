import { createHash } from "node:crypto";

import { generateSecret, generateURI, verify } from "otplib";

/**
 * Two-factor sign-in with TOTP (RFC 6238), compatible with Google Authenticator, 1Password, Authy…
 * Each code can be used once: after a successful verification, the matched time step is
 * remembered so a captured code can't be replayed inside its validity window.
 */

const TOLERANCE_SECONDS = 30; // accept the previous/next 30 s window for clock drift

declare global {
  var __oopsTotpLastStep: Map<string, number> | undefined;
}

function lastSteps(): Map<string, number> {
  globalThis.__oopsTotpLastStep ??= new Map();
  return globalThis.__oopsTotpLastStep;
}

function secretId(secret: string): string {
  return createHash("sha256").update(secret).digest("hex").slice(0, 16);
}

export function newTotpSecret(): string {
  return generateSecret();
}

export function totpUri(options: { secret: string; account: string; issuer?: string }): string {
  return generateURI({
    issuer: options.issuer ?? "Oops, I Traveled Again!",
    label: options.account,
    secret: options.secret,
  });
}

/** True when `code` is the current (or an adjacent) code and hasn't been used before. */
export async function verifyTotp(secret: string, code: string): Promise<boolean> {
  const token = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(token)) return false;

  const id = secretId(secret);
  const afterTimeStep = lastSteps().get(id);

  const result = await verify({
    secret,
    token,
    epochTolerance: TOLERANCE_SECONDS,
    ...(afterTimeStep === undefined ? {} : { afterTimeStep }),
  });

  if (!result.valid) return false;
  // The result type is a union with HOTP; TOTP results always carry the matched time step.
  if ("timeStep" in result) lastSteps().set(id, result.timeStep);
  return true;
}

/** Test helper: forget remembered time steps. */
export function resetTotpReplayCacheForTests(): void {
  lastSteps().clear();
}
