import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { LoginForm } from "@/components/admin/LoginForm";
import { PinGlyph, PlaneTrail } from "@/components/shared/Doodles";
import { Skeleton } from "@/components/ui/Skeleton";
import { getAuthConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Owner sign-in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="grid min-h-dvh place-items-center px-4 py-12 outline-none"
    >
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 flex items-center justify-center gap-2 font-display text-xl font-extrabold"
        >
          <PinGlyph className="h-8 w-6" />
          Oops, I Traveled Again!
        </Link>

        <div className="postcard airmail relative p-7 pt-9 sm:p-9 sm:pt-11">
          <PlaneTrail className="pointer-events-none absolute -top-8 right-4 h-16 w-40 text-coral/60" />
          <h1 className="text-3xl">Owner sign-in</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Only the site owner can create, edit or publish places. Visitors can browse freely
            without an account.
          </p>
          <Suspense fallback={<Skeleton className="mt-6 h-48 w-full" />}>
            <LoginPanel />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-xs text-ink-muted">
          <Link href="/" className="underline underline-offset-4">
            ← Back to the public site
          </Link>
        </p>
      </div>
    </main>
  );
}

/** Read per request (not at build time) so setting up the owner never needs a rebuild. */
async function LoginPanel() {
  await connection();
  const auth = getAuthConfig();

  if (!auth.configured) {
    return (
      <div
        role="alert"
        className="mt-6 rounded-xl border border-sunrise-deep/30 bg-sunrise/30 p-4 text-sm leading-relaxed"
      >
        <p className="font-bold">Sign-in isn&rsquo;t configured yet.</p>
        <p className="mt-1">
          Run <code className="rounded bg-ink/10 px-1.5 py-0.5">npm run setup:owner</code> and
          restart the server. See the README for details.
        </p>
      </div>
    );
  }
  return <LoginForm mfaEnabled={Boolean(auth.totpSecret)} />;
}
