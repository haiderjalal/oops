# CLAUDE.md — Oops, I Traveled Again!

## Mission
Build a production-ready, visually delightful personal travel atlas and photo journal. The owner pins REAL locations (countries, cities, attractions, restaurants, coffee shops, street addresses) on an interactive 3D globe / real-world street map. Public visitors discover visited locations, stories, photo galleries, routes, and travel statistics. ONLY the authenticated owner can create, edit, publish, or delete content.

## Product voice
Warm, playful, self-deprecating, witty, and curious. Sample tagline: "Collecting memories, wrong turns, and questionable travel decisions." Humor is in copy, microinteractions, and light animations; never obstruct reading or navigation.

## Design system
Visual concept: retro explorer's scrapbook + premium digital atlas. Avoid generic SaaS dashboards and generic travel-template hero sections.
- Palette: parchment #F8F4EB; ink #202C37; deep ocean #164F68; coral #FA6B4A; sunrise #F2C66D; lavender #A8A4E6; white #FFFFFF.
- Type: expressive editorial display serif (e.g. Fraunces), clear sans (e.g. DM Sans). Self-host fonts; use next/font.
- Elements: rounded postcards, slight paper texture, dashed travel paths, illustrated stamps, pill badges, hand-drawn accent doodles. Prefer CSS/SVG for ornamentation.
- Motion: responsive and restrained, max 200-500ms typical interactions, brief intro only if non-blocking; respect prefers-reduced-motion. Never animate every pin continuously.
- Layout: desktop map 65-75% width with floating story panel, mobile fullscreen map + bottom sheet. Large tap targets and keyboard support.
- Screens: Home/World Explorer, Destination Detail, My Travel Timeline, Passport & Stats, Bucket List, About, Owner Dashboard, Create/Edit Place.

## Core architecture decisions
- Next.js App Router + TypeScript (strict), Tailwind CSS, accessible headless UI primitives, Zod, React Hook Form.
- MapLibre GL JS for real interactive globe and street-level map (use modern globe projection supported by installed stable version). MapLibre is the renderer, NOT a map-data provider. Production map tiles/styles and geocoding must come from a licensed provider, configurable through environment variables; e.g. MapTiler. Never use a public demonstration tile endpoint in production. Preserve map attribution.
- Database: PostgreSQL with PostGIS (or lat/lng with a clear geospatial upgrade path). Prisma or Drizzle, select one and document why. Auth: owner-only login, ideally established provider with MFA; enforce authorization on server for every mutation. Public website does not require visitor accounts.
- Photos: object storage (S3-compatible or established provider), signed direct uploads, validation, thumbnails, EXIF stripping by default, image transformations and responsive delivery via CDN. Do not store image blobs in Postgres.
- Hosting: Vercel or suitable Next.js platform; managed Postgres, storage/CDN, map provider. Keep providers behind interfaces for future portability.
- CMS alternative: typed owner dashboard rather than introducing a large generic CMS for v1.

## Routes
- `/` globe-first exploration with story highlights, filters, search and map/list toggle.
- `/places/[slug]` SEO-friendly public journal page with gallery, narrative, location, nearby pins, share metadata.
- `/timeline` chronological entries grouped by trip/year.
- `/passport` visited countries/cities, highlights and honest stats derived from published entries.
- `/bucket-list` planned locations visually distinguished from visited ones, no false visit claims.
- `/about` playful bio and travel philosophy.
- `/admin` authenticated overview; `/admin/places/new`, `/admin/places/[id]/edit`, `/admin/media`.

## Entities and data shape
Create `Place`, `Trip`, `Photo`, `Tag`, `PlaceTag`, `BucketListItem` and optionally `TravelRoute`.
Place minimum fields:
- `id` UUID, `slug` unique, `title`, `type` enum(country/city/cafe/restaurant/attraction/hotel/other), `lat` decimal, `lng` decimal,
- `providerPlaceId` nullable, `placeName`, `formattedAddress`, `city`, `region`, `countryCode`, `countryName`, `visitedAt` date nullable,
- `excerpt`, `story` rich text or sanitized markdown, `funnyMoment` nullable, `rating` nullable, `status` draft/published,
- `coverPhotoId` nullable, `tripId` nullable, `createdAt`, `updatedAt`, `publishedAt` nullable.
Photo: `id`, `placeId`, `storageKey`, `alt`, `caption`, `width`, `height`, `sortOrder`, `createdAt`.
Trip: `id`, `slug`, `title`, `startDate`, `endDate`, `description`, `status`.
Bucket item: `id`, `placeName`, `lat`, `lng`, `note`, `status` planned/completed; completion is not counted as visit unless a published Place exists.
Critical: keep coordinates as actual geocoded coordinates, retain provider provenance, use longitude/latitude order when passing coordinates to MapLibre, allow owner to correct an inaccurate search result with a draggable pin, and explicitly label any synthetic seed content as demo.

## User workflows
1. Public opens fast HTML landing shell (title, brand, hero, static globe poster if map bundle not ready); map lazy-loads after primary content renders and when viewport/interaction warrants.
2. Map initially globe view; gentle guided camera movement only once and only if allowed. Users can drag/zoom, search, filter by type/year/country, select clusters or pins. At close zoom the same real vector map reveals roads, POIs, and street labels.
3. Pin opens preview card (photo, title, visit date, short funny note). Open full story page or slide-up story sheet. Browser back/forward and deep links must work.
4. Admin uses location search via geocoder (country, city, business or full address), previews result, adjusts pin position, adds visit date and story, uploads/reorders photos, selects cover, adds funny quote/tags, saves draft or publishes. Show upload progress, field validation and meaningful failure recovery.
5. Public visitor can share a deep link to a location but cannot publish, edit, or upload.
6. Map view and list view must provide equivalent navigation for accessibility and slower devices.

