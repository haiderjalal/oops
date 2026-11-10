"use client";

import { type KeyboardEvent, useState } from "react";
import { X } from "lucide-react";

import { MAX_TAGS_PER_PLACE } from "@/features/places/schema";
import { Input } from "@/components/ui/fields";
import { Pill } from "@/components/ui/Pill";

interface TagInputProps {
  id: string;
  value: string[];
  onChange: (tags: string[]) => void;
  "aria-describedby"?: string | undefined;
}

/** Type a tag and press Enter or comma. Backspace on an empty box removes the last one. */
export function TagInput({ id, value, onChange, "aria-describedby": describedBy }: TagInputProps) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const tag = raw.trim().replace(/^#/, "").slice(0, 32);
    setDraft("");
    if (!tag || value.some((existing) => existing.toLowerCase() === tag.toLowerCase())) return;
    if (value.length >= MAX_TAGS_PER_PLACE) return;
    onChange([...value, tag]);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(draft);
    } else if (event.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Tags">
          {value.map((tag) => (
            <li key={tag}>
              <Pill tone="ocean" className="gap-1 pr-1.5">
                #{tag}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((item) => item !== tag))}
                  aria-label={`Remove tag ${tag}`}
                  className="grid size-5 place-items-center rounded-full hover:bg-ocean/15"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </Pill>
            </li>
          ))}
        </ul>
      ) : null}
      <Input
        id={id}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => commit(draft)}
        placeholder="coffee, cats, wrong-turns…"
        aria-describedby={describedBy}
        maxLength={32}
      />
    </div>
  );
}
