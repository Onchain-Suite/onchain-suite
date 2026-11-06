/**
 * Host-based routing for the hard split between the marketing site and the
 * authenticated app (see CLAUDE.md §0.6).
 *
 * Canonical homes:
 *   - Marketing -> onchainsuite.com (apex) and www.onchainsuite.com
 *   - App       -> app.onchainsuite.com (prod), staging.onchainsuite.com (staging)
 *
 * On a marketing host an app path is 308'd to the app origin; on an app host a
 * marketing path is 308'd back to the apex, and "/" is sent to the dashboard.
 * Any OTHER host (Vercel preview *.vercel.app, localhost, per-org published
 * domains) is left untouched so previews and local dev still serve every route.
 *
 * The whole thing is gated by `enabled` (wired to HOST_SPLIT_ENABLED in
 * src/proxy.ts). It ships OFF: turning it on before app.onchainsuite.com resolves
 * would 308 the app to a dead host and lock everyone out, so the flag is flipped
 * only once DNS + the Vercel domains are live.
 */

export const MARKETING_HOSTS = [
  "onchainsuite.com",
  "www.onchainsuite.com",
] as const;

export const APP_HOSTS = [
  "app.onchainsuite.com",
  "staging.onchainsuite.com",
] as const;

export const PROD_APP_ORIGIN = "https://app.onchainsuite.com";
// www, not the apex: the apex itself redirects to www (Vercel domain setting),
// so sending marketing paths to the apex cost an extra hop.
export const PROD_MARKETING_ORIGIN = "https://www.onchainsuite.com";

// Authenticated app + auth/onboarding + Payload admin. Matched as a whole
// segment (exact, or followed by "/"), so "/for" (a marketing page) never
// matches "/forms" and "/d" (public) never matches "/dashboard".
const APP_PREFIXES = [
  "/dashboard",
  "/campaigns",
  "/audience",
  "/automations",
  "/forms",
  "/inbox",
  "/intelligence",
  "/analytics",
  "/integrations",
  "/settings",
  "/community",
  "/billing",
  "/payment",
  "/invite",
  "/invites",
  "/onboarding",
  "/auth",
  "/verify-email",
  "/new-dashboard",
  "/admin",
] as const;

// Served on ANY host, never redirected: framework internals, the app's API
// proxy, Payload's CMS API, and the PUBLIC embeddable surfaces - hosted forms
// (/f) and published pages (/d) - which third parties load cross-origin.
const PUBLIC_PREFIXES = [
  "/api",
  "/cms-api",
  "/f",
  "/d",
  "/_next",
  "/.well-known",
  "/monitoring",
  "/ingest",
] as const;

const matchesSegment = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

// A file request (an extension in the last path segment), e.g. /icon.png,
// /robots.txt, /sitemap.xml - always served where requested.
const isStaticAsset = (pathname: string) => /\.[a-z0-9]+$/i.test(pathname);

export const isPublicPath = (pathname: string) =>
  isStaticAsset(pathname) ||
  PUBLIC_PREFIXES.some((prefix) => matchesSegment(pathname, prefix));

export const isAppPath = (pathname: string) =>
  APP_PREFIXES.some((prefix) => matchesSegment(pathname, prefix));

export type HostRoutingDecision =
  { kind: "next" } | { kind: "redirect"; location: string; permanent: boolean };

const NEXT: HostRoutingDecision = { kind: "next" };

/**
 * Decide what to do with one request. `host` may include a port (stripped).
 * `search` is the raw query string including the leading "?" (or "").
 */
export function resolveHostRouting(
  host: string,
  pathname: string,
  search: string,
  { enabled = true }: { enabled?: boolean } = {}
): HostRoutingDecision {
  if (!enabled) return NEXT;

  const [hostname] = host.toLowerCase().split(":");

  // Public/shared + static assets: serve wherever they were requested.
  if (isPublicPath(pathname)) return NEXT;

  const isMarketingHost = (MARKETING_HOSTS as readonly string[]).includes(
    hostname
  );
  const isAppHost = (APP_HOSTS as readonly string[]).includes(hostname);

  // Unknown host (previews, localhost, per-org domains): never redirect.
  if (!isMarketingHost && !isAppHost) return NEXT;

  if (isMarketingHost) {
    if (isAppPath(pathname)) {
      return {
        kind: "redirect",
        location: `${PROD_APP_ORIGIN}${pathname}${search}`,
        permanent: true,
      };
    }
    return NEXT;
  }

  // App host (app. / staging.)
  if (pathname === "/") {
    return { kind: "redirect", location: "/dashboard", permanent: false };
  }
  if (!isAppPath(pathname)) {
    // A marketing path requested on the app host -> send it to the apex.
    return {
      kind: "redirect",
      location: `${PROD_MARKETING_ORIGIN}${pathname}${search}`,
      permanent: true,
    };
  }
  return NEXT;
}
