"use client";

import { useEffect, useRef } from "react";

/**
 * Sends `question` once, as soon as the chat mounts. ⌘K's "Ask Intelligence"
 * opens /intelligence?q=..., and the person already chose to ask, so making
 * them press Enter again would be a second step for nothing. Fires once per
 * question; a later ⌘K ask continues the same thread.
 */
export function useAutoAsk(
  question: string | undefined,
  submit: (prompt: string) => void
) {
  const sent = useRef<string | null>(null);
  const latest = useRef(submit);
  latest.current = submit;

  useEffect(() => {
    const q = question?.trim();
    if (!q || sent.current === q) return;
    sent.current = q;
    latest.current(q);
  }, [question]);
}
