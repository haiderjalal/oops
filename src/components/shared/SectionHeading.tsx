import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

import { Squiggle } from "./Doodles";

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  /** Heading level to render. Pages own the single <h1>. */
  as?: "h1" | "h2" | "h3";
  align?: "left" | "center";
  className?: string;
  actions?: ReactNode;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  as: Tag = "h2",
  align = "left",
  className,
  actions,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "items-center text-center sm:flex-col sm:items-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow ? (
          <p className="mb-3 text-xs font-extrabold tracking-[0.22em] text-coral-deep uppercase">
            <span aria-hidden="true">✳ </span>
            {eyebrow}
          </p>
        ) : null}
        <Tag
          className={cn(Tag === "h1" ? "text-4xl sm:text-5xl lg:text-6xl" : "text-3xl sm:text-4xl")}
        >
          {title}
        </Tag>
        <Squiggle className="mt-3 h-2.5 w-28 text-coral" />
        {description ? (
          <p className="mt-4 text-base leading-relaxed text-ink-soft sm:text-lg">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
