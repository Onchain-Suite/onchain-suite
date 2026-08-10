"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getSelectedOrganizationId } from "@/lib/utils";

import { aiSearchService } from "./ai-search.service";

/**
 * Streamed RAG answer (`GET /query/text/stream` via the same-origin proxy)
 * with bounded execution: 60s timeout, abort on stop/unmount, friendly error
 * mapping, and `POST /ai/feedback` wiring. Shared by the command palette and
 * the dashboard command bar so both surfaces behave identically.
 */

const AI_TIMEOUT_MS = 60_000;

type StreamDonePayload = {
  answer?: string;
  citations?: unknown;
  queryLogId?: string;
  latencyMs?: number;
  variant?: string;
  redactions?: unknown;
};

export type AiCitation = { url: string; title: string };

const hostnameOf = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

const normalizeCitations = (raw: unknown): AiCitation[] => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const citations: AiCitation[] = [];
  for (const entry of raw) {
    let url: string | undefined;
    let title: string | undefined;
    if (typeof entry === "string") {
      url = entry;
    } else if (entry && typeof entry === "object") {
      const e = entry as Record<string, unknown>;
      url = [e.url, e.sourceUri, e.uri, e.link, e.href].find(
        (v): v is string => typeof v === "string" && v.trim().length > 0
      );
      if (typeof e.title === "string" && e.title.trim().length > 0) {
        title = e.title.trim();
      }
    }
    if (!url || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    citations.push({ url, title: title ?? hostnameOf(url) });
  }
  return citations;
};

function buildPersonalizedQuery(input: string, user: unknown): string {
  const u = user as { name?: unknown; timezone?: unknown; email?: unknown };
  const name = typeof u?.name === "string" ? u.name : "";
  const tz = typeof u?.timezone === "string" ? u.timezone : "";
  const email = typeof u?.email === "string" ? u.email : "";
  const ctx = [
    name ? `name=${name}` : null,
    tz ? `timezone=${tz}` : null,
    email ? `email=${email}` : null,
  ]
    .filter((v): v is string => Boolean(v && v.length > 0))
    .join(", ");
  if (!ctx) return input;
  return `UserContext(${ctx})\n\n${input}`;
}

async function streamQueryText(args: {
  query: string;
  mode?: "fast" | "best";
  orgId?: string | null;
  signal?: AbortSignal;
  onToken: (token: string) => void;
  onDone: (done: StreamDonePayload) => void;
}): Promise<void> {
  const params = new URLSearchParams();
  params.set("query", args.query);
  if (args.mode) params.set("mode", args.mode);

  const headers: Record<string, string> = {};
  if (args.orgId) headers["x-org-id"] = args.orgId;

  const res = await fetch(`/api/v1/query/text/stream?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    headers,
    signal: args.signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`AI request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let doneSeen = false;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const evt of events) {
      const lines = evt.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const jsonText = trimmed.slice("data:".length).trim();
        if (!jsonText) continue;
        try {
          const parsed = JSON.parse(jsonText) as {
            type?: unknown;
            token?: unknown;
            data?: unknown;
          };
          if (parsed.type === "token" && typeof parsed.token === "string") {
            args.onToken(parsed.token);
          } else if (
            parsed.type === "done" &&
            parsed.data &&
            typeof parsed.data === "object"
          ) {
            doneSeen = true;
            args.onDone(parsed.data as StreamDonePayload);
          }
        } catch {
          continue;
        }
      }
    }
  }

  // A stream that closes without a done event is a failure - surface it now
  // rather than letting the caller's timeout turn it into a minute of silence.
  if (!doneSeen) {
    throw new Error("The answer stream ended unexpectedly. Try again.");
  }
}

export function useAiAnswer() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [queryLogId, setQueryLogId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [citations, setCitations] = useState<AiCitation[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setLoading(false);
  }, []);

  useEffect(() => stop, [stop]);

  const ask = useCallback((rawQuestion: string, opts?: { user?: unknown }) => {
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);

    setQuestion(rawQuestion);
    setAnswer("");
    setError(null);
    setLoading(true);
    setQueryLogId(null);
    setFeedback(null);
    setCitations([]);

    // Bound the stream - never hang forever.
    timeoutRef.current = window.setTimeout(() => {
      if (abortRef.current === controller) {
        controller.abort();
        setError("The AI took too long to respond. Try again.");
        setLoading(false);
      }
    }, AI_TIMEOUT_MS);

    const enriched = buildPersonalizedQuery(rawQuestion, opts?.user);
    const orgId = getSelectedOrganizationId();

    streamQueryText({
      query: enriched,
      mode: "best",
      orgId,
      signal: controller.signal,
      onToken: (t) => setAnswer((prev) => prev + t),
      onDone: (d) => {
        if (typeof d.answer === "string" && d.answer.length > 0) {
          setAnswer(d.answer);
        }
        if (typeof d.queryLogId === "string" && d.queryLogId.length > 0) {
          setQueryLogId(d.queryLogId);
        }
        setCitations(normalizeCitations(d.citations));
        setLoading(false);
        if (timeoutRef.current !== null) {
          window.clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      },
    }).catch((e: unknown) => {
      // Disarm the timeout so it can't fire later and overwrite this error
      // with the generic took-too-long message.
      if (abortRef.current === controller) {
        abortRef.current = null;
        if (timeoutRef.current !== null) {
          window.clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
      if (controller.signal.aborted) return; // user stop or timeout
      const raw = e instanceof Error ? e.message : "AI request failed";
      const message = raw.includes("(402)")
        ? "Your organization is out of AI credits and the usage wallet can't cover it - top up or upgrade in Settings → Billing."
        : raw.includes("(404)") || raw.includes("(501)")
          ? "AI search isn't available yet for this workspace."
          : raw;
      setError(message);
      setLoading(false);
    });
  }, []);

  const reset = useCallback(() => {
    stop();
    setQuestion("");
    setAnswer("");
    setError(null);
    setQueryLogId(null);
    setFeedback(null);
    setCitations([]);
  }, [stop]);

  // Fire-and-forget relevance feedback (POST /ai/feedback); the UI flips to
  // a thank-you immediately - a lost request isn't worth surfacing.
  const sendFeedback = useCallback(
    (vote: "up" | "down") => {
      setFeedback(vote);
      aiSearchService
        .sendFeedback({
          rating: vote === "up" ? 5 : 1,
          ...(queryLogId ? { queryLogId } : {}),
        })
        .catch(() => undefined);
    },
    [queryLogId]
  );

  return {
    question,
    answer,
    error,
    loading,
    feedback,
    citations,
    ask,
    stop,
    reset,
    sendFeedback,
  };
}
