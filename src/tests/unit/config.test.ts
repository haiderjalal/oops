import { afterEach, describe, expect, it } from "vitest";

import {
  getAuthConfig,
  getClientMapConfig,
  getDatabaseConfig,
  getDemoConfig,
  getGeocoderConfig,
  getStorageConfig,
  resetConfigForTests,
} from "@/lib/config";
import { ConfigError } from "@/lib/errors";

const original = { ...process.env };

function setEnv(values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  resetConfigForTests();
}

afterEach(() => {
  process.env = { ...original };
  resetConfigForTests();
});

describe("configuration", () => {
  it("shows demo content by default only outside production", () => {
    setEnv({ NODE_ENV: "development", SHOW_DEMO_CONTENT: undefined });
    expect(getDemoConfig().show).toBe(true);
    setEnv({ NODE_ENV: "production", SHOW_DEMO_CONTENT: undefined });
    expect(getDemoConfig().show).toBe(false);
    setEnv({ NODE_ENV: "production", SHOW_DEMO_CONTENT: "true" });
    expect(getDemoConfig().show).toBe(true);
  });

  it("reports exactly what is missing for owner sign-in, without leaking values", () => {
    setEnv({ AUTH_SECRET: undefined, OWNER_EMAIL: undefined, OWNER_PASSWORD_HASH: undefined });
    const auth = getAuthConfig();
    expect(auth.configured).toBe(false);
    expect(auth.problems.join(" ")).toMatch(/AUTH_SECRET/);
    expect(auth.problems.join(" ")).toMatch(/OWNER_EMAIL/);
  });

  it("requires a long secret", () => {
    setEnv({
      AUTH_SECRET: "short",
      OWNER_EMAIL: "a@b.co",
      OWNER_PASSWORD_HASH: "scrypt:1:1:1:a:b",
    });
    expect(getAuthConfig().problems.join(" ")).toMatch(/32 characters/);
  });

  it("requires two-factor in production unless explicitly waived", () => {
    const base = {
      AUTH_SECRET: "x".repeat(40),
      OWNER_EMAIL: "a@b.co",
      OWNER_PASSWORD_HASH: "scrypt:1:1:1:a:b",
    };
    setEnv({
      ...base,
      NODE_ENV: "production",
      OWNER_TOTP_SECRET: undefined,
      AUTH_ALLOW_PASSWORD_ONLY: undefined,
    });
    expect(getAuthConfig().configured).toBe(false);
    setEnv({ ...base, NODE_ENV: "production", OWNER_TOTP_SECRET: "JBSWY3DPEHPK3PXP" });
    expect(getAuthConfig().configured).toBe(true);
    setEnv({
      ...base,
      NODE_ENV: "production",
      OWNER_TOTP_SECRET: undefined,
      AUTH_ALLOW_PASSWORD_ONLY: "true",
    });
    expect(getAuthConfig().configured).toBe(true);
  });

  it("falls back to the offline atlas and only exposes a style URL when a provider is configured", () => {
    setEnv({ MAPTILER_PUBLIC_KEY: undefined, MAP_STYLE_URL: undefined });
    expect(getClientMapConfig()).toEqual({ mode: "offline", styleUrl: null });

    setEnv({ MAPTILER_PUBLIC_KEY: "pk_test", MAPTILER_STYLE_ID: "outdoor-v2" });
    const map = getClientMapConfig();
    expect(map.mode).toBe("provider");
    expect(map.styleUrl).toBe("https://api.maptiler.com/maps/outdoor-v2/style.json?key=pk_test");

    setEnv({ MAP_STYLE_URL: "https://tiles.example.com/style.json" });
    expect(getClientMapConfig().styleUrl).toBe("https://tiles.example.com/style.json");
  });

  it("never reveals the server geocoding key through the client map config", () => {
    setEnv({ MAPTILER_GEOCODING_KEY: "server-secret-key", MAPTILER_PUBLIC_KEY: undefined });
    expect(JSON.stringify(getClientMapConfig())).not.toContain("server-secret-key");
    expect(getGeocoderConfig()).toEqual({ provider: "maptiler", apiKey: "server-secret-key" });
    setEnv({ MAPTILER_GEOCODING_KEY: undefined });
    expect(getGeocoderConfig()).toEqual({ provider: "gazetteer" });
  });

  it("refuses local-disk storage in production and incomplete S3 settings", () => {
    setEnv({ NODE_ENV: "production", STORAGE_DRIVER: "local", ALLOW_LOCAL_SERVICES: undefined });
    expect(() => getStorageConfig()).toThrow(ConfigError);

    setEnv({
      NODE_ENV: "production",
      STORAGE_DRIVER: "s3",
      S3_BUCKET: "b",
      S3_REGION: undefined,
      S3_PUBLIC_BASE_URL: undefined,
    });
    expect(() => getStorageConfig()).toThrow(/Missing:.*S3_REGION/);

    setEnv({
      NODE_ENV: "production",
      STORAGE_DRIVER: "s3",
      S3_REGION: "auto",
      S3_BUCKET: "photos",
      S3_ACCESS_KEY_ID: "id",
      S3_SECRET_ACCESS_KEY: "secret",
      S3_PUBLIC_BASE_URL: "https://cdn.example.com/",
    });
    expect(getStorageConfig()).toMatchObject({
      driver: "s3",
      publicBaseUrl: "https://cdn.example.com",
    });
  });

  it("refuses to start the embedded database in production by default", () => {
    setEnv({ NODE_ENV: "production", DATABASE_URL: undefined, ALLOW_LOCAL_SERVICES: undefined });
    expect(getDatabaseConfig().allowEmbedded).toBe(false);
    setEnv({ NODE_ENV: "development" });
    expect(getDatabaseConfig().allowEmbedded).toBe(true);
  });

  it("rejects invalid values with a readable error", () => {
    setEnv({ SITE_URL: "not a url" });
    expect(() => getDemoConfig()).toThrow(/SITE_URL/);
  });
});
