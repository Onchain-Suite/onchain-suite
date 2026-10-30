// Server-only by construction: uses `next/headers` (throws in a client
// component) and is imported only from server components / route handlers.
import { headers } from "next/headers";

import {
  backendBaseUrl,
  publicBackendHeaders,
  unwrap,
} from "./public-forms-backend";

/**
 * Per-org subdomain resolution for the PUBLIC published pages (`/d/[token]`,
 * `/f/[token]`). The subdomain middleware (`src/middleware.ts`) puts the
 * workspace slug from `<workspace>.onchainsuite.com` on the `x-ocs-workspace`
 * request header; these server-only helpers read it and resolve it to the
 * workspace's public identity so the page can brand itself as that workspace's.
 *
 * Everything degrades to `null` (never throws): on the apex, with publishing
 * off, for an unknown slug, or if the backend is unavailable - so a published
 * page always renders, just unscoped. See migration/branded-subdomains.md.
 */

export interface PublishedWorkspace {
  slug: string;
  name: string;
}

/** The workspace slug the middleware resolved for this request, or null. */
export async function workspaceSlugFromRequest(): Promise<string | null> {
  const h = await headers();
  const slug = h.get("x-ocs-workspace");
  return slug && slug.trim().length > 0 ? slug.trim() : null;
}

/**
 * Resolve a workspace slug to its public identity via
 * `GET /organization/by-workspace/:slug`. Null on any failure.
 */
export async function resolvePublishedWorkspace(
  slug: string | null
): Promise<PublishedWorkspace | null> {
  if (!slug) return null;
  try {
    const res = await fetch(
      `${backendBaseUrl()}/organization/by-workspace/${encodeURIComponent(slug)}`,
      { headers: publicBackendHeaders(), cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = unwrap<{ name?: unknown; slug?: unknown } | null>(
      await res.json()
    );
    if (!data || typeof data.name !== "string" || data.name.trim() === "") {
      return null;
    }
    return { slug, name: data.name.trim() };
  } catch {
    return null;
  }
}

/** Read the header and resolve in one call. */
export async function currentPublishedWorkspace(): Promise<PublishedWorkspace | null> {
  return resolvePublishedWorkspace(await workspaceSlugFromRequest());
}
