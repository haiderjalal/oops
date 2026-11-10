import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Production code should use the structured logger (src/lib/logger.ts).
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
    },
  },
  {
    // Architecture boundary: UI never talks to the database or repositories directly.
    // Components → (server components / actions) → queries → repositories → db.
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/db", "@/lib/db/*", "**/repository", "**/*.repository"],
              message:
                "UI components must not import the database layer. Go through a query or an action.",
            },
          ],
        },
      ],
    },
  },
  {
    // The logger is the one sanctioned place that writes to the console.
    files: [
      "scripts/**/*.ts",
      "src/tests/**/*.{ts,tsx}",
      "playwright.config.ts",
      "src/lib/logger.ts",
    ],
    rules: { "no-console": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".data/**",
    "drizzle/**",
    "playwright-report/**",
    "test-results/**",
    "coverage/**",
    "index.html",
  ]),
]);

export default eslintConfig;
