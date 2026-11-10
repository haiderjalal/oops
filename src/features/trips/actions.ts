"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import type { ActionResult } from "@/lib/errors";
import { runOwnerAction } from "@/lib/actions";

import { CACHE_TAGS } from "@/features/places/cacheTags";

import { tripInputSchema } from "./schema";
import { createTrip, removeTrip, updateTrip } from "./service";

function invalidate(): void {
  updateTag(CACHE_TAGS.trips);
  // Trip titles are embedded in place summaries.
  updateTag(CACHE_TAGS.places);
}

const saveSchema = z.object({ id: z.uuid().optional(), values: tripInputSchema });

export async function saveTripAction(
  payload: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  return runOwnerAction({
    name: "saveTrip",
    schema: saveSchema,
    input: payload,
    handler: async ({ id, values }) => {
      const db = await getDb();
      const saved = id ? await updateTrip(db, id, values) : await createTrip(db, values);
      invalidate();
      return saved;
    },
  });
}

export async function deleteTripAction(payload: unknown): Promise<ActionResult<undefined>> {
  return runOwnerAction({
    name: "deleteTrip",
    schema: z.object({ id: z.uuid() }),
    input: payload,
    handler: async ({ id }) => {
      await removeTrip(await getDb(), id);
      invalidate();
      return undefined;
    },
  });
}
