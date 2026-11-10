"use client";

import { type ReactNode, useRef, useState } from "react";
import { Bold, Italic, Link2, List, Quote } from "lucide-react";

import { StoryContent } from "@/components/journal/StoryContent";
import { Textarea } from "@/components/ui/fields";
import { cn } from "@/utils/cn";

interface MarkdownEditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  "aria-describedby"?: string | undefined;
  "aria-invalid"?: boolean | undefined;
}

/**
 * A deliberately small Markdown editor: Write / Preview tabs and five formatting helpers.
 * The preview uses the exact renderer the public page uses, so what you see is what visitors get.
 */
export function MarkdownEditor({ id, value, onChange, ...aria }: MarkdownEditorProps) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const ref = useRef<HTMLTextAreaElement>(null);

  function wrap(before: string, after = before, placeholder = "text") {
    const element = ref.current;
    if (!element) return;
    const { selectionStart, selectionEnd } = element;
    const selected = value.slice(selectionStart, selectionEnd) || placeholder;
    onChange(
      `${value.slice(0, selectionStart)}${before}${selected}${after}${value.slice(selectionEnd)}`,
    );
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(
        selectionStart + before.length,
        selectionStart + before.length + selected.length,
      );
    });
  }

  function prefixLines(prefix: string) {
    const element = ref.current;
    if (!element) return;
    const { selectionStart, selectionEnd } = element;
    const start = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const block = value.slice(start, selectionEnd) || "item";
    const prefixed = block
      .split("\n")
      .map((line) => `${prefix}${line}`)
      .join("\n");
    onChange(`${value.slice(0, start)}${prefixed}${value.slice(selectionEnd)}`);
    requestAnimationFrame(() => element.focus());
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-line bg-parchment-deep/50 px-2 py-1.5">
        <div role="group" aria-label="Editor mode" className="flex gap-1">
          {(["write", "preview"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={tab === mode}
              onClick={() => setTab(mode)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-bold capitalize",
                tab === mode ? "bg-ink text-parchment" : "hover:bg-ink/[0.07]",
              )}
            >
              {mode}
            </button>
          ))}
        </div>
        {tab === "write" ? (
          <div role="group" aria-label="Formatting" className="ml-auto flex gap-0.5">
            <ToolButton label="Bold" onClick={() => wrap("**")}>
              <Bold className="size-4" aria-hidden="true" />
            </ToolButton>
            <ToolButton label="Italic" onClick={() => wrap("*")}>
              <Italic className="size-4" aria-hidden="true" />
            </ToolButton>
            <ToolButton label="Link" onClick={() => wrap("[", "](https://)", "link text")}>
              <Link2 className="size-4" aria-hidden="true" />
            </ToolButton>
            <ToolButton label="Bulleted list" onClick={() => prefixLines("- ")}>
              <List className="size-4" aria-hidden="true" />
            </ToolButton>
            <ToolButton label="Quote" onClick={() => prefixLines("> ")}>
              <Quote className="size-4" aria-hidden="true" />
            </ToolButton>
          </div>
        ) : null}
      </div>

      {tab === "write" ? (
        <Textarea
          ref={ref}
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={14}
          placeholder="What happened? Where did you go wrong? Markdown works: **bold**, *italic*, lists, links…"
          className="rounded-none border-0 font-mono text-[0.9rem] focus-visible:outline-offset-[-3px]"
          {...aria}
        />
      ) : (
        <div className="min-h-64 px-5 py-4" aria-live="polite">
          {value.trim() ? (
            <StoryContent markdown={value} />
          ) : (
            <p className="text-ink-muted">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ToolButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-9 place-items-center rounded-lg hover:bg-ink/[0.07]"
    >
      {children}
    </button>
  );
}
