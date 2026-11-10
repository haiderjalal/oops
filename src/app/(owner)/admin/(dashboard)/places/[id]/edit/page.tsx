import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PlaceForm } from "@/components/admin/PlaceForm";
import { ROUTES } from "@/constants/routes";
import { getPlaceFormData, getTripOptions } from "@/features/admin/queries";
import { getClientMapConfig } from "@/lib/config";

export const metadata: Metadata = { title: "Edit place" };

export default async function EditPlacePage({ params }: PageProps<"/admin/places/[id]/edit">) {
  const parsedId = z.uuid().safeParse((await params).id);
  if (!parsedId.success) notFound();

  const [data, trips] = await Promise.all([getPlaceFormData(parsedId.data), getTripOptions()]);
  if (!data) notFound();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <Link
          href={ROUTES.admin.root}
          className="text-sm font-bold text-ink-muted underline underline-offset-4"
        >
          ← Dashboard
        </Link>
        <h1 className="mt-3 text-4xl">Edit “{data.values.title}”</h1>
      </header>
      {/* `key` resets the form when a different place is opened. */}
      <PlaceForm
        key={data.id}
        placeId={data.id}
        slug={data.slug}
        initial={data.values}
        initialPhotos={data.photos}
        trips={trips}
        mapConfig={getClientMapConfig()}
        isLive={data.isLive}
        deleted={data.deleted}
        isDemo={data.isDemo}
      />
    </div>
  );
}
