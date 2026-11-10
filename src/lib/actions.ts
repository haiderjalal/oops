import "server-only";

import type { ZodType } from "zod";

import { assertOwner, type OwnerSession } from "@/lib/auth/session";
import { type ActionResult, AppError, actionError, actionOk } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** Maps Zod issues to `{ "photos.0.alt": ["message"] }` so forms can show errors beside fields. */
export function fieldErrorsOf(
  issues: readonly { path: PropertyKey[]; message: string }[],
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "_form";
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
}

/**
 * The one way an owner-only server action runs:
 *   1. verify the signed-in owner on the server (never trust the client),
 *   2. validate the input with the shared Zod schema,
 *   3. run the handler,
 *   4. turn expected errors into friendly messages and log unexpected ones.
 * `redirect()` must be called by the caller *after* this returns, since it works by throwing.
 */
export async function runOwnerAction<TSchema extends ZodType, TResult>(options: {
  name: string;
  schema: TSchema;
  input: unknown;
  handler: (value: TSchema["_zod"]["output"], session: OwnerSession) => Promise<TResult>;
}): Promise<ActionResult<TResult>> {
  try {
    const session = await assertOwner();

    const parsed = options.schema.safeParse(options.input);
    if (!parsed.success) {
      return actionError("Please fix the highlighted fields.", fieldErrorsOf(parsed.error.issues));
    }

    return actionOk(await options.handler(parsed.data, session));
  } catch (error) {
    if (error instanceof AppError) {
      if (error.code !== "validation" && error.code !== "conflict" && error.code !== "not_found") {
        logger.warn(`${options.name} refused`, { code: error.code });
      }
      return actionError(error.userMessage);
    }
    logger.error(`${options.name} failed`, { error });
    return actionError("Something went wrong on our side. Nothing was lost — please try again.");
  }
}
