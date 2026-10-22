import type { NextRequest } from "next/server";

/** Session, bearer and org-id handling for proxied requests. */

export const extractTokenFromCookie = (cookieHeader: string): string | null => {
  const pairs = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => {
      const idx = p.indexOf("=");
      if (idx === -1) return [p, ""] as const;
      return [p.slice(0, idx), p.slice(idx + 1)] as const;
    });

  const cookieMap = new Map(pairs);
  const raw = cookieMap.get("onchain.token") ?? null;
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

export const hasBetterAuthSessionCookie = (cookieHeader: string) =>
  /(^|;\s*)(?:__Secure-|__Host-)?better-auth\.(?:session_token|sessionToken)=/.test(
    cookieHeader
  );

export const extractBearer = (
  authorizationHeader: string | null
): string | null => {
  if (!authorizationHeader) return null;
  const trimmed = authorizationHeader.trim();
  if (trimmed.length === 0) return null;
  const match = /^Bearer\s+(.+)$/i.exec(trimmed);
  if (!match) return null;
  const token = match[1]?.trim() ?? "";
  return token.length > 0 ? token : null;
};

export const requireOrgId = (req: NextRequest): string | null => {
  const raw = req.headers.get("x-org-id") ?? "";
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * Every better-auth session cookie name we may receive. Kept in step with
 * `getSession()` in @/lib/auth-session, which accepts the same set - the
 * secure/host prefixes and the snake/camel spelling vary by deployment, and
 * matching a narrower set here would 401 a perfectly valid session.
 */
export const SESSION_COOKIE_RE =
  /(^|;\s*)(__Secure-|__Host-)?better-auth\.(session_token|sessionToken)=/;

export const hasAnyAuth = (req: NextRequest): boolean => {
  const auth = req.headers.get("authorization");
  if (extractBearer(auth)) return true;
  const cookie = req.headers.get("cookie") ?? "";
  if (extractTokenFromCookie(cookie)) return true;
  return SESSION_COOKIE_RE.test(cookie);
};

export const ensureBackendAuthHeaders = (
  req: NextRequest,
  headers: Headers
) => {
  const tokenFromAuth = extractBearer(headers.get("authorization"));
  const tokenFromHeader =
    req.headers.get("x-editor-token") ?? req.headers.get("x-session-token");
  const tokenFromQuery =
    req.nextUrl.searchParams.get("token") ??
    req.nextUrl.searchParams.get("sessionToken") ??
    req.nextUrl.searchParams.get("editorToken");
  const cookieHeader = req.headers.get("cookie") ?? "";
  const tokenFromCookie = hasBetterAuthSessionCookie(cookieHeader)
    ? null
    : extractTokenFromCookie(cookieHeader);

  const token =
    tokenFromAuth ?? tokenFromHeader ?? tokenFromQuery ?? tokenFromCookie;
  if (!token) return;

  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("x-session-token")) headers.set("x-session-token", token);
  if (!headers.has("x-editor-token")) headers.set("x-editor-token", token);

  const existingCookie = headers.get("cookie") ?? "";
  const hasSessionCookie =
    /(^|;\s*)(__Secure-)?better-auth\.session_token=/.test(existingCookie) ||
    /(^|;\s*)(__Host-)?better-auth\.session_token=/.test(existingCookie) ||
    /(^|;\s*)(__Secure-)?better-auth\.sessionToken=/.test(existingCookie) ||
    /(^|;\s*)(__Host-)?better-auth\.sessionToken=/.test(existingCookie);
  if (!hasSessionCookie) {
    const nextCookie = `${existingCookie}${existingCookie ? "; " : ""}better-auth.session_token=${encodeURIComponent(token)}`;
    headers.set("cookie", nextCookie);
  }
};

export const ensureOrgIdHeader = (req: NextRequest, headers: Headers) => {
  if (headers.has("x-org-id")) return;
  const params = req.nextUrl.searchParams;
  const candidate =
    params.get("x-org-id") ??
    params.get("orgId") ??
    params.get("xOrgId") ??
    params.get("organizationId") ??
    params.get("activeOrganizationId") ??
    params.get("org.id") ??
    params.get("organization.id") ??
    null;
  const cleaned = typeof candidate === "string" ? candidate.trim() : "";
  if (cleaned.length > 0) headers.set("x-org-id", cleaned);
};
