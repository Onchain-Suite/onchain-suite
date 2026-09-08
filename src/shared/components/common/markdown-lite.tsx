import { type ReactNode, useMemo } from "react";

import { cn } from "@/lib/utils";

import { CopyButton } from "./copy-button";

/**
 * A tiny, dependency-free renderer for the light markdown our AI answers emit:
 * **bold**, `inline code`, numbered and bulleted lists, [1] citation markers,
 * fenced ```code``` blocks (with a copy button — e.g. campaign HTML), and
 * blank-line spacing. It is NOT a full markdown parser - just enough to make an
 * answer scannable instead of showing raw asterisks/backticks. With `copyable`
 * it also offers a one-click copy of the whole answer (for long-form articles).
 * Shared by the chat and the Ctrl+K search answer.
 */

const HEADER_LINE_RE = /^#{1,6}\s+(.*)$/;
const NUMBERED_LINE_RE = /^\s*(\d+)\.\s+(.*)$/;
const BULLET_LINE_RE = /^\s*[•·\-*]\s+(.*)$/;
// A fenced code block opens with ```lang (language optional) and closes with ```.
const FENCE_OPEN_RE = /^\s*```(\w*)\s*$/;
const FENCE_CLOSE_RE = /^\s*```\s*$/;
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

type Block =
  | { type: "code"; lang: string; code: string }
  | { type: "markdown"; text: string };

/**
 * Split raw text into fenced code blocks and the markdown between them. A code
 * block runs from a ```-fence line to its closing ``` (or end of text). This is
 * what lets HTML the agent emits render as a copyable block rather than a wall
 * of backticked lines.
 */
function splitBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let md: string[] = [];
  const flushMd = () => {
    if (md.length > 0) {
      blocks.push({ type: "markdown", text: md.join("\n") });
      md = [];
    }
  };
  let i = 0;
  while (i < lines.length) {
    const open = FENCE_OPEN_RE.exec(lines[i]);
    if (open) {
      flushMd();
      const lang = open[1] ?? "";
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !FENCE_CLOSE_RE.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1; // consume the closing fence (or fall off the end)
      blocks.push({ type: "code", lang, code: code.join("\n") });
    } else {
      md.push(lines[i]);
      i += 1;
    }
  }
  flushMd();
  return blocks;
}

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

/** Render one markdown segment (no code fences) line by line. */
function renderMarkdownLines(
  text: string,
  citations?: MarkdownCitation[]
): ReactNode[] {
  return text.split("\n").map((line, index) => {
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
  });
}

/** A fenced code block (e.g. campaign HTML) with a language tag and a copy
 * button, scrollable horizontally so long lines never break the layout. */
function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const label = lang ? lang.toUpperCase() : "CODE";
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/40">
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <CopyButton value={code} label={`Copy ${lang || "code"}`} />
      </div>
      <pre className="overflow-x-auto p-3">
        <code className="font-mono text-xs leading-5 text-foreground">
          {code}
        </code>
      </pre>
    </div>
  );
}

export function MarkdownLite({
  text,
  className,
  citations,
  copyable = false,
}: {
  text: string;
  className?: string;
  citations?: MarkdownCitation[];
  /** Adds a one-click "copy the whole answer" affordance — for long-form
   * article answers the user wants to lift wholesale. Off by default. */
  copyable?: boolean;
}) {
  // Bake a stable key per block in the memo (not the render) so the ordered,
  // non-reordering block list keys off identity without an inline array index.
  const blocks = useMemo(
    () =>
      splitBlocks(text).map((block, index) => ({
        ...block,
        key: `b-${index}`,
      })),
    [text]
  );
  const body = (
    <div className={cn("space-y-2 leading-6", className)}>
      {blocks.map((block) =>
        block.type === "code" ? (
          <CodeBlock key={block.key} lang={block.lang} code={block.code} />
        ) : (
          <div key={block.key} className="space-y-2">
            {renderMarkdownLines(block.text, citations)}
          </div>
        )
      )}
    </div>
  );

  if (!copyable || text.trim().length === 0) return body;

  // Copy-the-article affordance: a subtle top-right button (like copying code),
  // always present so it's reachable on touch, brighter on hover.
  return (
    <div className="group relative">
      <div className="absolute right-0 top-0 z-10">
        <CopyButton
          value={text}
          label="Copy answer"
          className="opacity-60 group-hover:opacity-100"
        />
      </div>
      {body}
    </div>
  );
}

export default MarkdownLite;
