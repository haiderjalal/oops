/** Typed application errors. User-facing messages are safe to display; `cause` is for logs only. */

export type ErrorCode =
  | "unauthorized"
  | "validation"
  | "not_found"
  | "rate_limited"
  | "config"
  | "conflict"
  | "upstream"
  | "internal";

export class AppError extends Error {
  readonly code: ErrorCode;
  /** Message that is safe to show to a visitor or the owner. */
  readonly userMessage: string;
  readonly status: number;

  constructor(
    code: ErrorCode,
    userMessage: string,
    options?: { status?: number; cause?: unknown },
  ) {
    super(userMessage, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.userMessage = userMessage;
    this.status = options?.status ?? defaultStatus(code);
  }
}

function defaultStatus(code: ErrorCode): number {
  switch (code) {
    case "unauthorized":
      return 401;
    case "validation":
      return 400;
    case "not_found":
      return 404;
    case "rate_limited":
      return 429;
    case "conflict":
      return 409;
    case "upstream":
      return 502;
    case "config":
    case "internal":
      return 500;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Please sign in to continue.") {
    super("unauthorized", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "We couldn't find that.") {
    super("not_found", message);
  }
}

export class RateLimitError extends AppError {
  readonly retryAfterSeconds: number;

  constructor(
    retryAfterSeconds: number,
    message = "Too many attempts. Please wait a moment and try again.",
  ) {
    super("rate_limited", message);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class ConfigError extends AppError {
  constructor(message: string) {
    super("config", message);
  }
}

/** Result type returned by every server action so forms can render field-level feedback. */
export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionError(
  error: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return fieldErrors ? { ok: false, error, fieldErrors } : { ok: false, error };
}
