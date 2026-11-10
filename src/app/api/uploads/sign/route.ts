import { NextResponse } from "next/server";

import { assertOwner } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { AppError, RateLimitError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getRateLimiter } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/request";
import { getStorage } from "@/lib/storage";
import { requestUpload } from "@/features/uploads/service";
import { signRequestSchema } from "@/features/uploads/validation";

const limiter = () => getRateLimiter("upload-sign", { limit: 120, windowMs: 60 * 60_000 });

/** POST { contentType, size } → a short-lived signed upload target. Owner only. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await assertOwner();

    const check = limiter().check(session.email);
    if (!check.ok)
      throw new RateLimitError(
        check.retryAfterSeconds,
        "That's a lot of uploads — try again shortly.",
      );

    const parsed = signRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid upload request." },
        { status: 400 },
      );
    }

    const result = await requestUpload(getStorage(), await getDb(), parsed.data);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.userMessage }, { status: error.status });
    }
    logger.error("Upload signing failed", { error });
    return NextResponse.json(
      { error: "Couldn't start the upload. Please try again." },
      { status: 500 },
    );
  }
}
