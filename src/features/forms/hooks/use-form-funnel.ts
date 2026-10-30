"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  funnelSource,
  sendFormEvent,
  visitSessionId,
} from "../utils/funnel-beacon";

/**
 * Hosted-form funnel beacon: fires one `view` on mount and returns a
 * `markStarted` to call on the first interaction (fires at most once). Both are
 * no-ops without a token, and never throw into the render.
 */
export function useFormFunnel(token: string) {
  const sid = useRef("");
  const viewed = useRef(false);
  const started = useRef(false);

  useEffect(() => {
    if (viewed.current || !token) return;
    viewed.current = true;
    sid.current = visitSessionId();
    sendFormEvent(token, "view", sid.current, funnelSource());
  }, [token]);

  return useCallback(() => {
    if (started.current || !token) return;
    started.current = true;
    if (!sid.current) sid.current = visitSessionId();
    sendFormEvent(token, "start", sid.current, funnelSource());
  }, [token]);
}
