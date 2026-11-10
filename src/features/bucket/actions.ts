"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import type { ActionResult } from "@/lib/errors";
import { runOwnerAction } from "@/lib/actions";

import { CACHE_TAGS } from "@/features/places/cacheTags";

import { bucketItemInputSchema } from "./schema";
import { createBucketItem, removeBucketItem, updateBucketItem } from "./service";

const saveSchema = z.object({ id: z.uuid().optional(), values: bucketItemInputSchema });

export async function saveBucketItemAction(
  payload: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runOwnerAction({
    name: "saveBucketItem",
    schema: saveSchema,
    input: payload,
    handler: async ({ id, values }) => {
      const db = await getDb();
      const saved = id
        ? await updateBucketItem(db, id, values)
        : await createBucketItem(db, values);
      updateTag(CACHE_TAGS.bucket);
      return saved;
    },
  });
}

export async function deleteBucketItemAction(payload: unknown): Promise<ActionResult<undefined>> {
  return runOwnerAction({
    name: "deleteBucketItem",
    schema: z.object({ id: z.uuid() }),
    input: payload,
    handler: async ({ id }) => {
      await removeBucketItem(await getDb(), id);
      updateTag(CACHE_TAGS.bucket);
      return undefined;
    },
  });
}
