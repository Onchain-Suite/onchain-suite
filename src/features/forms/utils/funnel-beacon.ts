/**
 * Client helpers for the hosted-form funnel beacon (view / start). No PII - just
 * an anonymous per-visit session id and the traffic source. Everything is
 * best-effort and guarded, so a blocked storage or a failed send never affects
 * the form.
 */

const SID_KEY = "ons.form.sid";

/** Anonymous per-visit id, so a reload is not counted as a new view. */
export function visitSessionId(): string {
  const fresh = () =>
    (
      globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
    ).slice(0, 64);
  try {
    const existing = window.sessionStorage.getItem(SID_KEY);
    if (existing) return existing;
    const sid = fresh();
    window.sessionStorage.setItem(SID_KEY, sid);
    return sid;
  } catch {
    return fresh();
  }
}

/** Traffic source: a `utm_source`, else the referrer host, else "direct". */
export function funnelSource(): string {
  try {
    const utm = new URLSearchParams(window.location.search).get("utm_source");
    if (utm) return utm.slice(0, 120);
    const ref = document.referrer;
    if (ref) {
      const { host } = new URL(ref);
      // A same-site referrer is navigation, not an acquisition source.
      if (host && host !== window.location.host) return host.slice(0, 120);
    }
  } catch {
    // ignore - fall through to "direct"
  }
  return "direct";
}

/** Fire a funnel event at the same-origin proxy (CSP connect-src 'self'). */
export function sendFormEvent(
  token: string,
  type: "view" | "start",
  sessionId: string,
  source: string
): void {
  const url = `/api/forms/${encodeURIComponent(token)}/events`;
  const payload = JSON.stringify({ type, sessionId, source });
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(
        url,
        new Blob([payload], { type: "application/json" })
      );
      return;
    }
  } catch {
    // fall through to fetch
  }
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}
