"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Dialog } from "@/components/ui/Dialog";
import type { PhotoView } from "@/types/domain";

interface PhotoGalleryProps {
  photos: readonly PhotoView[];
  /** Title of the place, used to name the lightbox for screen readers. */
  title: string;
}

/**
 * Photo grid with a lightbox. Thumbnails are lazy-loaded at their displayed size; the full image
 * is only fetched when the lightbox opens. The lightbox is a native modal <dialog> with arrow-key
 * navigation, so focus handling, Esc and the mobile back gesture all come from the browser.
 */
export function PhotoGallery({ photos, title }: PhotoGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const step = useCallback(
    (delta: number) =>
      setOpenIndex((index) =>
        index === null ? null : (index + delta + photos.length) % photos.length,
      ),
    [photos.length],
  );

  useEffect(() => {
    if (openIndex === null) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openIndex, step]);

  if (photos.length === 0) return null;
  const current = openIndex === null ? null : photos[openIndex];

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {photos.map((photo, index) => (
          <li
            key={photo.id}
            className={index === 0 && photos.length > 2 ? "col-span-2 row-span-2" : undefined}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-label={`Open photo ${index + 1} of ${photos.length}: ${photo.alt}`}
              className="postcard group relative block aspect-[4/3] h-full w-full overflow-hidden p-1.5"
            >
              <span className="relative block h-full w-full overflow-hidden rounded-[0.8rem]">
                <Image
                  src={photo.thumbUrl}
                  alt=""
                  fill
                  sizes={
                    index === 0 && photos.length > 2
                      ? "(min-width: 768px) 60vw, 92vw"
                      : "(min-width: 768px) 30vw, 46vw"
                  }
                  loading="lazy"
                  placeholder={photo.blurDataUrl ? "blur" : "empty"}
                  {...(photo.blurDataUrl ? { blurDataURL: photo.blurDataUrl } : {})}
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Dialog
        open={openIndex !== null}
        onClose={() => setOpenIndex(null)}
        title={`${title} — photo ${(openIndex ?? 0) + 1} of ${photos.length}`}
        hideTitle
        className="w-[min(96vw,64rem)]"
      >
        {current ? (
          <figure className="flex flex-col gap-3">
            <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl bg-ink/5">
              <Image
                src={current.url}
                alt={current.alt}
                fill
                sizes="(min-width: 1024px) 60rem, 96vw"
                className="object-contain"
                {...(current.blurDataUrl
                  ? { placeholder: "blur" as const, blurDataURL: current.blurDataUrl }
                  : {})}
              />
            </div>
            <figcaption className="flex items-start justify-between gap-4">
              <p className="min-h-6 text-sm leading-relaxed text-ink-soft">
                {current.caption ?? current.alt}
              </p>
              {photos.length > 1 ? (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    aria-label="Previous photo"
                    className="grid tap-target place-items-center rounded-full border border-line"
                  >
                    <ChevronLeft className="size-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    aria-label="Next photo"
                    className="grid tap-target place-items-center rounded-full border border-line"
                  >
                    <ChevronRight className="size-5" aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </figcaption>
          </figure>
        ) : null}
      </Dialog>
    </>
  );
}
