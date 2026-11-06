/**
 * The Better Auth session cookie, named per environment.
 *
 * Production and staging backends both set their session cookie on
 * `Domain=onchainsuite.com`, so with one shared name, signing in on
 * staging.onchainsuite.com overwrote the app.onchainsuite.com session (and the
 * other way round). Each environment therefore gets its own prefix: production
 * keeps Better Auth's default `better-auth`, and staging sets
 * `NEXT_PUBLIC_AUTH_COOKIE_PREFIX` to the same value as the staging backend's
 * `AUTH_COOKIE_PREFIX`. The two must always match, or no session is found.
 *
 * Every spelling we may receive is accepted: an optional `__Secure-`/`__Host-`
 * prefix (it varies by deployment) and the snake/camel token key.
 */

const DEFAULT_PREFIX = "better-auth";

const sanitize = (raw: string | undefined): string => {
  const v = (raw ?? "").trim();
  return /^[A-Za-z0-9_-]+$/.test(v) ? v : DEFAULT_PREFIX;
};

export const AUTH_COOKIE_PREFIX = sanitize(
  process.env.NEXT_PUBLIC_AUTH_COOKIE_PREFIX
);

const escaped = AUTH_COOKIE_PREFIX.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");

/** The name to use when the proxy injects a session cookie upstream. */
export const SESSION_COOKIE_NAME = `${AUTH_COOKIE_PREFIX}.session_token`;

/** Every session cookie name, in lookup order. */
export const SESSION_COOKIE_NAMES: string[] = [
  "session_token",
  "sessionToken",
].flatMap((key) =>
  ["", "__Secure-", "__Host-"].map(
    (pre) => `${pre}${AUTH_COOKIE_PREFIX}.${key}`
  )
);

/** Matches a session cookie anywhere in a Cookie header. */
export const SESSION_COOKIE_RE = new RegExp(
  `(^|;\\s*)(__Secure-|__Host-)?${escaped}\\.(session_token|sessionToken)=`
);

/** True when the Cookie header carries this environment's session cookie. */
export const hasSessionCookie = (cookieHeader: string): boolean =>
  SESSION_COOKIE_RE.test(cookieHeader);

/** Any cookie this auth stack owns (`<prefix>.*`, optionally __Secure-/__Host-). */
export const isAuthCookieName = (name: string): boolean =>
  new RegExp(`^(?:__Secure-|__Host-)?${escaped}\\.`).test(name);

/** The session token from a Cookie header (URL-decoded), or null. */
export function readSessionCookie(cookieHeader: string): string | null {
  const map = new Map<string, string>();
  for (const part of cookieHeader.split(";")) {
    const p = part.trim();
    const idx = p.indexOf("=");
    if (idx > 0) map.set(p.slice(0, idx), p.slice(idx + 1));
  }
  for (const name of SESSION_COOKIE_NAMES) {
    const raw = map.get(name);
    if (raw) {
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return null;
}
