import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { requireOwner } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { default: "Owner dashboard", template: "%s · Owner dashboard" },
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl space-y-4 px-4 py-10" aria-busy="true">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      <Gate>{children}</Gate>
    </Suspense>
  );
}

/** Verifies the signed-in owner on the server before anything in the dashboard renders. */
async function Gate({ children }: { children: ReactNode }) {
  const session = await requireOwner();
  return <AdminShell email={session.email}>{children}</AdminShell>;
}
