# Changelog

All notable changes to this project. Format follows [Keep a Changelog](https://keepachangelog.com/); versions follow [Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-11-10

First complete version.

### Added

- **Public site:** globe-first explorer with clustering, search, type/year/country filters, map ⇄ list views, deep links and browser history support; place journal pages with photo albums, nearby places and structured data; timeline grouped by trip and year; passport and stats; bucket list; about page.
- **Owner dashboard:** password + TOTP sign-in; place editor with geocoder search, draggable pin, Markdown story editor, photo uploads (progress, alt text, captions, cover, ordering), tags, trips, scheduling and approximate-location privacy; draft/publish/unpublish/soft-delete/restore; trips and bucket-list management; photo library; setup check; demo-content removal.
- **Data layer:** PostgreSQL schema and SQL migrations (constraints, partial indexes, `updated_at` triggers, row level security), Drizzle repositories, embedded PGlite database for zero-config development and tests, demo seed/purge.
- **Providers behind interfaces:** map style (licensed provider or bundled offline atlas with automatic fallback), geocoder (MapTiler or offline gazetteer), storage (S3-compatible or local disk), rate limiter.
- **Privacy:** server-side image re-encoding that strips EXIF/GPS, approximate locations, scheduled publishing, demo content flagging.
- **Quality gates:** strict TypeScript, ESLint (with an architecture boundary rule), 121 unit/integration tests, a 48-test Playwright end-to-end suite (including axe WCAG 2.2 AA audits of every page and a phone-width overflow check), contrast-tested design tokens.
- **Docs:** README, architecture, decisions, database, deployment, `.env.example`.

### Known limitations

- Streets, POIs and labels need a licensed map provider; without one the map is a country-level atlas.
- Rate limits are per server instance (in-memory).
- No passkeys or self-service password recovery (re-run `npm run setup:owner`).
- Un-prerendered place URLs that do not exist return the friendly not-found page with status 200 and `noindex` (see docs/decisions.md §4).
- The MapTiler, hosted PostgreSQL and S3/R2 adapters have not been exercised against live accounts.
