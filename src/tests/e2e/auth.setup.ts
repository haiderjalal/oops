import { test as setup } from "@playwright/test";

import { AUTH_FILE, signIn } from "./fixtures";

/**
 * Signs in once through the real form (password + authenticator code) and saves the session.
 * Other tests reuse it — one-time codes are single-use, so a suite that signed in repeatedly
 * would (correctly) be refused by the replay protection.
 */
setup("sign in as the owner", async ({ page }) => {
  await signIn(page);
  await page.context().storageState({ path: AUTH_FILE });
});
