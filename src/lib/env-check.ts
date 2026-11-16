/**
 * Production-readiness checks for environment variables. Pure: no imports and no I/O, so it can be
 * unit-tested and run from scripts/check-env.ts. Reports names and problems only, never values.
 */

export type EnvIssueLevel = "error" | "warn";

export interface EnvIssue {
  level: EnvIssueLevel;
  /** The variable the message is about. */
  name: string;
  message: string;
}

type Env = Readonly<Record<string, string | undefined>>;

/** Name fragments that mark a variable as a secret. Such a variable must never be NEXT_PUBLIC_. */
const SECRET_NAME = /SECRET|PASSWORD|PRIVATE|SERVICE_ROLE|GEOCODING|ACCESS_KEY|DATABASE|AUTH_/i;
const MIN_AUTH_SECRET_LENGTH = 32;
/** Work factor OWASP recommends for scrypt. Older hashes still verify but should be re-created. */
const CURRENT_SCRYPT_N = 2 ** 17;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function read(env: Env, name: string): string | undefined {
  const value = env[name]?.trim();
  return value ? value : undefined;
}

function isHttps(value: string): boolean {
  return value.startsWith("https://");
}

function hostOf(value: string): string | null {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

export function checkEnvironment(env: Env): EnvIssue[] {
  const issues: EnvIssue[] = [];
  const add = (level: EnvIssueLevel, name: string, message: string) =>
    issues.push({ level, name, message });

  // Anything prefixed NEXT_PUBLIC_ is bundled into JavaScript that every visitor downloads.
  for (const name of Object.keys(env)) {
    if (name.startsWith("NEXT_PUBLIC_") && SECRET_NAME.test(name)) {
      add(
        "error",
        name,
        "Looks like a secret, but NEXT_PUBLIC_ puts it in the browser. Remove the prefix.",
      );
    }
  }

  // Owner sign-in.
  const authSecret = read(env, "AUTH_SECRET");
  if (!authSecret) add("error", "AUTH_SECRET", "Missing. It signs owner sessions.");
  else if (authSecret.length < MIN_AUTH_SECRET_LENGTH)
    add("error", "AUTH_SECRET", `Must be at least ${MIN_AUTH_SECRET_LENGTH} characters.`);

  if (!read(env, "OWNER_EMAIL")) add("error", "OWNER_EMAIL", "Missing. Run npm run setup:owner.");

  const hash = read(env, "OWNER_PASSWORD_HASH");
  if (!hash) {
    add("error", "OWNER_PASSWORD_HASH", "Missing. Run npm run setup:owner.");
  } else {
    const parts = hash.split(":");
    if (parts.length !== 6 || parts[0] !== "scrypt") {
      add(
        "error",
        "OWNER_PASSWORD_HASH",
        "Not in the expected scrypt format. Run npm run setup:owner.",
      );
    } else if (Number(parts[1]) < CURRENT_SCRYPT_N) {
      add(
        "warn",
        "OWNER_PASSWORD_HASH",
        "Created with a lower scrypt cost. Re-run npm run setup:owner to upgrade it.",
      );
    }
  }

  const allowPasswordOnly = read(env, "AUTH_ALLOW_PASSWORD_ONLY") === "true";
  if (!read(env, "OWNER_TOTP_SECRET")) {
    if (allowPasswordOnly)
      add(
        "warn",
        "OWNER_TOTP_SECRET",
        "Missing, and two-factor is waived. Turn it on for production.",
      );
    else
      add("error", "OWNER_TOTP_SECRET", "Missing. Two-factor sign-in is required in production.");
  }
  if (allowPasswordOnly) add("warn", "AUTH_ALLOW_PASSWORD_ONLY", "Two-factor is switched off.");

  // Database.
  const databaseUrl = read(env, "DATABASE_URL");
  if (!databaseUrl) {
    add("error", "DATABASE_URL", "Missing. Production needs a managed PostgreSQL database.");
  } else {
    const host = hostOf(databaseUrl);
    if (host === null) add("error", "DATABASE_URL", "Not a valid connection URL.");
    else if (LOCAL_HOSTS.has(host))
      add("error", "DATABASE_URL", "Points at this machine. A hosted site cannot reach it.");
  }
  if (read(env, "ALLOW_LOCAL_SERVICES") === "true")
    add(
      "error",
      "ALLOW_LOCAL_SERVICES",
      "Must not be true in production (it enables the embedded database).",
    );

  // Photo storage.
  const storageDriver = read(env, "STORAGE_DRIVER") ?? "local";
  if (storageDriver === "local") {
    add("error", "STORAGE_DRIVER", "Local disk storage is for development. Use s3 in production.");
  } else if (storageDriver === "s3") {
    const required = [
      "S3_REGION",
      "S3_BUCKET",
      "S3_ACCESS_KEY_ID",
      "S3_SECRET_ACCESS_KEY",
      "S3_PUBLIC_BASE_URL",
    ];
    for (const name of required) {
      if (!read(env, name)) add("error", name, "Missing for S3 storage.");
    }
    const publicBase = read(env, "S3_PUBLIC_BASE_URL");
    if (publicBase && !isHttps(publicBase))
      add(
        "error",
        "S3_PUBLIC_BASE_URL",
        "Must be an https address, so photos load over a secure connection.",
      );
  } else {
    add("error", "STORAGE_DRIVER", "Must be s3 in production.");
  }

  // Site address and content.
  const siteUrl = read(env, "SITE_URL");
  if (!siteUrl) add("error", "SITE_URL", "Missing. Set it to your https address.");
  else if (!isHttps(siteUrl)) add("error", "SITE_URL", "Must start with https:// in production.");

  if (read(env, "SHOW_DEMO_CONTENT") === "true")
    add(
      "warn",
      "SHOW_DEMO_CONTENT",
      "Sample content is visible to visitors. Remove it from the dashboard.",
    );
  if (read(env, "LOG_LEVEL") === "debug")
    add("warn", "LOG_LEVEL", "Debug logging in production can record more detail than you need.");

  // Map and place search: separate keys, and the public one is restricted by domain in MapTiler.
  const publicKey = read(env, "MAPTILER_PUBLIC_KEY");
  const geocodingKey = read(env, "MAPTILER_GEOCODING_KEY");
  if (publicKey && geocodingKey && publicKey === geocodingKey)
    add(
      "warn",
      "MAPTILER_GEOCODING_KEY",
      "Same value as MAPTILER_PUBLIC_KEY. Use two keys so each can be limited separately.",
    );
  if (!geocodingKey)
    add(
      "warn",
      "MAPTILER_GEOCODING_KEY",
      "Not set. Place search uses the built-in list of cities only.",
    );
  if (!publicKey && !read(env, "MAP_STYLE_URL"))
    add("warn", "MAPTILER_PUBLIC_KEY", "Not set. The map shows country outlines only.");
  const styleUrl = read(env, "MAP_STYLE_URL");
  if (styleUrl && !isHttps(styleUrl)) add("warn", "MAP_STYLE_URL", "Should be an https address.");

  return issues;
}
