import { Star } from "lucide-react";

import { cn } from "@/utils/cn";

interface StarRatingProps {
  /** 1–5. Null renders nothing: an unrated place never shows empty stars. */
  rating: number | null;
  className?: string;
}

export function StarRating({ rating, className }: StarRatingProps) {
  if (!rating) return null;
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`Rated ${rating} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          aria-hidden="true"
          className={cn(
            "size-4",
            value <= rating ? "fill-sunrise stroke-sunrise-deep" : "fill-transparent stroke-line",
          )}
          strokeWidth={1.8}
        />
      ))}
    </span>
  );
}
