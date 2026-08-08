// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAiAnswer } from "./use-ai-answer";

const sseResponse = (events: string[]) => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const evt of events) {
        controller.enqueue(encoder.encode(`data: ${evt}\n\n`));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useAiAnswer", () => {
  it("errors immediately when the stream closes without a done event", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sseResponse([JSON.stringify({ type: "token", token: "partial " })])
      )
    );

    const { result } = renderHook(() => useAiAnswer());
    act(() => {
      result.current.ask("what is my churn rate?");
    });

    // No 60s wait - the closed stream surfaces an error right away.
    await waitFor(() => {
      expect(result.current.error).toMatch(/ended unexpectedly/i);
    });
    expect(result.current.loading).toBe(false);
  });

  it("captures the answer and normalizes citations from the done payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sseResponse([
          JSON.stringify({ type: "token", token: "Answer" }),
          JSON.stringify({
            type: "done",
            data: {
              answer: "Answer body",
              queryLogId: "log_1",
              citations: [
                { sourceUri: "https://docs.example.com/a", title: "Guide A" },
                { url: "https://docs.example.com/a", title: "Duplicate" },
                { uri: "https://example.com/b" },
                { sourceUri: "not-a-url", title: "Skipped" },
                "https://example.com/c",
              ],
            },
          }),
        ])
      )
    );

    const { result } = renderHook(() => useAiAnswer());
    act(() => {
      result.current.ask("q");
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.answer).toBe("Answer body");
    expect(result.current.citations).toEqual([
      { url: "https://docs.example.com/a", title: "Guide A" },
      { url: "https://example.com/b", title: "example.com" },
      { url: "https://example.com/c", title: "example.com" },
    ]);
  });
});
