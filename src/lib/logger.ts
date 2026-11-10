/**
 * Minimal structured logger. JSON lines in production (easy to ship to any log drain),
 * readable output in development. Sensitive keys are redacted before anything is printed.
 */

type Level = "debug" | "info" | "warn" | "error";
type Context = Record<string, unknown>;

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const SENSITIVE_KEY = /pass(word)?|secret|token|authorization|cookie|api[-_]?key|totp/i;
const MAX_DEPTH = 4;

function minLevel(): Level {
  const configured = process.env.LOG_LEVEL;
  if (
    configured === "debug" ||
    configured === "info" ||
    configured === "warn" ||
    configured === "error"
  ) {
    return configured;
  }
  return process.env.NODE_ENV === "test" ? "error" : "info";
}

export function redact(value: unknown, depth = 0): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[truncated]";
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    output[key] = SENSITIVE_KEY.test(key) ? "[redacted]" : redact(entry, depth + 1);
  }
  return output;
}

function write(level: Level, message: string, context?: Context): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel()]) return;

  const safeContext = context ? (redact(context) as Context) : undefined;
  const sink = level === "error" ? console.error : level === "warn" ? console.warn : console.log;

  if (process.env.NODE_ENV === "production") {
    sink(JSON.stringify({ level, time: new Date().toISOString(), message, ...safeContext }));
    return;
  }
  sink(`[${level}] ${message}`, safeContext ?? "");
}

export const logger = {
  debug: (message: string, context?: Context) => write("debug", message, context),
  info: (message: string, context?: Context) => write("info", message, context),
  warn: (message: string, context?: Context) => write("warn", message, context),
  error: (message: string, context?: Context) => write("error", message, context),
};
