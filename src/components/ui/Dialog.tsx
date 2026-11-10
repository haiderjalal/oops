"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

import { cn } from "@/utils/cn";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Hide the visible title (it still names the dialog for screen readers). */
  hideTitle?: boolean;
  children: ReactNode;
  className?: string;
  /** Allow dismissal by clicking outside. Esc and the mobile back gesture always work. */
  lightDismiss?: boolean;
}

/**
 * Modal built on the native <dialog> element: the browser provides the top layer, inert page,
 * focus containment, Esc / back-gesture dismissal and focus return to the invoker.
 */
export function Dialog({
  open,
  onClose,
  title,
  hideTitle,
  children,
  className,
  lightDismiss = true,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // `closedby` is not in React's types yet; browsers without it still close on Esc.
  const nativeAttributes = (lightDismiss ? { closedby: "any" } : {}) as Record<string, string>;

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      {...nativeAttributes}
      className={cn(
        "m-auto max-h-[92dvh] w-[min(92vw,44rem)] overflow-hidden rounded-3xl border border-line bg-paper p-0 text-ink shadow-2xl",
        "backdrop:bg-ocean-deep/60",
        className,
      )}
    >
      <div className="flex max-h-[92dvh] flex-col">
        <div className="flex items-start justify-between gap-4 px-6 pt-5">
          <h2 id={titleId} className={cn("font-display text-2xl", hideTitle && "sr-only")}>
            {title}
          </h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Close"
            className="ml-auto grid tap-target place-items-center rounded-full text-ink hover:bg-ink/[0.07]"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 pt-2 pb-6">{children}</div>
      </div>
    </dialog>
  );
}
