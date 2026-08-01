import type { AuthStrategy, AuthStrategyResult } from "payload";

import { canManageBlog, extractRole } from "@/payload/access/roles";

/**
 * Authenticates the CMS against the product backend instead of against its own
 * user table.
 *
 * The blog has no credentials of its own: an admin signs into OnchainSuite
 * normally and their existing session grants them the CMS. Payload's local
 * (email + password) strategy is disabled on the users collection, so there is
 * no second password to manage and no way to log into /admin without a product
 * session.
 *
 * Authorisation is the backend's `UserRole` enum — only ADMIN and SUPER_ADMIN
 * pass. See src/payload/access/roles.ts for the decision itself, which is unit
 * tested in isolation.
 *
 * A shadow row in the `users` collection is upserted on first successful
 * authentication. Payload binds `req.user` to a real document, and `posts.authors`
 * is a relationship that needs a row to point at — so the row is a technical
 * requirement, not a second account. It holds no password and is never created
 * by hand; it mirrors identity the backend already owns.
 */

const STRATEGY_NAME = "onchain-backend-session";

/** How long a resolved identity is trusted before the backend is asked again. */
const SESSION_CACHE_TTL_MS = 10_000;

/**
 * The admin panel issues many requests per page view, and every one of them runs
 * this strategy. Without a cache each page would fan out into a burst of
 * identical backend calls — this app has already been rate-limited (429) for
 * exactly that pattern, which is why the auth proxy at
 * src/app/api/v1/auth/[...path]/route.ts caches get-session the same way.
 */
const sessionCache = new Map<
  string,
  { expiresAt: number; role: string | null; user: BackendUser | null }
>();

/** Upper bound on the backend call. No auth check may hang a request forever. */
const REQUEST_TIMEOUT_MS = 8_000;

type BackendUser = {
  email: string;
  id: string;
  name?: string;
};

const pickNonEmpty = (...values: Array<string | undefined | null>) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return "";
};

const getBackendBaseUrl = () => {
  const base = pickNonEmpty(
    process.env.BACKEND_URL,
    process.env.NEXT_PUBLIC_BACKEND_URL,
    process.env.NODE_ENV === "production"
      ? "https://api.onchainsuite.com/api/v1"
      : "http://127.0.0.1:3333/api/v1"
  );
  return base.replace(/\/$/, "");
};

const parseCookies = (cookieHeader: string) => {
  const map = new Map<string, string>();
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }
    const idx = trimmed.indexOf("=");
    if (idx === -1) {
      map.set(trimmed, "");
    } else {
      map.set(trimmed.slice(0, idx), trimmed.slice(idx + 1));
    }
  }
  return map;
};

const extractUser = (profile: unknown): BackendUser | null => {
  if (typeof profile !== "object" || profile === null) {
    return null;
  }

  const root = profile as Record<string, unknown>;
  const candidates: Array<Record<string, unknown>> = [root];

  for (const key of ["data", "user", "profile"]) {
    const nested = root[key];
    if (typeof nested === "object" && nested !== null) {
      const nestedObj = nested as Record<string, unknown>;
      candidates.push(nestedObj);
      const inner = nestedObj.user;
      if (typeof inner === "object" && inner !== null) {
        candidates.push(inner as Record<string, unknown>);
      }
    }
  }

  for (const candidate of candidates) {
    const { email } = candidate;
    const id = candidate.id ?? candidate.userId;
    if (typeof email === "string" && email.includes("@")) {
      const name = candidate.name ?? candidate.fullName;
      return {
        email,
        id:
          typeof id === "string" || typeof id === "number" ? String(id) : email,
        name: typeof name === "string" ? name : undefined,
      };
    }
  }

  return null;
};

