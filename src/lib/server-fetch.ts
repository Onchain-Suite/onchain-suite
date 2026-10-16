interface FetchWithTimeoutOptions {
  /** Per-attempt timeout in ms (default 8000). */
  timeoutMs?: number;
  /** Extra attempts after the first on timeout/network error (default 0). */
  retries?: number;
}

/**
 * fetch() bounded by a timeout, with optional retries.
 *
 * Server components read the session/org by fetching our own `/api/*` routes
 * with `cache: "no-store"`. Those calls have no timeout, so a single stalled
 * upstream request hangs the whole RSC render - the route stays stuck on
 * `loading.tsx` until the user manually refreshes. `AbortSignal.timeout` caps
 * each attempt so a stall fails fast instead of hanging forever, and a retry
 * auto-recovers a transient hiccup the way that manual refresh does.
 *
 * The abort still rejects the fetch, so existing try/catch fallbacks behave as
 * before - just bounded in time.
 */
export async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  { timeoutMs = 8000, retries = 0 }: FetchWithTimeoutOptions = {}
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetch(input, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
