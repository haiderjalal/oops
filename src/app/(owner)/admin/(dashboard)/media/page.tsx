import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PhotoDeleteButton } from "@/components/admin/PhotoDeleteButton";
import { Pill } from "@/components/ui/Pill";
import { ROUTES } from "@/constants/routes";
import { getMediaLibrary } from "@/features/admin/queries";

export const metadata: Metadata = { title: "Photos" };

function formatBytes(bytes: number): string {
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default async function MediaPage() {
  const library = await getMediaLibrary();
  const unattached = library.filter((entry) => !entry.placeId).length;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-4xl">Photo library</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Every photo you&rsquo;ve uploaded. Add photos to a place from its editor. Photos not used
          anywhere ({unattached}) can be deleted here to save storage.
        </p>
      </header>

      {library.length === 0 ? (
        <div className="postcard p-8 text-center">
          <p className="text-ink-soft">No photos yet. Upload some from a place&rsquo;s editor.</p>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {library.map(({ view, photo, placeId, placeTitle }) => (
            <li key={photo.id} className="postcard flex flex-col overflow-hidden">
              <div className="relative aspect-[4/3] bg-parchment-deep">
                <Image
                  src={view.thumbUrl}
                  alt={view.alt || "Photo without a description"}
                  fill
                  sizes="(min-width: 1024px) 22rem, 46vw"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {placeId ? (
                    <Pill tone="ocean">
                      <Link
                        href={ROUTES.admin.editPlace(placeId)}
                        className="underline-offset-2 hover:underline"
                      >
                        {placeTitle}
                      </Link>
                    </Pill>
                  ) : (
                    <Pill tone="sunrise">Not used yet</Pill>
                  )}
                </div>
                <p className="text-xs text-ink-muted">
                  {photo.width}×{photo.height} · {formatBytes(photo.bytes)}
                </p>
                {!placeId ? (
                  <div className="mt-auto">
                    <PhotoDeleteButton
                      id={photo.id}
                      label={photo.storageKey.split("/").pop() ?? "photo"}
                    />
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