export const backendSessionStrategy: AuthStrategy = {
  name: STRATEGY_NAME,
  authenticate: async ({ headers, payload }): Promise<AuthStrategyResult> => {
    const deny: AuthStrategyResult = { user: null };

    const cookieHeader = headers.get("cookie") ?? "";
    if (!cookieHeader) {
      return deny;
    }

    const cookies = parseCookies(cookieHeader);
    const apiTokenRaw = cookies.get("onchain.token") ?? null;
    const apiToken = apiTokenRaw ? decodeURIComponent(apiTokenRaw) : null;
    const hasBetterAuthCookie = [...cookies.keys()].some((name) =>
      name.toLowerCase().includes("better-auth")
    );

    // Mirrors the /api/v1 proxy: a stale onchain.token must not override a live
    // better-auth session. src/app/api/v1/user/profile/route.test.ts pins this.
    const shouldSendApiBearer = Boolean(apiToken) && !hasBetterAuthCookie;

    const sessionKey = cookieHeader;
    const cached = sessionCache.get(sessionKey);
    if (cached && cached.expiresAt > Date.now()) {
      if (!cached.user || !canManageBlog(cached.role)) {
        return deny;
      }
      return attachUser(payload, cached.user, cached.role);
    }

    let profile: unknown;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${getBackendBaseUrl()}/user/profile`, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Cookie: cookieHeader,
          ...(shouldSendApiBearer
            ? { Authorization: `Bearer ${apiToken}` }
            : {}),
          ...(process.env.BACKEND_API_KEY
            ? { "x-api-key": process.env.BACKEND_API_KEY }
            : {}),
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        // Cache the denial too, so an unauthenticated visitor hammering /admin
        // cannot turn into a burst of backend calls.
        sessionCache.set(sessionKey, {
          expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
          role: null,
          user: null,
        });
        return deny;
      }

      profile = await response.json();
    } catch (error) {
      // Timeout, abort or network failure. Fail closed and do not cache, so a
      // transient backend blip does not lock an admin out for the full TTL.
      payload.logger.warn(
        `[${STRATEGY_NAME}] Could not verify session with the backend: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return deny;
    } finally {
      clearTimeout(timeout);
    }

    const role = extractRole(profile);
    const backendUser = extractUser(profile);

    sessionCache.set(sessionKey, {
      expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
      role,
      user: backendUser,
    });

    if (!backendUser) {
      payload.logger.warn(
        `[${STRATEGY_NAME}] Backend profile had no identifiable user; denying.`
      );
      return deny;
    }

    if (!canManageBlog(role)) {
      // Not an error: a regular USER signing into the product simply has no CMS
      // access. Logged at debug so a real misconfiguration is still findable.
      payload.logger.debug(
        `[${STRATEGY_NAME}] Denied CMS access to role ${role ?? "<none>"}.`
      );
      return deny;
    }

    return attachUser(payload, backendUser, role);
  },
};

/**
 * Resolves the shadow `users` row for a backend identity, creating it on first
 * sight and keeping email/name/role in step with the backend afterwards.
 */
async function attachUser(
  payload: Parameters<AuthStrategy["authenticate"]>[0]["payload"],
  backendUser: BackendUser,
  role: string | null
): Promise<AuthStrategyResult> {
  try {
    const existing = await payload.find({
      collection: "users",
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { backendUserId: { equals: backendUser.id } },
    });

    const desired = {
      backendUserId: backendUser.id,
      email: backendUser.email,
      name: backendUser.name ?? backendUser.email,
      role: role ?? undefined,
    };

    const [current] = existing.docs;

    const doc = current
      ? // Only write when something actually changed — otherwise every admin
        // request would issue an UPDATE.
        current.email !== desired.email ||
        current.name !== desired.name ||
        current.role !== desired.role
        ? await payload.update({
            id: current.id,
            collection: "users",
            data: desired,
            overrideAccess: true,
          })
        : current
      : await payload.create({
          collection: "users",
          data: desired,
          overrideAccess: true,
        });

    return {
      user: {
        ...doc,
        _strategy: STRATEGY_NAME,
        collection: "users",
      },
    } as AuthStrategyResult;
  } catch (error) {
    payload.logger.error(
      `[${STRATEGY_NAME}] Could not resolve the CMS user record: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return { user: null };
  }
}
