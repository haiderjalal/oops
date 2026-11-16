/**
 * HTTP security headers, built by plain functions so they can be unit-tested and reused by
 * next.config.ts. Keep this file free of imports that need the Next.js runtime.
 */

export interface SecurityHeader {
  key: string;
  value: string;
}

export interface HeaderOptions {
  isProduction: boolean;
  /**
   * Origins the browser may load images, media or API responses from: the licensed map provider,
   * and the object-storage CDN and endpoint. Built from environment variables by next.config.ts.
   */
  origins: readonly string[];
}

/**
 * Content-Security-Policy. Scripts are allowed inline because Next.js hydration needs them; the
 * remaining directives are strict. Nothing user-written reaches the DOM as HTML (see StoryContent
 * and JsonLd), so inline script is the only relaxation and is compensated for by the rest.
 */
export function contentSecurityPolicy({ isProduction, origins }: HeaderOptions): string {
  const external = origins.join(" ");
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${external}`.trim(),
    "font-src 'self' data:",
    `connect-src 'self' blob: ${external}`.trim(),
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

/** Headers for every response. */
export function securityHeaders(options: HeaderOptions): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(options) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), serial=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  ];

  if (options.isProduction) {
    // Once a browser has seen this over HTTPS it refuses plain HTTP for this host for two years.
    // (Browsers ignore it over HTTP, so local development is unaffected.)
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    });
  }
  return headers;
}

/**
 * Owner-only pages and APIs must never be embedded or read by another site: the cross-origin
 * resource policy stops cross-site reads even by requests that aren't CORS-checked.
 */
export const OWNER_ONLY_HEADERS: SecurityHeader[] = [
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];
