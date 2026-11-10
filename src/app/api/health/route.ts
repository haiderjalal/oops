import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { connection } from "next/server";

import { getDb } from "@/lib/db/client";
import { logger } from "@/lib/logger";

/** Liveness + database reachability for uptime monitors. Reveals nothing sensitive. */
export async function GET() {
  await connection(); // always evaluated per request, never prerendered
  try {
    await (await getDb()).execute(sql`select 1`);
    return NextResponse.json(
      { status: "ok", database: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logger.error("Health check: database unreachable", { error });
    return NextResponse.json(
      { status: "degraded", database: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
