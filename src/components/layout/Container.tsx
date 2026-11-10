import type { ElementType, HTMLAttributes } from "react";

import { cn } from "@/utils/cn";

interface ContainerProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  /** `wide` for the explorer, `prose` for reading pages. */
  size?: "wide" | "default" | "prose";
}

const SIZES = {
  wide: "max-w-[92rem]",
  default: "max-w-7xl",
  prose: "max-w-3xl",
} as const;

/** One consistent page width and gutter across the whole site. */
export function Container({
  as: Tag = "div",
  size = "default",
  className,
  ...rest
}: ContainerProps) {
  return (
    <Tag className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", SIZES[size], className)} {...rest} />
  );
}
