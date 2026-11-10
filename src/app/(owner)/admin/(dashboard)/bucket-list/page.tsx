import type { Metadata } from "next";

import { BucketManager } from "@/components/admin/BucketManager";
import { getAdminBucketItems, getLinkablePlaces } from "@/features/admin/queries";

export const metadata: Metadata = { title: "Bucket list" };

export default async function AdminBucketListPage() {
  const [records, linkablePlaces] = await Promise.all([getAdminBucketItems(), getLinkablePlaces()]);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-4xl">Bucket list</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Places you want to visit. They appear on the public bucket-list page — clearly separate
          from where you&rsquo;ve been, and never counted in the passport stats.
        </p>
      </header>
      <BucketManager
        linkablePlaces={linkablePlaces}
        entries={records.map(({ item, linkedPlace }) => ({
          id: item.id,
          isDemo: item.isDemo,
          linkedTitle: linkedPlace?.title ?? null,
          values: {
            placeName: item.placeName,
            lat: item.lat,
            lng: item.lng,
            countryCode: item.countryCode ?? "",
            countryName: item.countryName ?? "",
            geocoderProvider: item.geocoderProvider ?? "",
            providerPlaceId: item.providerPlaceId ?? "",
            note: item.note,
            status: item.status,
            linkedPlaceId: item.linkedPlaceId ?? "",
          },
        }))}
      />
    </div>
  );
}
