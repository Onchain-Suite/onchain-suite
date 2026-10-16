/**
 * Classify a request error as a client-side timeout/abort. Pure, so it is
 * unit-tested without rendering (CLAUDE.md 15.4).
 *
 * A domain recheck asks the backend to re-check DNS at the mail provider, which
 * can outlast the request window. When that happens axios aborts with
 * "timeout of <n>ms exceeded" (code ECONNABORTED); the service re-wraps the
 * original as `cause`, so we check both the message and the wrapped code.
 */
export function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (
    /timeout of \d+ms exceeded|timed out|ECONNABORTED|ETIMEDOUT/i.test(
      error.message
    )
  ) {
    return true;
  }
  const { cause } = error as { cause?: unknown };
  if (cause && typeof cause === "object") {
    const { code } = cause as { code?: unknown };
    if (code === "ECONNABORTED" || code === "ETIMEDOUT") return true;
  }
  return false;
}

/**
 * Shown when a recheck times out: the check very likely continues server-side,
 * so this frames it as "in progress" rather than a failure.
 */
export const RECHECK_TIMEOUT_MESSAGE =
  "Recheck is taking longer than usual. It will keep running in the background, refresh in a moment to see the latest status.";
