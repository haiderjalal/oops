"use server";

import { z } from "zod";

import { getDb } from "@/lib/db/client";
import type { ActionResult } from "@/lib/errors";
import { runOwnerAction } from "@/lib/actions";
import { getStorage } from "@/lib/storage";
import type { PhotoView } from "@/types/domain";

import { finalizeUpload, removePhoto } from "./service";
import { finalizeRequestSchema } from "./validation";

/** Step 2 of an upload: the browser has PUT the original; the server verifies and processes it. */
export async function finalizeUploadAction(payload: unknown): Promise<ActionResult<PhotoView>> {
  return runOwnerAction({
    name: "finalizeUpload",
    schema: finalizeRequestSchema,
    input: payload,
    handler: async ({ uploadId }) => finalizeUpload(getStorage(), await getDb(), uploadId),
  });
}

export async function deletePhotoAction(payload: unknown): Promise<ActionResult<undefined>> {
  return runOwnerAction({
    name: "deletePhoto",
    schema: z.object({ id: z.uuid() }),
    input: payload,
    handler: async ({ id }) => {
      await removePhoto(getStorage(), await getDb(), id);
      return undefined;
    },
  });
}
