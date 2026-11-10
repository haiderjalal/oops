import { NextResponse, connection } from "next/server";
import { z } from "zod";

import { assertOwner } from "@/lib/auth/session";
import { AppError, RateLimitError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getRateLimiter } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/request";
import { getGeocoder } from "@/features/search/provider";

const querySchema = z.object({ q: z.string().trim().min(2).max(120) });

// Geocoding costs money and quota, so it is owner-only, rate limited and debounced by the UI.
const limiter = () => getRateLimiter("geocode", { limit: 40, windowMs: 60_000 });

export async function GET(request: Request) {
  // Per-request and owner-specific: never prerender this at build time.
  await connection();

  try {
    assertSameOrigin(request);
    const session = await assertOwner();

    const parsed = querySchema.safeParse({ q: new URL(request.url).searchParams.get("q") });
    if (!parsed.success) {
      return NextResponse.json(
        { results: [], error: "Type at least two characters." },
        { status: 400 },
      );
    }

    const check = limiter().check(session.email);
    if (!check.ok)
      throw new RateLimitError(check.retryAfterSeconds, "Searching too fast — give it a moment.");

    const geocoder = getGeocoder();
    const results = await geocoder.search(parsed.data.q, { limit: 6, signal: request.signal });
    return NextResponse.json({ results, provider: geocoder.name, production: geocoder.production });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ results: [], error: error.userMessage }, { status: error.status });
    }
    logger.error("Geocode request failed", { error });
    return NextResponse.json(
      { results: [], error: "Search failed. Please try again." },
      { status: 500 },
    );
  }
}
