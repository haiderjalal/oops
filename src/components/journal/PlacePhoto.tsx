import Image from "next/image";

import { PostcardArt } from "@/components/shared/PostcardArt";
import type { PhotoView, PlaceType } from "@/types/domain";
import { cn } from "@/utils/cn";

interface PlacePhotoProps {
  photo: PhotoView | null;
  slug: string;
  type: PlaceType;
  /** Rendered pixel width hint for `sizes`. */
  sizes: string;
  /** Mark the single LCP image on a page. Never combine with lazy loading. */
  eager?: boolean;
  /** Use the small variant (cards, lists) instead of the full-size image. */
  thumb?: boolean;
  className?: string;
}

/**
 * A place's cover photo — or, before one exists, a generated postcard illustration.
 * The parent must be `position: relative` with an explicit size/aspect ratio (no layout shift).
 */
export function PlacePhoto({
  photo,
  slug,
  type,
  sizes,
  eager = false,
  thumb = false,
  className,
}: PlacePhotoProps) {
  if (!photo) return <PostcardArt seed={slug} type={type} className={className} />;

  return (
    <Image
      src={thumb ? photo.thumbUrl : photo.url}
      alt={photo.alt}
      fill
      sizes={sizes}
      className={cn("object-cover", className)}
      placeholder={photo.blurDataUrl ? "blur" : "empty"}
      {...(photo.blurDataUrl ? { blurDataURL: photo.blurDataUrl } : {})}
      {...(eager ? { loading: "eager" as const, fetchPriority: "high" as const } : {})}
    />
  );
}
