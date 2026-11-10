# Deployment, operations and costs

Recommended stack: **Vercel** (hosting) + **managed PostgreSQL** (Neon, Supabase, Railway…) + **S3-compatible storage** (Cloudflare R2, S3, B2…) + **MapTiler** (map style + geocoding). Every one of them is configured purely through environment variables, so swapping a provider never needs a code change.

> What is verified and what is not: the application, database layer, upload pipeline, auth and all public/owner flows are covered by automated tests that run **without** any external account. The adapters for **MapTiler**, **S3/R2** and a **hosted PostgreSQL** follow those providers' documented APIs and have unit tests (response mapping, presigned-URL generation), but have **not been exercised against live accounts** in this repository's test run. Do the "first deploy checklist" below once with your own credentials.

## 1. Accounts and keys

| Need              | Suggested provider                     | Variables                                                          |
| ----------------- | -------------------------------------- | ------------------------------------------------------------------ |
| Hosting           | Vercel (Next.js 16)                    | —                                                                  |
| Database          | Neon / Supabase / Railway (PostgreSQL) | `DATABASE_URL` (pooled URL on serverless)                          |
| Photos            | Cloudflare R2 (or S3, B2, MinIO)       | `STORAGE_DRIVER=s3`, `S3_*`                                        |
| Map tiles + style | MapTiler                               | `MAPTILER_PUBLIC_KEY` (**domain-restricted**), `MAPTILER_STYLE_ID` |
| Place search      | MapTiler Geocoding                     | `MAPTILER_GEOCODING_KEY` (server-side secret)                      |

Create **two** MapTiler keys: a _public_ one restricted to your production domain (it ships to the browser to load tiles) and a _separate server-side_ one for geocoding. Never reuse the geocoding key in the browser.

## 2. Owner credentials

```bash
npm run setup:owner     # writes OWNER_EMAIL, OWNER_PASSWORD_HASH, AUTH_SECRET, OWNER_TOTP_SECRET to .env.local
```

Copy those four values into your host's environment variables. Add the printed authenticator secret to your authenticator app. Production **requires** two-factor.

## 3. Storage bucket (R2 / S3)

1. Create a private bucket. Serve it publicly through a CDN/custom domain or the provider's public URL → that is `S3_PUBLIC_BASE_URL`.
2. Add a **CORS rule** so the browser may upload directly:
   ```json
   [
     {
       "AllowedOrigins": ["https://your-domain.com"],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["content-type", "content-length"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
3. Create an API token limited to that bucket (read, write, delete) → `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`.
4. Enable bucket versioning or a scheduled copy for recoverability.
5. Originals are uploaded under `incoming/` and deleted after processing; add a lifecycle rule to expire `incoming/` after 1 day as a safety net (covers an upload the owner abandons mid-way).

## 4. Deploy

1. Push the repository to GitHub and import it in Vercel (framework: Next.js; build command `npm run build`; install `npm ci`).
2. Add all environment variables (Production). **`DATABASE_URL` must also be available at build time** — pages are prerendered from the database, and a build without it uses an empty in-memory database.
3. Run the migrations once against the production database from your machine:
   ```bash
   DATABASE_URL="postgres://…" npm run db:migrate
   ```
   Add that command to your release process (or a Vercel build step) so every schema change ships with its migration.
4. Deploy. The server **refuses to start** in production if `DATABASE_URL` or the storage settings are missing — that is intentional.

Demo content is hidden in production by default. If you want to see the sample content on a staging deployment, set `SHOW_DEMO_CONTENT=true`, then `npm run db:seed`.

## First deploy checklist

- [ ] `GET /api/health` returns `{"status":"ok","database":"ok"}`.
- [ ] Sign in at `/admin/login` with password **and** authenticator code.
- [ ] Dashboard "Setup check" shows PostgreSQL, object storage, licensed map and real geocoder as connected.
- [ ] Create a place: search for a real café, drag the pin if needed, upload a photo with GPS in its EXIF, publish.
- [ ] Open the public page in a private window: photo loads from your CDN domain; download it and confirm no EXIF (`exiftool photo.webp`).
- [ ] Zoom the map in: streets and POIs appear; attribution is visible bottom-right.
- [ ] `/robots.txt` allows the site and disallows `/admin`; `/sitemap.xml` lists the place.
- [ ] Remove the demo content (dashboard) if it is still there.
- [ ] Run Lighthouse (mobile) on `/` and a place page and record the scores.

## Operations

- **Health:** monitor `GET /api/health` (503 when the database is unreachable).
- **Logs:** structured JSON lines (`level`, `message`, context); secrets and tokens are redacted. Ship them to a log drain.
- **Rate limits** (login, geocoding, upload signing) are in-memory per instance. For several instances, implement `RateLimiter` against a shared store such as Upstash Redis (`src/lib/rate-limit.ts`).
- **Rotating secrets:** `npm run setup:owner -- --rotate-secret` replaces `AUTH_SECRET` (signs everyone out). Changing the password hash also invalidates all sessions.
- **Updating dependencies:** `npm outdated`; run `npm run check && npm run test:e2e` before deploying.

## Cost model

All of these providers have free tiers that comfortably cover a personal journal; check each provider's _current_ pricing page because limits and prices change.

| Service                     | What drives cost          | How this app keeps it low                                                                                                  |
| --------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Map tiles                   | Map loads / tile requests | The map loads lazily (not on every page), only when the visitor's device and connection allow it; list view needs no tiles |
| Geocoding                   | Search requests           | Owner-only, debounced (350 ms), rate limited (40/min), short in-memory dedupe                                              |
| Image storage + egress      | GB stored and served      | Originals are re-encoded to WebP (≤ 2400 px), thumbnails for lists, immutable cache headers, CDN in front                  |
| Image optimisation (Vercel) | Distinct image variants   | Processed WebP is already small; `next/image` only resizes. A custom `loader` for another CDN is a one-file change         |
| Database                    | Storage and compute hours | A few hundred small rows; pooled connections (`max: 5`)                                                                    |
| Vercel functions            | Invocations               | Public pages are static and revalidate every 15 min or on publish; no per-request database work                            |

## Scheduled publishing and caching

Public data is cached and revalidated every 15 minutes, and immediately when the owner saves (`updateTag`). A place scheduled for a future time therefore appears within ~15 minutes of that time.
