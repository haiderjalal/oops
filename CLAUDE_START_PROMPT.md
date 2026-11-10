# Paste this into Claude Code

Build my personal travel website called **Oops, I Traveled Again!** using the `CLAUDE.md` in this repository as the mandatory specification. The website is an interactive travel atlas and personal photo journal, not a generic tourism booking site.

**Core visual experience:** editorial scrapbook styling; ocean-blue real 3D globe that smoothly zooms to real streets; custom coral pins for countries, cities, coffee shops, restaurants and attractions; floating postcard previews; funny travel facts and passport stamps; desktop side panel and mobile bottom sheet. Make it visually impressive, playful, polished and fast. The prototype `index.html` in this package is the visual direction, not production code. Replace its demo data and map integration with the architecture in CLAUDE.md.

**Functionality:** real map provider and real geocoder; place lookup and pin repositioning; owner-only secure dashboard to create entries, upload photos, write stories and captions, organize albums/trips, and publish or unpublish; public destination pages, timeline, passport/stats, bucket list, and search/filter functionality. Public visitors can interact but cannot modify the content.

**Technology:** Next.js App Router, TypeScript strict, Tailwind, MapLibre GL JS (modern globe projection), PostgreSQL, server-enforced authentication, object storage/CDN. Verify current APIs before integrating. Keep external providers configurable via environment variables. Never use MapLibre demo tiles as production map data.

**Performance & engineering:** SEO-friendly server-rendered pages; lazy-load map and nonessential images; optimize image delivery and caching; keep modular, feature-based folders; use Zod validation, tests, accessibility, responsive design, reduced-motion support, and privacy defaults. Meet the quality gates in CLAUDE.md.

**How to proceed:** First inspect the repo and summarize your implementation plan and file architecture. Then build each milestone end-to-end, running typecheck, lint, tests and production build. If external API keys are unavailable, create functioning provider interfaces and `.env.example` instructions, and clearly identify the parts that require credentials. Do not pretend placeholder content is my actual travel history. Deliver a polished, working app plus setup/deployment README.
