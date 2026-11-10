/**
 * Interactive owner setup. Creates the sign-in credentials the site needs and writes them to
 * .env.local (which is git-ignored):
 *
 *   OWNER_EMAIL, OWNER_PASSWORD_HASH (scrypt — the password itself is never stored),
 *   AUTH_SECRET (random, signs session cookies), OWNER_TOTP_SECRET (two-factor).
 *
 * Run: npm run setup:owner      (add --rotate-secret to sign everyone out by replacing AUTH_SECRET)
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";

import { hashPassword } from "../src/lib/auth/password";
import { newTotpSecret, totpUri } from "../src/lib/auth/totp";

const ENV_FILE = path.resolve(".env.local");
const MIN_PASSWORD_LENGTH = 12;

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    }),
  );
}

/** Reads a line without echoing it. */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      // Piped input (CI): read one line normally.
      const rl = createInterface({ input: stdin });
      rl.once("line", (line) => {
        rl.close();
        resolve(line);
      });
      return;
    }
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (char: string) => {
      for (const key of char) {
        if (key === "\r" || key === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (key === "\u0003") process.exit(130); // Ctrl+C
        if (key === "\u007f" || key === "\b") value = value.slice(0, -1);
        else value += key;
      }
    };
    stdin.on("data", onData);
  });
}

function readEnvFile(): Map<string, string> {
  const values = new Map<string, string>();
  if (!existsSync(ENV_FILE)) return values;
  for (const line of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (match?.[1]) values.set(match[1], match[2] ?? "");
  }
  return values;
}

/** Replaces or appends KEY=value lines, leaving every other line (comments, other keys) untouched. */
function writeEnvValues(updates: Record<string, string>): void {
  const lines = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8").split(/\r?\n/) : [];
  const remaining = new Map(Object.entries(updates));

  const next = lines.map((line) => {
    const key = /^([A-Z0-9_]+)=/.exec(line)?.[1];
    if (key && remaining.has(key)) {
      const replaced = `${key}=${remaining.get(key)}`;
      remaining.delete(key);
      return replaced;
    }
    return line;
  });

  while (next.length > 0 && next[next.length - 1] === "") next.pop();
  for (const [key, value] of remaining) next.push(`${key}=${value}`);
  writeFileSync(ENV_FILE, `${next.join("\n")}\n`, "utf8");
}

async function main(): Promise<void> {
  const existing = readEnvFile();
  console.log("\n✳ Owner setup — Oops, I Traveled Again!\n");

  const email =
    (await ask(
      `Owner email${existing.get("OWNER_EMAIL") ? ` [${existing.get("OWNER_EMAIL")}]` : ""}: `,
    )) ||
    existing.get("OWNER_EMAIL") ||
    "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error("That doesn't look like an email address.");
    process.exit(1);
  }

  const password = await askHidden(
    `Choose a password (at least ${MIN_PASSWORD_LENGTH} characters): `,
  );
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(
      `Passwords need at least ${MIN_PASSWORD_LENGTH} characters. Try a few random words.`,
    );
    process.exit(1);
  }
  if (password !== (await askHidden("Repeat it: "))) {
    console.error("The passwords didn't match.");
    process.exit(1);
  }

  const rotate = process.argv.includes("--rotate-secret");
  const totpSecret =
    existing.get("OWNER_TOTP_SECRET") && !rotate
      ? (existing.get("OWNER_TOTP_SECRET") as string)
      : newTotpSecret();
  const authSecret =
    existing.get("AUTH_SECRET") && !rotate
      ? (existing.get("AUTH_SECRET") as string)
      : randomBytes(48).toString("base64url");

  writeEnvValues({
    OWNER_EMAIL: email,
    OWNER_PASSWORD_HASH: await hashPassword(password),
    AUTH_SECRET: authSecret,
    OWNER_TOTP_SECRET: totpSecret,
  });

  console.log(`\n✓ Saved to ${path.basename(ENV_FILE)} (never commit this file).`);
  console.log(
    "\nTwo-factor sign-in — add this account to your authenticator app (1Password, Authy, Google Authenticator…):",
  );
  console.log(`  Secret key : ${totpSecret}`);
  console.log(`  Setup link : ${totpUri({ secret: totpSecret, account: email })}`);
  console.log("\nRestart the dev server, then sign in at /admin/login.\n");
}

main().catch((error: unknown) => {
  console.error("Setup failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
