import type { Metadata } from "next";
import Link from "next/link";

import { PlaceForm } from "@/components/admin/PlaceForm";
import { ROUTES } from "@/constants/routes";
import { getTripOptions } from "@/features/admin/queries";
import { emptyPlaceInput } from "@/features/places/schema";
import { getClientMapConfig } from "@/lib/config";

export const metadata: Metadata = { title: "New place" };

export default async function NewPlacePage() {
  const trips = await getTripOptions();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <Link
          href={ROUTES.admin.root}
          className="text-sm font-bold text-ink-muted underline underline-offset-4"
        >
          ← Dashboard
        </Link>
        <h1 className="mt-3 text-4xl">New place</h1>
        <p className="mt-2 text-ink-soft">
          Search for it, drop a pin, tell the story. Save as a draft whenever you like.
        </p>
      </header>
      <PlaceForm
        initial={emptyPlaceInput()}
        initialPhotos={[]}
        trips={trips}
        mapConfig={getClientMapConfig()}
      />
    </div>
  );
}
