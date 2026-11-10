/** Runs once when the Node.js server starts (not during `next build`). */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { assertRuntimeConfig } = await import("@/lib/startup");
  assertRuntimeConfig();
}
