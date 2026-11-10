import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

import { CurlyArrow } from "./Doodles";

interface EmptyStateProps {
  emoji?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Friendly "nothing here yet" panel with a next step — never a blank screen. */
export function EmptyState({ emoji = "🧭", title, children, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "postcard flex flex-col items-center gap-3 border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      <span className="text-5xl" aria-hidden="true">
        {emoji}
      </span>
      <h2 className="text-2xl">{title}</h2>
      {children ? <div className="max-w-md leading-relaxed text-ink-soft">{children}</div> : null}
      <CurlyArrow className="h-10 w-14 text-coral" />
      {action}
    </div>
  );
}
