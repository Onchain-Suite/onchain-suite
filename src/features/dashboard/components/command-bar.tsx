"use client";

import {
  ArrowPathIcon,
  ArrowUpIcon,
  HandThumbDownIcon,
  HandThumbUpIcon,
  MagnifyingGlassIcon,
  MicrophoneIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useCommandPalette } from "@/components/common/command-palette";
import { Button } from "@/components/ui/button";

import { authClient } from "@/lib/auth-client";

import { AiCitations } from "@/features/ai-search/ai-citations";
import { useAiAnswer } from "@/features/ai-search/use-ai-answer";

type SpeechRecognitionCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  onresult: ((event: unknown) => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Dashboard command bar. Submitting a query streams the AI answer inline
 * right below the bar (same bounded ask flow as ⌘K via useAiAnswer) - no
 * redirect into the palette. An empty submit still opens ⌘K for browsing
 * commands, and voice input transcribes into the query.
 */
export function CommandBar() {
  const palette = useCommandPalette();
  const { data: session } = authClient.useSession();
  const ai = useAiAnswer();
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(
    null
  );

  const handleSubmit = () => {
    const q = query.trim();
    if (q.length === 0) {
      palette.open();
      return;
    }
    ai.ask(q, { user: session?.user });
    setQuery("");
  };

  const toggleListening = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      toast.error("Voice input is not supported in this browser.");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onerror = () => {
      setListening(false);
      toast.error("Voice input failed.");
    };
    recognition.onend = () => {
      setListening(false);
    };
    recognition.onresult = (event: unknown) => {
      const e = event as {
        results?: ArrayLike<
          ArrayLike<{ transcript?: string; confidence?: number }>
        >;
      };
      const { results } = e;
      if (!results || results.length === 0) return;
      const last = results[results.length - 1];
      const alt = last?.[0] ?? null;
      const text =
        alt && typeof alt.transcript === "string" ? alt.transcript : "";
      if (text.trim().length > 0) setQuery(text.trim());
    };

    setListening(true);
    recognition.start();
  };

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const showAnswer = ai.question.length > 0;

  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <div className="relative flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-ring">
        <MagnifyingGlassIcon
          aria-hidden="true"
          className="h-5 w-5 shrink-0 text-muted-foreground"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Search, jump to a page, or ask AI…"
          className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
          aria-label="Search or ask AI"
        />
        <kbd
          aria-hidden="true"
          className="pointer-events-none hidden rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground sm:inline-flex"
        >
          ⌘K
        </kbd>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-lg"
          onClick={toggleListening}
          aria-label={listening ? "Stop voice input" : "Voice input"}
        >
          <MicrophoneIcon
            aria-hidden="true"
            className={listening ? "h-5 w-5 text-primary" : "h-5 w-5"}
          />
        </Button>
        <Button
          type="button"
          size="icon"
          className="rounded-lg"
          onClick={handleSubmit}
          aria-label="Ask AI"
        >
          <ArrowUpIcon aria-hidden="true" className="h-5 w-5" />
        </Button>
      </div>

      {showAnswer ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5">
            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <SparklesIcon
                className="h-3.5 w-3.5 text-primary"
                aria-hidden="true"
              />
              AI answer
            </span>
            <span className="flex items-center gap-1">
              {ai.loading ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={ai.stop}
                >
                  Stop
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={ai.reset}
                aria-label="Dismiss answer"
              >
                <XMarkIcon className="h-4 w-4" aria-hidden="true" />
              </Button>
            </span>
          </div>

          {/* Question */}
          <div className="border-b border-border/60 bg-muted/20 px-4 py-2.5">
            <p className="line-clamp-2 text-sm font-medium text-foreground">
              {ai.question}
            </p>
          </div>

          {/* Answer body */}
          <div className="max-h-[min(50vh,360px)] overflow-y-auto">
            <div
              className="px-4 py-4 text-sm leading-relaxed text-foreground"
              aria-live="polite"
            >
              {ai.error ? (
                <div className="space-y-3">
                  <p className="text-destructive">{ai.error}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => ai.ask(ai.question, { user: session?.user })}
                  >
                    <ArrowPathIcon
                      className="mr-1.5 h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                    Try again
                  </Button>
                </div>
              ) : ai.answer.length > 0 ? (
                <div className="whitespace-pre-wrap">{ai.answer}</div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="flex gap-1" aria-hidden="true">
                    {[0, 1, 2].map((d) => (
                      <span
                        key={d}
                        className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
                        style={{ animationDelay: `${d * 0.18}s` }}
                      />
                    ))}
                  </span>
                  Thinking…
                </div>
              )}
            </div>
          </div>

          <AiCitations citations={ai.citations} />

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-border/60 bg-muted/20 px-4 py-2.5 text-[11px] text-muted-foreground">
            {!ai.loading && !ai.error && ai.answer.length > 0 ? (
              ai.feedback ? (
                <span>Thanks for the feedback.</span>
              ) : (
                <span className="flex items-center gap-1">
                  <span>Helpful?</span>
                  <button
                    type="button"
                    aria-label="Answer was helpful"
                    className="rounded p-1 hover:bg-muted hover:text-foreground"
                    onClick={() => ai.sendFeedback("up")}
                  >
                    <HandThumbUpIcon
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    type="button"
                    aria-label="Answer was not helpful"
                    className="rounded p-1 hover:bg-muted hover:text-foreground"
                    onClick={() => ai.sendFeedback("down")}
                  >
                    <HandThumbDownIcon
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                  </button>
                </span>
              )
            ) : (
              <span>AI answers can be wrong - verify important data.</span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
