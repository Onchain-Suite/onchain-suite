import { apiClient } from "@/lib/api-client";
import { isJsonObject } from "@/lib/utils";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  logoUrl?: string; // Handle both cases just in case
}

/**
 * The list of workspaces the signed-in person belongs to (`GET
 * /organization/list`), with the cache the shell renders from.
 *
 * The dashboard layout remounts on every route, so the switcher must render
 * from cache instantly instead of re-entering a loading state per page. The
 * module cache covers client-side navigations; sessionStorage covers full
 * reloads within the TTL. A cached list is a guess, though: a workspace can be
 * deleted or a member removed at any time, so callers that are about to act on
 * the list (opening the switcher, a switch that was refused) ask for a fresh
 * read with `force`.
 */
export const ORG_LIST_CACHE_TTL_MS = 5 * 60_000;
const ORG_LIST_STORAGE_KEY = "onchain.orgListCache.v1";

let cache: Organization[] | null = null;
let cacheExpiresAt = 0;
let inflight: Promise<Organization[]> | null = null;
let rateLimitedUntil = 0;
/** When the server last answered with the list (not when the cache was read). */
let serverReadAt = 0;

export function getCachedOrganizations(): Organization[] | null {
  const now = Date.now();
  // Never serve a cached EMPTY list - an empty result is far more likely stale
  // (e.g. the user just created their first org via onboarding) than a real
  // "belongs to nothing" state, so treat it as a miss and refetch.
  if (cache && cache.length > 0 && cacheExpiresAt > now) return cache;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ORG_LIST_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      orgs?: Organization[];
      expiresAt?: number;
    };
    if (
      !Array.isArray(parsed.orgs) ||
      parsed.orgs.length === 0 ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt <= now
    ) {
      return null;
    }
    cache = parsed.orgs;
    cacheExpiresAt = parsed.expiresAt;
    return parsed.orgs;
  } catch {
    return null;
  }
}

function persist(orgs: Organization[], expiresAt: number) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      ORG_LIST_STORAGE_KEY,
      JSON.stringify({ orgs, expiresAt })
    );
  } catch {
    // Best effort - quota/private-mode failures just skip persistence.
  }
}

function toOrganization(raw: unknown): Organization | null {
  if (!isJsonObject(raw)) return null;
  const id =
    typeof raw.id === "string"
      ? raw.id
      : typeof raw.organizationId === "string"
        ? raw.organizationId
        : undefined;
  if (!id) return null;
  return {
    id,
    name: typeof raw.name === "string" ? raw.name : "",
    slug: typeof raw.slug === "string" ? raw.slug : "",
    logo: typeof raw.logo === "string" ? raw.logo : undefined,
    logoUrl: typeof raw.logoUrl === "string" ? raw.logoUrl : undefined,
  };
}

/** Unwraps `[…]` or `{ data: […] }` into typed workspaces. */
export function extractOrganizations(payload: unknown): Organization[] {
  const root = Array.isArray(payload)
    ? payload
    : isJsonObject(payload) && Array.isArray(payload.data)
      ? payload.data
      : [];
  if (!Array.isArray(root)) return [];
  return root.map(toOrganization).filter((o): o is Organization => o !== null);
}

/**
 * True while the list endpoint has told us to back off. A list returned in
 * that window is the last one we had (or empty), NOT what the server holds
 * now, so nothing may be concluded from it about which workspaces exist.
 */
export const isOrganizationListRateLimited = (): boolean =>
  rateLimitedUntil > Date.now();

/**
 * How long ago the server last answered with the list, in this page's life.
 * Infinity when it has not: a list served from sessionStorage has no known age.
 */
export const organizationListAgeMs = (): number =>
  serverReadAt === 0 ? Number.POSITIVE_INFINITY : Date.now() - serverReadAt;

/** True when nothing has ever been read, not even into the cache. */
export const hasNoOrganizationListYet = (): boolean => cache === null;

/**
 * The person's workspaces: from cache within the TTL, otherwise from the
 * server. `force` skips the cache. A 429 resolves with
 * the last known list and starts a back-off (see
 * {@link isOrganizationListRateLimited}); any other failure rejects.
 */
export async function loadOrganizations(
  force = false
): Promise<Organization[]> {
  const now = Date.now();
  const cached = force ? null : getCachedOrganizations();
  if (cached) return cached;
  // A read already on its way is as fresh as a new one would be.
  if (inflight) return inflight;
  // Back-off holds for a forced read too: asking again is what got us limited.
  if (rateLimitedUntil > now) return cache ?? [];

  const request = apiClient
    .get("/organization/list", {
      headers: { "x-onchain-silent-error": "1" },
    })
    .then((response) => {
      const orgs = extractOrganizations(response.data as unknown);
      cache = orgs;
      cacheExpiresAt = Date.now() + ORG_LIST_CACHE_TTL_MS;
      serverReadAt = Date.now();
      rateLimitedUntil = 0;
      persist(orgs, cacheExpiresAt);
      return orgs;
    })
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 429) {
        rateLimitedUntil = Date.now() + ORG_LIST_CACHE_TTL_MS;
        return cache ?? [];
      }
      throw error;
    })
    .finally(() => {
      if (inflight === request) inflight = null;
    });

  inflight = request;
  return request;
}

/** Test seam: forget everything read so far. */
export function resetOrganizationListCache() {
  cache = null;
  cacheExpiresAt = 0;
  inflight = null;
  rateLimitedUntil = 0;
  serverReadAt = 0;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(ORG_LIST_STORAGE_KEY);
    } catch {
      // Nothing to clear.
    }
  }
}
