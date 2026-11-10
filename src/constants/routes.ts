/** Every internal URL in one place — no magic strings in components. */
export const ROUTES = {
  home: "/",
  timeline: "/timeline",
  passport: "/passport",
  bucketList: "/bucket-list",
  about: "/about",
  place: (slug: string) => `/places/${slug}`,
  /** Deep link into the explorer with a place preselected. */
  explore: (slug?: string) => (slug ? `/?place=${encodeURIComponent(slug)}` : "/"),
  admin: {
    root: "/admin",
    login: "/admin/login",
    newPlace: "/admin/places/new",
    editPlace: (id: string) => `/admin/places/${id}/edit`,
    media: "/admin/media",
    trips: "/admin/trips",
    bucketList: "/admin/bucket-list",
  },
} as const;

export const MAIN_NAV = [
  { href: ROUTES.home, label: "Explore" },
  { href: ROUTES.timeline, label: "Timeline" },
  { href: ROUTES.passport, label: "Passport" },
  { href: ROUTES.bucketList, label: "Bucket list" },
  { href: ROUTES.about, label: "About" },
] as const;
