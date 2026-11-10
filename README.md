# Oops, I Traveled Again!

A personal travel atlas and photo journal. Visitors spin an interactive globe, open postcards for places the owner has really been, and read the stories, photos and funny moments behind them. Only the signed-in owner can create, edit, publish or delete anything.

> _Collecting memories, wrong turns, and questionable travel decisions._

**Stack:** Next.js 16 (App Router, Cache Components) · React 19 · TypeScript (strict) · Tailwind CSS 4 · MapLibre GL JS 6 (globe) · PostgreSQL via Drizzle ORM · Zod + React Hook Form · S3-compatible storage · Vitest + Playwright.

## Quick start (no accounts needed)

```bash
npm install
npm run dev          # http://localhost:3000
```

With no configuration the app runs with:

| Piece        | Local default                                                          | Production needs                                           |
| ------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| Database     | Embedded PostgreSQL (PGlite) in `.data/pglite`, migrated automatically | `DATABASE_URL`                                             |
| Map          | Bundled retro country-level atlas (Natural Earth)                      | `MAPTILER_PUBLIC_KEY` or `MAP_STYLE_URL` for streets/POIs  |
| Place search | ~45 built-in cities                                                    | `MAPTILER_GEOCODING_KEY` for cafés, restaurants, addresses |
| Photos       | Local disk (`.data/uploads`)                                           | S3-compatible bucket                                       |
| Content      | **DEMO** sample places (clearly stamped)                               | Your own, via the dashboard                                |

To use the dashboard, create the owner account (the password is never stored, only a scrypt hash):

```bash
npm run setup:owner      # writes credentials to .env.local, prints an authenticator secret
npm run dev              # then sign in at /admin/login
```

## What you get

**Public site** — `/` globe-first explorer (search, type/year/country filters, map ⇄ list, "surprise me", deep links, shareable URLs) · `/places/[slug]` postcard journal page (story, photo album with lightbox, "oops moment", nearby places, structured data) · `/timeline` grouped by trip and year · `/passport` country stamps and honest stats · `/bucket-list` wishes kept clearly apart from visits · `/about`.

**Owner dashboard** (`/admin`, sign-in with password + authenticator code) — create/edit/publish/unpublish/schedule/delete (and restore) places; geocoder search with a draggable pin to correct inaccurate results; Markdown story editor with live preview; direct photo uploads with progress, alt text, captions, cover and ordering; trips; bucket list; photo library; setup check; one-click removal of demo content.

**Honesty and privacy by design**

- Demo content is real data flagged `is_demo`: stamped **DEMO**, `noindex`, never silently mixed into stats, removable in one click.
- Drafts are private; places can be **scheduled** and shown **approximately** (rounded ≈ 11 km, no address).
- Uploaded photos are re-encoded on the server and **all metadata (GPS included) is stripped**; originals are deleted.
- Passport numbers count published journal entries only. A completed bucket-list item is _not_ a visit unless a published place backs it.

## Commands

| Command                              | What it does                                                              |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `npm run dev` / `build` / `start`    | Develop / production build / serve it                                     |
| `npm run check`                      | Typecheck + lint + unit & integration tests                               |
| `npm test`                           | Vitest: unit tests and integration tests against real PostgreSQL (PGlite) |
| `npm run test:e2e`                   | Playwright against a production build (see below)                         |
| `npm run setup:owner`                | Create owner credentials in `.env.local`                                  |
| `npm run db:generate` / `db:migrate` | Generate / apply SQL migrations                                           |
| `npm run db:seed` / `db:purge-demo`  | Insert / remove demo content in `DATABASE_URL`                            |
| `npm run data:atlas`                 | Rebuild the bundled country atlas from `world-atlas`                      |

### Tests

- **Unit / integration** (`src/tests/unit`, `src/tests/integration`): validation, slugs, dates, geo maths, filters, stats, timeline, GeoJSON coordinate order, password hashing, TOTP replay rejection, sessions, rate limits, config rules, image processing (EXIF stripping), storage keys and path-traversal, presigned URLs, geocoder mapping, markdown safety, WCAG colour contrast, and the full database layer (migrations, constraints, triggers, RLS, visibility, privacy rounding, scheduling, photo ownership, bucket honesty, demo seeding/purging).
- **End to end** (`src/tests/e2e`, 48 tests): starts `next build && next start` with an in-memory database, then drives a real browser through public pages, deep links and history, filters, no-JavaScript rendering, privacy and draft guarantees, access control, sign-in with two-factor, the complete owner workflow (create → upload a photo with GPS data → publish → edit → unpublish → delete → restore → purge demo), a phone-width layout check (no sideways scrolling on any page, bottom-sheet behaviour) and **axe accessibility audits** (WCAG 2.2 AA) of every page.
  By default it uses the Microsoft Edge already installed on Windows/macOS. On CI or Linux run `npx playwright install chromium` and set `E2E_CHANNEL=` (empty).

## Project structure

See [docs/architecture.md](docs/architecture.md). In short: `app/` (routes only) → `components/` (presentation) → `features/*` (queries, actions, services, repositories, schemas) → `lib/*` (config, auth, db, storage adapters).

## Documentation

- [docs/architecture.md](docs/architecture.md) — layers, request flows, map internals, security and accessibility summary
- [docs/decisions.md](docs/decisions.md) — why Drizzle, how auth works, caching trade-offs, and other decisions with their costs
- [docs/database.md](docs/database.md) — tables, conventions, RLS, PostGIS upgrade path, backups
- [docs/deployment.md](docs/deployment.md) — providers, environment, first-deploy checklist, operations, costs
- [.env.example](.env.example) — every variable, annotated
- [CHANGELOG.md](CHANGELOG.md)

## What still needs your credentials (and was not verified live)

These work end-to-end locally through offline defaults, but the production adapters need **your** accounts:

1. **Licensed map tiles** (`MAPTILER_PUBLIC_KEY` or `MAP_STYLE_URL`): until set, the map is country-level only. The key must be domain-restricted.
2. **Real geocoder** (`MAPTILER_GEOCODING_KEY`): the adapter follows MapTiler's documented response shape and is unit-tested against it, but has not been run against a live account.
3. **Hosted PostgreSQL** (`DATABASE_URL`) and **S3-compatible storage** (`S3_*`): the same code paths are tested on PGlite and with fake-credential presigning; run the checklist in [docs/deployment.md](docs/deployment.md) on first deploy.

## Manual accessibility checklist (automated audits don't cover this)

- [ ] Tab through `/` with only the keyboard: skip link → search → filters → list → each "Show on map" button; the postcard heading receives focus.
- [ ] With a screen reader, hear the list, the result count announcement and the selected-place announcement.
- [ ] Increase text size to 200 % and zoom to 400 %: no loss of content or function.
- [ ] Enable "reduce motion" in the OS: no camera fly-to, no animations.
- [ ] Switch the map to **List** view: every place and filter still works.

## Security

Found a problem? Please report it privately to the site owner rather than in public.
