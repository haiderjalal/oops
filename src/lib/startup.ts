import "server-only";

import { getAuthConfig, getDatabaseConfig, getSiteConfig, getStorageConfig } from "@/lib/config";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Fail fast: a production server that lacks its database or object storage refuses to start,
 * instead of limping along and serving whatever was baked into the build. Missing owner
 * sign-in only warns, because the public site works fine without it.
 */
export function assertRuntimeConfig(): void {
  if (!getSiteConfig().isProduction) return;

  const problems: string[] = [];

  const database = getDatabaseConfig();
  if (!database.url && !database.allowEmbedded) {
    problems.push(
      "DATABASE_URL is not set (a PostgreSQL connection string is required in production).",
    );
  }

  try {
    getStorageConfig();
  } catch (error) {
    if (error instanceof ConfigError) problems.push(error.userMessage);
    else throw error;
  }

  if (problems.length > 0) {
    throw new ConfigError(`Refusing to start in production:\n- ${problems.join("\n- ")}`);
  }

  const auth = getAuthConfig();
  if (!auth.configured) {
    logger.warn("Owner sign-in is not configured; the dashboard is unavailable", {
      problems: auth.problems,
    });
  }
}
