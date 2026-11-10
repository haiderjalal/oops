"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link2 } from "lucide-react";

import { Button } from "@/components/ui/Button";

interface CopyLinkButtonProps {
  /** Path (e.g. `/places/belem-tower`); resolved against the current origin when clicked. */
  path: string;
  label?: string;
  size?: "sm" | "md";
}

/** Copies a link to the clipboard and confirms to screen readers and sighted users alike. */
export function CopyLinkButton({ path, label = "Copy link", size = "sm" }: CopyLinkButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    const url = new URL(path, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      setState("failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2200);
  }

  return (
    <>
      <Button type="button" variant="secondary" size={size} onClick={copy}>
        {state === "copied" ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Link2 className="size-4" aria-hidden="true" />
        )}
        {state === "copied" ? "Copied!" : label}
      </Button>
      <span role="status" className="sr-only">
        {state === "copied"
          ? "Link copied to clipboard"
          : state === "failed"
            ? "Couldn't copy the link"
            : ""}
      </span>
    </>
  );
}
