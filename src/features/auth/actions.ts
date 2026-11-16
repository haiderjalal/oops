"use server";

import { redirect } from "next/navigation";

import { getAuthConfig } from "@/lib/config";
import { clearSessionCookie, createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { getDummyHash, verifyPassword } from "@/lib/auth/password";
import { verifyTotp } from "@/lib/auth/totp";
import { logger } from "@/lib/logger";
import { getRateLimiter } from "@/lib/rate-limit";
import { getClientAddress } from "@/lib/request";
import { logSecurityEvent } from "@/lib/security-log";

import { loginSchema } from "./schema";

export interface LoginState {
  error?: string;
  /** Echoed back so the email field survives a failed attempt (React resets uncontrolled fields). */
  email?: string;
  /** True when this account needs a two-factor code, so the form can reveal that field. */
  needsCode?: boolean;
}

const GENERIC_FAILURE =
  "Those details didn't match. Check your email, password and code and try again.";

// Brakes on guessing: per client address and per email, across all instances' memory.
const perAddress = () => getRateLimiter("login:address", { limit: 8, windowMs: 15 * 60_000 });
const perEmail = () => getRateLimiter("login:email", { limit: 12, windowMs: 60 * 60_000 });

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const config = getAuthConfig();
  if (!config.configured) {
    logger.error("Owner sign-in attempted but auth is not configured", {
      problems: config.problems,
    });
    return { error: "Owner sign-in isn't set up yet. See the README (run `npm run setup:owner`)." };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    code: formData.get("code") ?? undefined,
  });
  const typedEmail =
    typeof formData.get("email") === "string" ? (formData.get("email") as string).trim() : "";
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? GENERIC_FAILURE, email: typedEmail };

  const address = await getClientAddress();
  const email = parsed.data.email.toLowerCase();
  const emailMatches = email === config.ownerEmail?.toLowerCase();

  const addressCheck = perAddress().check(address);
  // Only the owner's address is counted per email. Otherwise anyone could fill the counter with random
  // addresses and evict the owner's count. Other addresses are still limited per client address.
  const emailCheck = emailMatches ? perEmail().check(email) : { ok: true, retryAfterSeconds: 0 };
  if (!addressCheck.ok || !emailCheck.ok) {
    const wait = Math.max(addressCheck.retryAfterSeconds, emailCheck.retryAfterSeconds);
    logSecurityEvent("login.rate_limited", { address });
    return {
      error: `Too many attempts. Please wait ${Math.ceil(wait / 60)} minute(s) and try again.`,
      email: typedEmail,
    };
  }

  // Always do the expensive hash comparison, even for a wrong email, so timing leaks nothing.
  const passwordOk = await verifyPassword(
    parsed.data.password,
    emailMatches ? (config.passwordHash ?? "") : await getDummyHash(),
  );

  const mfaRequired = Boolean(config.totpSecret);
  let codeOk = true;
  if (mfaRequired) {
    codeOk =
      Boolean(parsed.data.code) &&
      (await verifyTotp(config.totpSecret as string, parsed.data.code ?? ""));
  }

  if (!emailMatches || !passwordOk || !codeOk) {
    logSecurityEvent("login.failed", { address });
    return { error: GENERIC_FAILURE, needsCode: mfaRequired, email: typedEmail };
  }

  await setSessionCookie(await createSessionToken(config.ownerEmail as string));
  logger.info("Owner signed in");
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/admin/login");
}
