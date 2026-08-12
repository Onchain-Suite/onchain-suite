"use client";

import {
  CheckIcon,
  ClipboardIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/ui/button";
import { Label } from "@/ui/label";

/**
 * Pretty-print a one-line `<script … ></script>` embed onto indented lines so
 * it reads like something you'd hand-write. Anything that isn't a script tag is
 * returned trimmed but untouched.
 */
function formatEmbed(code: string): string {
  const trimmed = code.trim();
  const match = /^<script\s+([\s\S]*?)\s*>\s*<\/script>$/i.exec(trimmed);
  if (!match) return trimmed;
  const attrs = match[1].match(/[\w-]+(?:="[^"]*")?/g) ?? [];
  if (attrs.length === 0) return trimmed;
  return `<script\n${attrs.map((a) => `  ${a}`).join("\n")}\n></script>`;
}

/** Light syntax highlighting for the script-tag embed, theme-token colored. */
function HighlightedCode({ code }: { code: string }) {
  const lines = useMemo(() => formatEmbed(code).split("\n"), [code]);
  return (
    <pre className="max-h-56 overflow-auto rounded-lg border border-border bg-muted/40 p-3.5 font-mono text-xs leading-6">
      <code>
        {lines.map((line, i) => {
          // Static, never-reordered code lines - index key is correct here.
          // eslint-disable-next-line react/no-array-index-key
          return <div key={i}>{renderLine(line)}</div>;
        })}
      </code>
    </pre>
  );
}

/** Colorize one line: tag punctuation, attribute names, and string values. */
function renderLine(line: string) {
  // Tag open/close lines (e.g. "<script", "></script>").
  if (/^\s*<\/?[\w>/]/.test(line) && !line.includes("=")) {
    return <span className="text-muted-foreground">{line || " "}</span>;
  }
  // Attribute line: `  name="value"` or a bare `  async`.
  const attr = /^(\s*)([\w-]+)(?:(=)("[^"]*"))?$/.exec(line);
  if (attr) {
    const [, indent, name, eq, value] = attr;
    return (
      <>
        {indent}
        <span className="text-sky-600 dark:text-sky-400">{name}</span>
        {eq ? (
          <>
            <span className="text-muted-foreground">=</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              {value}
            </span>
          </>
        ) : null}
      </>
    );
  }
  return <span className="text-foreground">{line || " "}</span>;
}

/** Embed snippet + submit URL with copy affordances. */
export function EmbedSnippet({
  embedCode,
  submitUrl,
}: {
  embedCode: string;
  submitUrl: string;
}) {
  const [copied, setCopied] = useState<"embed" | "url" | null>(null);

  const copy = useCallback((which: "embed" | "url", value: string) => {
    navigator.clipboard.writeText(value).catch(() => undefined);
    setCopied(which);
    toast.success(
      which === "embed" ? "Embed code copied" : "Submit URL copied"
    );
    window.setTimeout(() => setCopied(null), 1500);
  }, []);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Embed snippet</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copy("embed", embedCode)}
          >
            {copied === "embed" ? (
              <CheckIcon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ClipboardIcon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            )}
            Copy
          </Button>
        </div>
        <HighlightedCode code={embedCode} />
        <p className="text-xs text-muted-foreground">
          Drop this on any site to start capturing wallets.
        </p>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Submit URL</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copy("url", submitUrl)}
          >
            {copied === "url" ? (
              <CheckIcon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <LinkIcon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            )}
            Copy
          </Button>
        </div>
        <code className="block truncate rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs text-foreground">
          {submitUrl}
        </code>
      </div>
    </div>
  );
}
