import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A tiny, dependency-free renderer for the light markdown our AI answers emit:
 * **bold**, `inline code`, numbered and bulleted lists, [1] citation markers,
 * and blank-line spacing. It is NOT a full markdown parser - just enough to make
 * an answer scannable (highlighted list numbers, real bold) instead of showing
 * raw asterisks. Shared by the chat and the Ctrl+K search answer.
 */

const HEADER_LINE_RE = /^#{1,6}\s+(.*)$/;
const NUMBERED_LINE_RE = /^\s*(\d+)\.\s+(.*)$/;
const BULLET_LINE_RE = /^\s*[•·\-*]\s+(.*)$/;
// Split a line into runs of **bold**, `code`, [label](url) links, [1] citations,
// and plain text. The link alternative comes before the [1] one so a real link is
// never mistaken for a citation marker.
const INLINE_RE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\[\d+\])/g;
const LINK_RE = /^\[([^\]]+)\]\(([^)]+)\)$/;

// Only same-origin app paths ("/campaigns") and explicit http(s) URLs are allowed
// as link targets. Anything else (javascript:, data:, mailto crafted by the model)
// is rendered as plain text, never as a live link.
const safeHref = (url: string): string | null => {
  const trimmed = url.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return null;
};

export type MarkdownCitation = { url: string; title?: string };

/** Render inline emphasis / code / citation markers within a single line. */
function renderInline(
  text: string,
  citations?: MarkdownCitation[]
): ReactNode[] {
  return text
    .split(INLINE_RE)
    .filter((part) => part.length > 0)
    .map((part, index) => {
      const key = `${index}-${part.slice(0, 6)}`;
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={key} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={key}
            className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      const link = LINK_RE.exec(part);
      if (link) {
        const [, label, rawUrl] = link;
        const href = safeHref(rawUrl);
        // An unsafe or malformed target degrades to the label as plain text.
        if (!href) return <span key={key}>{label}</span>;
        const external = /^https?:\/\//i.test(href);
        return (
          <a
            key={key}
            href={href}
            {...(external
              ? { target: "_blank", rel: "noreferrer noopener" }
              : {})}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {label}
          </a>
        );
      }
      if (/^\[\d+\]$/.test(part)) {
        const n = Number(part.slice(1, -1));
        const citation = citations?.[n - 1];
        // A citation marker is only useful as a link to its source. Without a
        // matching source it is just a stray "1", so drop it.
        if (!citation) return null;
        return (
          <a
            key={key}
            href={citation.url}
            target="_blank"
            rel="noreferrer noopener"
            title={citation.title ?? citation.url}
            className="ml-0.5 rounded bg-primary/15 px-1 align-super text-[10px] font-medium text-primary underline-offset-2 hover:underline"
          >
            {n}
          </a>
        );
      }
      return <span key={key}>{part}</span>;
    });
}

export function MarkdownLite({
  text,
  className,
  citations,
}: {
  text: string;
  className?: string;
  citations?: MarkdownCitation[];
}) {
  const lines = text.split("\n");
  return (
    <div className={cn("space-y-2 leading-6", className)}>
      {lines.map((line, index) => {
        const key = `ln-${index}`;
        if (line.trim().length === 0) {
          return <div key={key} className="h-1" aria-hidden="true" />;
        }
        const header = HEADER_LINE_RE.exec(line);
        if (header) {
          return (
            <p key={key} className="pt-1 font-semibold text-foreground">
              {renderInline(header[1], citations)}
            </p>
          );
        }
        const numbered = NUMBERED_LINE_RE.exec(line);
        if (numbered) {
          return (
            <div key={key} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-md bg-primary/15 px-1.5 text-xs font-semibold tabular-nums text-primary">
                {numbered[1]}
              </span>
              <span className="min-w-0 flex-1">
                {renderInline(numbered[2], citations)}
              </span>
            </div>
          );
        }
        const bullet = BULLET_LINE_RE.exec(line);
        if (bullet) {
          return (
            <div key={key} className="flex items-start gap-2.5 pl-1">
              <span
                className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                {renderInline(bullet[1], citations)}
              </span>
            </div>
          );
        }
        return (
          <p key={key} className="whitespace-pre-wrap">
            {renderInline(line, citations)}
          </p>
        );
      })}
    </div>
  );
}

export default MarkdownLite;
