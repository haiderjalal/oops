/**
 * Checks the environment against production requirements. Prints names and problems only; values
 * are never shown. Run: npm run check:env   (reads .env.local when it exists)
 */
import { checkEnvironment } from "../src/lib/env-check";

const issues = checkEnvironment(process.env);
const errors = issues.filter((issue) => issue.level === "error");
const warnings = issues.filter((issue) => issue.level === "warn");

if (issues.length === 0) {
  console.log("✓ Environment passes every production check.");
  process.exit(0);
}

for (const issue of issues) {
  const mark = issue.level === "error" ? "✗ error  " : "! warning";
  console.log(`${mark}  ${issue.name}: ${issue.message}`);
}
console.log(`\n${errors.length} error(s), ${warnings.length} warning(s).`);
process.exit(errors.length > 0 ? 1 : 0);
