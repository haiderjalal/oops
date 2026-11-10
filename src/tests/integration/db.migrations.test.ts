import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/lib/db/client";
import { places, trips } from "@/lib/db/schema";

import { createTestDatabase } from "./helpers/testDb";

describe("database migrations (real PostgreSQL via PGlite)", () => {
  let db: Database;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  it("creates every table with row level security enabled", async () => {
    const result: unknown = await db.execute(sql`
      select c.relname, c.relrowsecurity
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
      order by c.relname
    `);
    // postgres.js returns an array, PGlite returns { rows } — normalise.
    const rows = (Array.isArray(result) ? result : (result as { rows: unknown[] }).rows) as {
      relname: string;
      relrowsecurity: boolean;
    }[];
    const names = rows.map((row) => row.relname);
    expect(names).toEqual(
      expect.arrayContaining([
        "places",
        "photos",
        "trips",
        "tags",
        "place_tags",
        "bucket_list_items",
        "site_settings",
      ]),
    );
    expect(rows.every((row) => row.relrowsecurity)).toBe(true);
  });

  it("rejects an invalid slug", async () => {
    await expect(
      db.insert(places).values({ slug: "Not A Slug", title: "x", lat: 1, lng: 1 }),
    ).rejects.toThrow();
  });

  it("rejects out-of-range coordinates", async () => {
    await expect(
      db.insert(places).values({ slug: "bad-lat", title: "x", lat: 91, lng: 1 }),
    ).rejects.toThrow();
    await expect(
      db.insert(places).values({ slug: "bad-lng", title: "x", lat: 1, lng: 181 }),
    ).rejects.toThrow();
  });

  it("refuses to publish a place without a publication timestamp", async () => {
    await expect(
      db.insert(places).values({ slug: "no-ts", title: "x", lat: 1, lng: 1, status: "published" }),
    ).rejects.toThrow();
  });

  it("maintains updated_at in the database", async () => {
    const [created] = await db
      .insert(trips)
      .values({ slug: "trigger-trip", title: "Trigger" })
      .returning();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const [updated] = await db
      .update(trips)
      .set({ title: "Trigger 2" })
      .where(sql`${trips.id} = ${created!.id}`)
      .returning();
    expect(updated!.updatedAt.getTime()).toBeGreaterThan(created!.updatedAt.getTime());
  });
});
