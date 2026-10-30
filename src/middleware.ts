import { type NextRequest, NextResponse } from "next/server";

/**
 * Per-org (Dune-style) subdomain routing for PUBLISHED, public pages only.
 *
 * When a hosted form (`/f/[token]`) or published dashboard (`/d/[token]`) is
 * opened on a workspace subdomain - `acme.onchainsuite.com/d/<token>` - this
 * extracts the `acme` slug from the Host header and forwards it as
 * `x-ocs-workspace` so the page (and the backend it calls) can scope the token
 * to that workspace and brand the page as that workspace's.
 *
 * Safety:
 *  - The matcher is `/d` and `/f` ONLY, so this never runs on the app itself.
 *  - It is inert until `NEXT_PUBLIC_PUBLISHING_DOMAIN` is set (local dev and
 *    Vercel previews see no publishing domain, so every request passes through
 *    unchanged). Turning it on also needs the wildcard DNS + the backend
 *    workspace->org resolution - see migration/branded-subdomains.md.
 *  - The apex and reserved subdomains (app, www, api, …) are never treated as
 *    workspaces.
 */

const PUBLISHING_DOMAIN = process.env.NEXT_PUBLIC_PUBLISHING_DOMAIN?.trim();

const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "staging",
  "dev",
  "preview",
  "cdn",
  "assets",
  "mail",
]);

/**
 * Pure core: the workspace slug from a host, given the publishing domain. Null
 * when publishing is off, the host is the apex, a reserved subdomain, or not
 * under the domain at all. Exported for unit tests.
 */
export function resolveWorkspaceFromHost(
  host: string | null | undefined,
  domain: string | null | undefined
): string | null {
  if (!domain || !host) return null;
  const hostname = host.split(":")[0].toLowerCase();
  if (hostname === domain) return null; // the apex itself
  const suffix = `.${domain}`;
  if (!hostname.endsWith(suffix)) return null;
  const label = hostname.slice(0, -suffix.length);
  // Only a single-label subdomain is a workspace (`acme`, not `a.b`).
  if (!label || label.includes(".")) return null;
  if (RESERVED_SUBDOMAINS.has(label)) return null;
  return label;
}

/** The workspace slug from a `<workspace>.<PUBLISHING_DOMAIN>` host, or null. */
export function workspaceFromHost(
  host: string | null | undefined
): string | null {
  return resolveWorkspaceFromHost(host, PUBLISHING_DOMAIN);
}

export function middleware(req: NextRequest) {
  const workspace = workspaceFromHost(req.headers.get("host"));
  if (!workspace) return NextResponse.next();

  const headers = new Headers(req.headers);
  headers.set("x-ocs-workspace", workspace);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Public published surfaces only - the app and its API are never touched.
  matcher: ["/d/:path*", "/f/:path*"],
};
