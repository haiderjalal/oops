# Architecture

## Layers

```
Browser ── React (server components by default; small client islands)
   │
   ├─ components/        presentation only; ESLint forbids importing the database layer here
   ├─ features/<name>/   queries (cached reads) · actions (owner-only server actions)
   │                     · service (business rules) · repository (SQL) · schema (Zod) · mappers
   ├─ lib/               config · auth · db · storage · rate-limit · logger · errors (adapters)
   └─ utils/ types/ constants/   pure helpers
```

Rules that keep it clean:

- **UI → query/action → service → repository → database.** Components never touch the database; services never render UI.
- **Providers sit behind interfaces** (`StorageProvider`, `GeocoderProvider`, `RateLimiter`, `Database`), chosen by environment variables.
- **One definition per rule:** "what is public" (`publiclyVisible`), "how a pin is shown" (`toPlaceSummary`, including privacy rounding), "how a story is rendered" (`StoryContent`).
- **Validate everywhere:** the same Zod schema runs in the browser form and again in the server action; the database re-checks with constraints.

## Folder map

```
src/
  app/
    (public)/               layout with header/footer; /, /places/[slug], /timeline, /passport, /bucket-list, /about
    (owner)/admin/login     sign-in
    (owner)/admin/(dashboard)/   gated by requireOwner(): dashboard, places/new, places/[id]/edit, media, trips, bucket-list
    api/                    geocode · uploads/sign · uploads/local/[token] · media/[...key] · places (GeoJSON) · health
    sitemap.ts robots.ts opengraph-image.tsx error.tsx not-found.tsx
  components/{map,journal,layout,shared,admin,ui}/
  features/{places,trips,bucket,uploads,search,stats,explorer,admin,auth}/
  lib/{auth,db,storage}/  config.ts errors.ts logger.ts rate-limit.ts actions.ts request.ts startup.ts
  hooks/ utils/ types/ constants/ styles/ tests/{unit,integration,e2e}
drizzle/                    generated SQL migrations
scripts/                    setup-owner, migrate, seed-demo, purge-demo, build-atlas-data
public/data/                bundled Natural Earth country shapes (the offline atlas)
```

## How a request flows

**Public page** (`/`): a cached `getPublishedPlaces()` (tag `places`) returns plain objects → the page renders the hero, a server-drawn SVG globe poster, and the `WorldExplorer` client island. The explorer is server-rendered in its default state (so the HTML already contains every place as a real link), then hydrates; filters, selection and view mode live in the URL (`useUrlSearch`), so deep links and back/forward work. After first render and when the browser is idle, `MapStage` lazy-loads MapLibre and fades the poster out.

**Owner saves a place:** `PlaceForm` (React Hook Form + Zod) → `savePlaceAction` → `runOwnerAction` (verify session on the server → re-validate → handler) → `service` (slug uniqueness, publish timestamp, photo ownership, cover) → repository transaction → `updateTag()` → public pages refresh.

**Photo upload:** `POST /api/uploads/sign` (owner, rate limited) → browser `PUT`s to the signed target → `finalizeUploadAction` → verify magic bytes → `sharp` re-encode (strips all metadata) → store variants → delete original → insert `photos` row.

## Map internals

- One clustered GeoJSON source and one symbol layer for pins; clusters and pins are canvas-drawn sprites registered lazily through `setMissingStyleImageResolver`.
- Coordinates are `[longitude, latitude]` at the MapLibre boundary (`placesToGeoJson`, unit-tested).
- Trip routes are great-circle arcs between a trip's dated stops, static dashed lines (`routesToGeoJson`).
- Offline atlas (`atlasStyle.ts`) is the default basemap and automatic fallback; a licensed style replaces it when configured.
- The map is never required: every capability is available from the synchronised list and the list view.

## Security summary

| Concern                | Measure                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Who can change content | Every mutation re-verifies a signed session on the server (`assertOwner`); proxy is only an optimistic redirect                                        |
| Login                  | scrypt password, TOTP two-factor with replay rejection, generic error, per-address and per-email rate limits, equal-time comparison for unknown emails |
| Sessions               | HttpOnly, SameSite=Lax, `__Host-` prefix and Secure in production; invalidated when the password changes                                               |
| CSRF                   | Server Actions check Origin; JSON/PUT route handlers call `assertSameOrigin`                                                                           |
| Input                  | Zod on client and server, DB constraints, parameterised queries (Drizzle)                                                                              |
| Stories                | Markdown → React elements; raw HTML dropped, `javascript:` links stripped, images disallowed                                                           |
| Uploads                | Allow-list by file _signature_, size and pixel caps, short-lived signed URLs bound to size and type, re-encoded output, originals deleted              |
| Privacy                | EXIF/GPS stripped; approximate locations rounded server-side; scheduled publishing; no geolocation requests                                            |
| Headers                | CSP (derived from configured providers), `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy                                       |
| Secrets                | Environment only; server config is `server-only`; only the explicitly public map style URL reaches the browser                                         |
| Database               | RLS enabled with no policies (deny by default for any auto-generated API)                                                                              |

## Accessibility

WCAG 2.2 AA is the target. Design tokens are contrast-tested (`src/tests/unit/contrast.test.ts`), pages are audited with axe in end-to-end tests, and these patterns are used throughout: skip link, visible focus rings (ocean on light, sunrise on dark), semantic headings and landmarks, labelled form fields with associated errors, native dialogs, focus moved to the selected postcard, a synchronised list as the equivalent of every map interaction, alt text required before publishing, `prefers-reduced-motion` respected (CSS opt-in motion; MapLibre camera moves are non-essential). Automated checks do not replace a manual screen-reader pass — see the checklist in the README.
