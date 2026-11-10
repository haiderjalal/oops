import "server-only";

import { z } from "zod";

import { ConfigError } from "@/lib/errors";

/**
 * Typed, validated access to environment variables. Server-only: nothing here is ever sent to
 * the browser except through the explicit `getClientMapConfig()` projection below.
 *
 * Providers (map style, geocoder, object storage, database) are chosen purely by environment
 * variables so they can be swapped without code changes. See `.env.example`.
 */

const text = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const flag = z
  .string()
  .trim()
  .optional()
  .transform((value) =>
    value ? ["1", "true", "yes", "on"].includes(value.toLowerCase()) : undefined,
  );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SITE_URL: z.url().default("http://localhost:3000"),
  OWNER_NAME: text,

  SHOW_DEMO_CONTENT: flag,

  DATABASE_URL: text,
  ALLOW_LOCAL_SERVICES: flag,
  /** Folder for the embedded dev database, or "memory" for a throw-away one. */
  EMBEDDED_DB_DIR: text,

  AUTH_SECRET: text,
  OWNER_EMAIL: text,
  OWNER_PASSWORD_HASH: text,
  OWNER_TOTP_SECRET: text,
  AUTH_ALLOW_PASSWORD_ONLY: flag,

  MAPTILER_PUBLIC_KEY: text,
  MAPTILER_STYLE_ID: text,
  MAP_STYLE_URL: z
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  MAP_CSP_ORIGINS: text,

  MAPTILER_GEOCODING_KEY: text,

  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  LOCAL_STORAGE_DIR: text,
  S3_ENDPOINT: text,
  S3_REGION: text,
  S3_BUCKET: text,
  S3_ACCESS_KEY_ID: text,
  S3_SECRET_ACCESS_KEY: text,
  S3_PUBLIC_BASE_URL: text,
  S3_FORCE_PATH_STYLE: flag,
});

type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

function readEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );
    throw new ConfigError(`Invalid environment configuration — ${problems.join("; ")}`);
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}

/** True while `next build` is prerendering pages (which may use a throw-away in-memory database). */
export function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

/** Test helper: forget cached environment so a test can change `process.env`. */
export function resetConfigForTests(): void {
  cachedEnv = undefined;
}

export interface SiteConfig {
  url: string;
  ownerName: string;
  isProduction: boolean;
}

export function getSiteConfig(): SiteConfig {
  const env = readEnv();
  return {
    url: env.SITE_URL.replace(/\/$/, ""),
    ownerName: env.OWNER_NAME ?? "The Traveler",
    isProduction: env.NODE_ENV === "production",
  };
}

/** Demo content is shown by default in development only. Production must opt in explicitly. */
export function getDemoConfig(): { show: boolean } {
  const env = readEnv();
  return { show: env.SHOW_DEMO_CONTENT ?? env.NODE_ENV !== "production" };
}

export interface DatabaseConfig {
  url: string | null;
  allowEmbedded: boolean;
  /** Persistent folder for the embedded database, or null for in-memory. */
  embeddedDir: string | null;
}

export function getDatabaseConfig(): DatabaseConfig {
  const env = readEnv();
  const dir = env.EMBEDDED_DB_DIR ?? ".data/pglite";
  return {
    url: env.DATABASE_URL ?? null,
    // Production never uses the embedded database at runtime, but the build step may (in memory only).
    allowEmbedded: (env.ALLOW_LOCAL_SERVICES ?? env.NODE_ENV !== "production") || isBuildPhase(),
    embeddedDir: dir === "memory" ? null : dir,
  };
}

export interface AuthConfig {
  secret: string | null;
  ownerEmail: string | null;
  passwordHash: string | null;
  totpSecret: string | null;
  /** True when owner sign-in can work. */
  configured: boolean;
  /** Human-readable reasons sign-in is unavailable (never contains secret values). */
  problems: string[];
}

