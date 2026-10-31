"use client";

import {
  ArrowPathIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { cn, getSelectedOrganizationId } from "@/lib/utils";

import { intelligenceService } from "../../intelligence.service";

interface Turn {
  role: "user" | "assistant";
  text: string;
  error?: boolean;
}

/** Shown before the backend starters load, and if it has none. */
const FALLBACK_STARTERS = [
  "Which Loop drives the most conversions?",
  "Wallets stuck mid-flow",
  "How many contacts can I reach by email?",
];

/**
 * Cerebra - the floating Intelligence assistant. A launcher in the corner opens
 * a panel that answers questions about the workspace, running the backend
 * conversation agent (`intelligenceService.askAssistant`). One panel, mounted
 * once by the dashboard shell, so it is available on every page.
 */
export function CerebraLauncher() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const conversationId = useRef<string | undefined>(undefined);
  const abort = useRef<AbortController | null>(null);
  const scrollEnd = useRef<HTMLDivElement>(null);

  const starters = useQuery({
    queryKey: ["cerebra", "starters", getSelectedOrganizationId() ?? ""],
    queryFn: () => intelligenceService.getQueryStarters(),
    enabled: open,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const suggestions = (
    starters.data?.items?.map((s) => s.query || s.title).filter(Boolean) ??
    FALLBACK_STARTERS
  ).slice(0, 3);

  useEffect(() => {
    scrollEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, busy]);

  // Abort any in-flight agent run when the panel closes or unmounts.
  useEffect(() => {
    if (!open) abort.current?.abort();
    return () => abort.current?.abort();
  }, [open]);

  const ask = async (prompt: string) => {
    const q = prompt.trim();
    if (!q || busy) return;
    setInput("");
    setTurns((t) => [...t, { role: "user", text: q }]);
    setBusy(true);
    abort.current = new AbortController();
    try {
      const reply = await intelligenceService.askAssistant(
        { prompt: q, conversationId: conversationId.current },
        { signal: abort.current.signal }
      );
      if (reply.conversationId) conversationId.current = reply.conversationId;
      const trimmed = reply.answer?.trim() ?? "";
      const fallback =
        reply.status && reply.status !== "answered"
          ? `I couldn't finish that (${reply.status}). Try rephrasing.`
          : "No answer came back. Try rephrasing.";
      const answer = trimmed.length > 0 ? trimmed : fallback;
      setTurns((t) => [...t, { role: "assistant", text: answer }]);
    } catch (e) {
      if (abort.current?.signal.aborted) return;
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          error: true,
          text:
            e instanceof Error && e.message
              ? e.message
              : "Something went wrong. Try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {open ? (
        <div className="fixed bottom-4 right-4 z-50 flex h-[min(560px,calc(100vh-2rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <header className="flex items-start gap-3 border-b border-border px-4 py-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <SparklesIcon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                Intelligence
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Knows your on-chain and messaging data
              </p>
            </div>
            <Link
              href="/intelligence"
              className="rounded-md p-1 text-muted-foreground hover:text-foreground"
              aria-label="Open the full Intelligence workspace"
              title="Open full view"
            >
              <SparklesIcon className="size-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground"
              aria-label="Close Intelligence"
            >
              <XMarkIcon className="size-4" aria-hidden="true" />
            </button>
          </header>

          <div className="scrollbar-sleek flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {turns.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Ask about anything on this page, or anything in your
                  workspace.
                </p>
                <div className="space-y-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => ask(s)}
                      className="flex w-full items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-border hover:bg-muted/60"
                    >
                      <span className="mt-0.5 text-muted-foreground">↳</span>
                      <span className="min-w-0">{s}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              turns.map((t, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    t.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                      t.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : t.error
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-foreground"
                    )}
                  >
                    {t.text}
                  </div>
                </div>
              ))
            )}
            {busy ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowPathIcon
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
                Thinking…
              </div>
            ) : null}
            <div ref={scrollEnd} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Intelligence…"
              aria-label="Ask Intelligence"
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              aria-label="Send"
            >
              <PaperAirplaneIcon className="size-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-50 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
          aria-label="Ask Intelligence"
          title="Ask Intelligence"
        >
          <SparklesIcon className="size-5" aria-hidden="true" />
        </button>
      )}
    </>
  );
}
