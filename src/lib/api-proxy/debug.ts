/**
 * Fire-and-forget debug events to a local collector (DEBUG_SERVER_URL), left
 * from earlier proxy investigations. Never throws, never blocks a request.
 */

export const DEBUG_SERVER_URL =
  process.env.DEBUG_SERVER_URL ?? "http://127.0.0.1:7777/event";
export const DEBUG_SESSION_ID =
  process.env.DEBUG_SESSION_ID ?? "email-empty-preview";
export const reportEmailDebug = (
  hypothesisId: "A" | "B" | "C" | "D" | "E",
  location: string,
  msg: string,
  data: Record<string, unknown>
) => {
  fetch(DEBUG_SERVER_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      runId: "pre-fix",
      hypothesisId,
      location,
      msg,
      data,
      ts: Date.now(),
    }),
  }).catch(() => undefined);
};

export const reportSettingsProfileBillingDebug = (
  hypothesisId: "A" | "B" | "C" | "D" | "E",
  location: string,
  msg: string,
  data: Record<string, unknown>
) => {
  fetch("http://127.0.0.1:7777/event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: "settings-profile-billing",
      runId: "pre-fix",
      hypothesisId,
      location,
      msg,
      data,
      ts: Date.now(),
    }),
  }).catch(() => undefined);
};

export const reportAgentQueryDebug = (
  stage: "request" | "response" | "error",
  data: Record<string, unknown>
) => {
  console.warn("[api] intelligence/agent/query", {
    at: new Date().toISOString(),
    stage,
    ...data,
  });
};
