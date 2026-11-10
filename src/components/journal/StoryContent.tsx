import type { Components } from "react-markdown";
import Markdown from "react-markdown";

import { cn } from "@/utils/cn";

/**
 * Renders the owner's story. The story is stored as Markdown and rendered with react-markdown,
 * which never injects raw HTML: embedded HTML is dropped (`skipHtml`), unsafe URL schemes such as
 * `javascript:` are stripped by the default URL transform, and images are disallowed (photos come
 * from the gallery, which has alt text and size metadata).
 */

const ALLOWED_ELEMENTS = [
  "p",
  "em",
  "strong",
  "a",
  "ul",
  "ol",
  "li",
  "blockquote",
  "h2",
  "h3",
  "br",
  "hr",
  "code",
];

const components: Components = {
  a({ href, children }) {
    const external = Boolean(href && /^https?:\/\//i.test(href));
    return (
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
      >
        {children}
      </a>
    );
  },
};

interface StoryContentProps {
  markdown: string;
  className?: string;
  /** Adds a decorative drop cap to the first paragraph. */
  dropCap?: boolean;
}

export function StoryContent({ markdown, className, dropCap = false }: StoryContentProps) {
  return (
    <div className={cn("story", dropCap && "story-lede", className)}>
      <Markdown
        skipHtml
        allowedElements={ALLOWED_ELEMENTS}
        unwrapDisallowed
        components={components}
      >
        {markdown}
      </Markdown>
    </div>
  );
}
