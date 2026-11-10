import type { MetadataRoute } from "next";

import { getSiteConfig } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  const { url } = getSiteConfig();
  // Preview and staging deployments must never be indexed.
  const isProductionDeploy = !process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production";

  if (!isProductionDeploy) return { rules: { userAgent: "*", disallow: "/" } };

  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: `${url}/sitemap.xml`,
  };
}
