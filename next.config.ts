import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/** Returns the origin of a URL, or null when the value is empty or not a valid absolute URL. */
function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

// Origins the browser is allowed to talk to. Everything is derived from environment
// variables so swapping providers (map style, object storage/CDN) never needs a code change.
const mapOrigins = [
  process.env.MAPTILER_PUBLIC_KEY ? "https://api.maptiler.com" : null,
  originOf(process.env.MAP_STYLE_URL),
  ...list(process.env.MAP_CSP_ORIGINS),
].filter((origin): origin is string => Boolean(origin));

const storagePublicBase = process.env.S3_PUBLIC_BASE_URL;
const storageOrigins = [originOf(storagePublicBase), originOf(process.env.S3_ENDPOINT)].filter(
  (origin): origin is string => Boolean(origin),
);

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js hydration uses inline scripts. A nonce-based policy would force every page to
  // render dynamically and defeat static caching, so we accept 'unsafe-inline' for scripts
  // and compensate with the restrictive directives below.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${[...mapOrigins, ...storageOrigins].join(" ")}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self' blob: ${[...mapOrigins, ...storageOrigins].join(" ")}`.trim(),
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

function storageImagePattern(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  if (!storagePublicBase) return [];
  try {
    const url = new URL(storagePublicBase);
    const basePath = url.pathname.replace(/\/$/, "");
    return [
      {
        protocol: url.protocol === "http:" ? "http" : "https",
        hostname: url.hostname,
        ...(url.port ? { port: url.port } : {}),
        pathname: `${basePath}/**`,
        search: "",
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // PGlite is the embedded Postgres used for zero-config local development and tests.
  // It loads WASM assets from disk, so it must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  images: {
    formats: ["image/avif", "image/webp"],
    // Local-driver uploads are served by /api/media (development only).
    localPatterns: [{ pathname: "/api/media/**", search: "" }],
    remotePatterns: storageImagePattern(),
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // The offline atlas is static and versioned by filename; cache it aggressively.
        source: "/data/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
