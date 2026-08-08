/**
 * Server-only helpers for the PUBLIC (unauthenticated) hosted-form endpoints.
 * (Imported only from route handlers / server components - never a client file.)
 * The hosted `/f/[token]` page and its submit/nonce proxies talk to the
 * backend's `/public/forms/*` surface - no org/session context, just the
 * form's public token - so these never forward auth cookies.
 */

const pickNonEmpty = (...values: Array<string | undefined | null>) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return "";
};

export function backendBaseUrl(): string {
  return pickNonEmpty(
    process.env.BACKEND_URL,
    process.env.NEXT_PUBLIC_BACKEND_URL,
    "https://api.onchainsuite.com/api/v1"
  ).replace(/\/$/, "");
}

function backendApiKey(): string {
  return pickNonEmpty(
    process.env.BACKEND_API_KEY,
    process.env.NEXT_PUBLIC_BACKEND_API_KEY,
    process.env.NEXT_PUBLIC_API_KEY
  );
}

/** Headers for a public backend call (API key only, never user auth). */
export function publicBackendHeaders(extra?: Record<string, string>): Headers {
  const headers = new Headers({ "content-type": "application/json", ...extra });
  const key = backendApiKey();
  if (key) headers.set("x-api-key", key);
  return headers;
}

/** Unwrap the `{ success, data }` envelope. */
export function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}
