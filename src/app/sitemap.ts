import type { MetadataRoute } from "next";

import { ROUTES } from "@/constants/routes";
import { getPublishedPlaces } from "@/features/places/queries";
import { getSiteConfig } from "@/lib/config";

/** Public pages plus every published place. Demo places are noindex, so they stay out of the sitemap. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { url } = getSiteConfig();
  const places = (await getPublishedPlaces()).filter((place) => !place.isDemo);

  return [
    { url: `${url}${ROUTES.home}`, changeFrequency: "weekly", priority: 1 },
    { url: `${url}${ROUTES.timeline}`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${url}${ROUTES.passport}`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${url}${ROUTES.bucketList}`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${url}${ROUTES.about}`, changeFrequency: "yearly", priority: 0.4 },
    ...places.map((place) => ({
      url: `${url}${ROUTES.place(place.slug)}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
