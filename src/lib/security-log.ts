import { logger } from "./logger";

/**
 * Events worth a person's attention. Each is logged as a warning under one stable name, so the
 * hosting platform's log search can find every occurrence with `security event` plus the event.
 */
export type SecurityEvent =
  | "login.failed"
  | "login.rate_limited"
  | "session.invalid"
  | "csrf.rejected"
  | "owner_action.refused"
  | "upload.rejected"
  | "upload.rate_limited"
  | "geocode.rate_limited";

/**
 * Records a security-relevant event. Details must not contain secrets or personal data beyond the
 * client address; the structured logger also redacts keys that look sensitive.
 */
export function logSecurityEvent(
  event: SecurityEvent,
  details: Record<string, unknown> = {},
): void {
  logger.warn("security event", { event, ...details });
}
