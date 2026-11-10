import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StoryContent } from "@/components/journal/StoryContent";
import { redact } from "@/lib/logger";

const render = (markdown: string) => renderToStaticMarkup(<StoryContent markdown={markdown} />);

describe("story rendering is safe against injected HTML", () => {
  it("drops raw HTML and script tags", () => {
    const html = render(
      'Hello <script>alert("xss")</script> <img src=x onerror=alert(1)> <iframe src="//evil"></iframe>',
    );
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<iframe/i);
    expect(html).not.toMatch(/<img/i);
    expect(html).not.toMatch(/onerror/i);
  });

  it("neutralises javascript: and data: links", () => {
    const html = render(
      "[click](javascript:alert(1)) and [data](data:text/html;base64,PHNjcmlwdD4=)",
    );
    expect(html).not.toMatch(/javascript:/i);
    expect(html).not.toMatch(/data:text/i);
  });

  it("does not render images from markdown", () => {
    expect(render("![tracking pixel](https://evil.example/pixel.gif)")).not.toMatch(/<img/i);
  });

  it("renders legitimate formatting and hardens external links", () => {
    const html = render("**bold** and *italic*\n\n- one\n- two\n\n[docs](https://example.com)");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain('rel="noopener noreferrer nofollow"');
    expect(html).toContain('target="_blank"');
  });
});

describe("log redaction", () => {
  it("never prints secrets, tokens, passwords or cookies", () => {
    const safe = redact({
      email: "owner@example.com",
      password: "hunter2",
      nested: {
        apiKey: "k",
        Authorization: "Bearer abc",
        sessionCookie: "c",
        totpSecret: "s",
        fine: 1,
      },
      list: [{ token: "t" }],
    }) as Record<string, unknown>;
    const text = JSON.stringify(safe);
    for (const secret of ["hunter2", "Bearer abc", '"c"', '"s"', '"t"'])
      expect(text).not.toContain(secret);
    expect(text).toContain("owner@example.com");
    expect(text).toContain('"fine":1');
  });
});
