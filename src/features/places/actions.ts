"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { purgeDemoContent } from "@/lib/db/seed-demo";
import type { ActionResult } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { runOwnerAction } from "@/lib/actions";

import { CACHE_TAGS } from "./cacheTags";
import { placeIdSchema, placeInputSchema } from "./schema";
import { type SavedPlace, createPlace, deletePlace, restorePlace, updatePlace } from "./service";

/** Everything public pages cache depends on places, trips and bucket links. */
function invalidatePublicContent(): void {
  updateTag(CACHE_TAGS.places);
  updateTag(CACHE_TAGS.trips);
  updateTag(CACHE_TAGS.bucket);
}

const saveSchema = z.object({ id: z.uuid().optional(), values: placeInputSchema });

/** Create (no `id`) or update (with `id`) a place. Publishing, scheduling and privacy all flow through here. */
export async function savePlaceAction(payload: unknown): Promise<ActionResult<SavedPlace>> {
  return runOwnerAction({
    name: "savePlace",
    schema: saveSchema,
    input: payload,
    handler: async ({ id, values }) => {
      const db = await getDb();
      const saved = id ? await updatePlace(db, id, values) : await createPlace(db, values);
      invalidatePublicContent();
      logger.info("Place saved", { id: saved.id, status: saved.status });
      return saved;
    },
  });
}

export async function deletePlaceAction(payload: unknown): Promise<ActionResult<{ slug: string }>> {
  return runOwnerAction({
    name: "deletePlace",
    schema: placeIdSchema,
    input: payload,
    handler: async ({ id }) => {
      const result = await deletePlace(await getDb(), id);
      invalidatePublicContent();
      return result;
    },
  });
}

export async function restorePlaceAction(
  payload: unknown,
): Promise<ActionResult<{ slug: string }>> {
  return runOwnerAction({
    name: "restorePlace",
    schema: placeIdSchema,
    input: payload,
    handler: async ({ id }) => {
      const result = await restorePlace(await getDb(), id);
      invalidatePublicContent();
      return result;
    },
  });
}

/** One click removes every synthetic demo entry; real content is never touched. */
export async function purgeDemoContentAction(): Promise<
  ActionResult<{ places: number; trips: number; bucketItems: number }>
> {
  return runOwnerAction({
    name: "purgeDemoContent",
    schema: z.object({}),
    input: {},
    handler: async () => {
      const removed = await purgeDemoContent(await getDb());
      invalidatePublicContent();
      logger.info("Demo content purged", removed);
      return removed;
    },
  });
}