## Suggested structure
```
src/
  app/
    (public)/page.tsx
    (public)/places/[slug]/page.tsx
    (public)/timeline/page.tsx
    (public)/passport/page.tsx
    (public)/bucket-list/page.tsx
    (public)/about/page.tsx
    (owner)/admin/page.tsx
    (owner)/admin/places/new/page.tsx
    (owner)/admin/places/[id]/edit/page.tsx
    api/uploads/sign/route.ts
  components/
    map/{TravelMap,MapMarker,MapControls,PlacePreview,MapFallback}.tsx
    journal/{PhotoGallery,StoryCard,TripTimeline}.tsx
    layout/{SiteHeader,MobileNav,Footer}.tsx
    ui/
  features/
    places/{queries,actions,schema,types}.ts
    trips/{queries,actions,schema,types}.ts
    uploads/{actions,validation}.ts
    search/{provider,types}.ts
  lib/{auth,db,storage,config,errors}.ts
  styles/
  tests/{unit,integration,e2e}/
```
Adjust route group organization if necessary without coupling all behavior to page files.

## Performance requirements
- Aim for mobile LCP <=2.5s, CLS <=0.1, INP <=200ms at p75 on realistic production measurements, not guaranteed for every device.
- MapLibre and geocoder are client-only, dynamically imported; avoid sending huge map bundles to pages that do not need maps. No heavy globe libraries in addition to MapLibre unless demonstrated necessary.
- SSR/SSG/ISR public journal pages and metadata; cache public places and GeoJSON using invalidation on publication; only serve published data.
- Cluster pins or use map source layers for large datasets. Avoid hundreds of React DOM markers, complex per-frame React state updates, and unbounded photo grids.
- Optimize images (AVIF/WebP, correct sizes, blur placeholders), upload compressed originals where sensible, lazy-load noncritical galleries, priority-load only one hero image.
- Use responsive loading skeletons, error boundaries, map fallback, low-data map/list toggle, and content visible before the map initializes.
- Cache geocoder queries with provider-policy compliance; debounce searches, apply rate limits and quotas. Guard secret credentials server-side; a public browser tile token must be domain restricted where supported.
- Reduce third-party scripts, avoid parallax on mobile if janky, prefer CSS transform/opacity; respect reduced motion. Use Lighthouse and Web Vitals in CI.

## Security, privacy, and compliance
- Owner mutations require verified authentication and server-side authorization, not merely hidden admin UI.
- Sanitize user-authored rich text, validate uploads by MIME/signature/size, signed short-lived upload URLs, restrict types and enforce quotas.
- Strip photo EXIF by default, especially GPS. Owner may choose approximate coordinates or delay publishing current location for safety. Never ask visitors for geolocation on page load.
- Parameterize database access, CSP and secure headers, rate-limit mutations and geocoding, keep credentials in environment variables. No keys in source.
- Respect map tile licensing, attribution, photo rights, privacy, and reasonable API limits.

## Accessibility and SEO
- WCAG 2.2 AA target. Keyboard-selectable pin equivalents in a synchronized list, focus management on bottom sheets, semantic headings, visible focus styles, contrast checks, alt text. No essential functionality depends on hover.
- Accessible reduced-motion mode and direct list view. Use structured data appropriate to articles/places where accurate, canonical URLs, social preview, sitemap, robots, image metadata.

## Milestone execution order
1. Set up Next.js, strict TS, linting, formatting, tests, design tokens, shell and responsive layout.
2. Create functional globe/street map with production map-style configuration, sample DEMO pins and responsive preview card.
3. Set up DB schema/migrations, published place queries, map/search/filter links; replace demos with actual stored entries.
4. Implement auth, owner dashboard, real geocoding, pin correction, story editor and photo uploads.
5. Add place detail pages, timeline, passport, bucket list and accessible list view.
6. Add animations, route lines, photo stamps and polish only after functional and performance acceptance.
7. Test release, fix issues, document env vars, deployment, operational costs and backups.

## Acceptance criteria
- Clicking actual point for a real cafe/city opens a published entry with correct coordinates, photos and narrative.
- Owner can create/publish/update/delete a place from dashboard without code edits; a non-owner cannot mutate.
- On globe zoom, the map provides real geographic tiles and displays streets and POIs at appropriate zoom levels.
- Mobile responsive with bottom-sheet interactions; keyboard and screen reader alternatives exist.
- Photos are optimized, stored securely, and content renders even if the map or external tile API fails.
- Drafts are private. All visible stats reflect published real entries, not demo data.
- Unit, integration, E2E and basic accessibility tests pass. No secrets exposed, no broken attribution.

## Collaboration protocol for Claude
- At the start, inspect repository. If empty, scaffold without requesting unnecessary clarifications.
- Produce a short implementation plan with tasks and clear acceptance criteria; then implement vertical slices fully.
- Use latest stable versions and verify library APIs from official docs before writing integration code.
- Keep files focused, typed, and testable; prefer server components for non-interactive content. No monolithic 1,000-line components.
- After every milestone run typecheck, lint, tests, and production build; fix real failures.
- Never say a feature is implemented if only mocked. Label all mockups, demo records, and unavailable API integrations plainly.
- Keep CHANGELOG / README and `.env.example` updated. Summarize tradeoffs (tile provider, geocoder, image storage, cost) and present tested output.