export function getAuthConfig(): AuthConfig {
  const env = readEnv();
  const problems: string[] = [];

  if (!env.AUTH_SECRET) problems.push("AUTH_SECRET is not set.");
  else if (env.AUTH_SECRET.length < 32)
    problems.push("AUTH_SECRET must be at least 32 characters.");
  if (!env.OWNER_EMAIL) problems.push("OWNER_EMAIL is not set.");
  if (!env.OWNER_PASSWORD_HASH)
    problems.push("OWNER_PASSWORD_HASH is not set (run `npm run setup:owner`).");

  const mfaRequired = env.NODE_ENV === "production" && !env.AUTH_ALLOW_PASSWORD_ONLY;
  if (mfaRequired && !env.OWNER_TOTP_SECRET) {
    problems.push("OWNER_TOTP_SECRET is required in production (two-factor sign-in).");
  }

  return {
    secret: env.AUTH_SECRET ?? null,
    ownerEmail: env.OWNER_EMAIL ?? null,
    passwordHash: env.OWNER_PASSWORD_HASH ?? null,
    totpSecret: env.OWNER_TOTP_SECRET ?? null,
    configured: problems.length === 0,
    problems,
  };
}

/** The only map settings that may reach the browser. The MapTiler key is public by design — restrict it by domain. */
export interface ClientMapConfig {
  /** `provider` = licensed vector style (streets, POIs). `offline` = bundled country-level atlas. */
  mode: "provider" | "offline";
  styleUrl: string | null;
}

export function getClientMapConfig(): ClientMapConfig {
  const env = readEnv();
  const styleUrl =
    env.MAP_STYLE_URL ??
    (env.MAPTILER_PUBLIC_KEY
      ? `https://api.maptiler.com/maps/${encodeURIComponent(env.MAPTILER_STYLE_ID ?? "streets-v2")}/style.json?key=${encodeURIComponent(env.MAPTILER_PUBLIC_KEY)}`
      : null);
  return { mode: styleUrl ? "provider" : "offline", styleUrl };
}

export type GeocoderConfig = { provider: "maptiler"; apiKey: string } | { provider: "gazetteer" };

export function getGeocoderConfig(): GeocoderConfig {
  const env = readEnv();
  return env.MAPTILER_GEOCODING_KEY
    ? { provider: "maptiler", apiKey: env.MAPTILER_GEOCODING_KEY }
    : { provider: "gazetteer" };
}

export type StorageConfig =
  | { driver: "local"; directory: string }
  | {
      driver: "s3";
      endpoint: string | undefined;
      region: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
      publicBaseUrl: string;
      forcePathStyle: boolean;
    };

export function getStorageConfig(): StorageConfig {
  const env = readEnv();

  if (env.STORAGE_DRIVER === "local") {
    if (env.NODE_ENV === "production" && !env.ALLOW_LOCAL_SERVICES && !isBuildPhase()) {
      throw new ConfigError(
        "STORAGE_DRIVER=local is for development only. Configure S3-compatible storage (STORAGE_DRIVER=s3).",
      );
    }
    return { driver: "local", directory: env.LOCAL_STORAGE_DIR ?? ".data/uploads" };
  }

  const missing = (
    [
      ["S3_REGION", env.S3_REGION],
      ["S3_BUCKET", env.S3_BUCKET],
      ["S3_ACCESS_KEY_ID", env.S3_ACCESS_KEY_ID],
      ["S3_SECRET_ACCESS_KEY", env.S3_SECRET_ACCESS_KEY],
      ["S3_PUBLIC_BASE_URL", env.S3_PUBLIC_BASE_URL],
    ] as const
  )
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new ConfigError(
      `Object storage is not fully configured. Missing: ${missing.join(", ")}.`,
    );
  }

  return {
    driver: "s3",
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION as string,
    bucket: env.S3_BUCKET as string,
    accessKeyId: env.S3_ACCESS_KEY_ID as string,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY as string,
    publicBaseUrl: (env.S3_PUBLIC_BASE_URL as string).replace(/\/$/, ""),
    forcePathStyle: env.S3_FORCE_PATH_STYLE ?? false,
  };
}

/** A snapshot of which integrations are live — shown on the owner dashboard (no secrets). */
export interface IntegrationStatus {
  database: "postgres" | "embedded";
  map: "provider" | "offline";
  geocoder: "maptiler" | "gazetteer";
  storage: "s3" | "local";
  mfa: boolean;
  demoContent: boolean;
}

export function getIntegrationStatus(): IntegrationStatus {
  const env = readEnv();
  return {
    database: env.DATABASE_URL ? "postgres" : "embedded",
    map: getClientMapConfig().mode,
    geocoder: getGeocoderConfig().provider,
    storage: env.STORAGE_DRIVER,
    mfa: Boolean(env.OWNER_TOTP_SECRET),
    demoContent: getDemoConfig().show,
  };
}
