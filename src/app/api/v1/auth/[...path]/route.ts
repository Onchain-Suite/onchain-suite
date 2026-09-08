import { type NextRequest, NextResponse } from "next/server";

import { isJsonObject } from "@/lib/utils";

export const dynamic = "force-dynamic";

type CachedSessionResponse = {
  at: number;
  status: number;
  json: unknown;
};

const getSessionCache = new Map<string, CachedSessionResponse>();
const GET_SESSION_CACHE_TTL_MS = 10_000;

const pickNonEmpty = (...values: Array<string | undefined | null>) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return "";
};

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const getBackendBaseUrl = () => {
  const devDefault = "http://127.0.0.1:3333/api/v1";
  const prodDefault = "https://api.onchainsuite.com/api/v1";
  const backendUrl = pickNonEmpty(
    process.env.BACKEND_URL,
    process.env.NEXT_PUBLIC_BACKEND_URL,
    process.env.NODE_ENV === "production" ? prodDefault : devDefault
  );
  return backendUrl.replace(/\/$/, "");
};

const getSetCookieHeaders = (headers: Headers): string[] => {
  const maybeHeaders = headers as unknown as { getSetCookie?: () => string[] };
  if (typeof maybeHeaders.getSetCookie === "function") {
    return maybeHeaders.getSetCookie();
  }
  const single = headers.get("set-cookie");
  return single ? [single] : [];
};

const extractOnchainToken = (cookieHeader: string): string | null => {
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
  return raw ? decodeURIComponent(raw) : null;
};

const extractOnchainUser = (cookieHeader: string): unknown | null => {
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
  const raw = cookieMap.get("onchain.user") ?? null;
  if (!raw) return null;
  try {
    const json = Buffer.from(decodeURIComponent(raw), "base64").toString(
      "utf8"
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const extractBetterAuthSession = (cookieHeader: string): string | null => {
  const match =
    /(^|;\s*)(__Secure-)?better-auth\.session_token=([^;]+)/.exec(
      cookieHeader
    ) ??
    /(^|;\s*)(__Host-)?better-auth\.session_token=([^;]+)/.exec(cookieHeader) ??
    /(^|;\s*)(__Secure-)?better-auth\.sessionToken=([^;]+)/.exec(
      cookieHeader
    ) ??
    /(^|;\s*)(__Host-)?better-auth\.sessionToken=([^;]+)/.exec(cookieHeader);
  const value = match?.[3] ?? "";
  return value ? decodeURIComponent(value) : null;
};

const getSessionCacheKey = (cookieHeader: string, token: string | null) => {
  if (token) return `t:${token.slice(0, 32)}`;
  const session = extractBetterAuthSession(cookieHeader);
  if (session) return `s:${session.slice(0, 32)}`;
  return `c:${cookieHeader.length}`;
};

const normalizeUserFromResponse = (payload: unknown) => {
  const root =
    isJsonObject(payload) && "data" in payload
      ? (payload.data ?? payload)
      : payload;
  if (isJsonObject(root) && "user" in root) return root.user ?? null;
  if (
    isJsonObject(root) &&
    "data" in root &&
    isJsonObject(root.data) &&
    "user" in root.data
  ) {
    return root.data.user ?? null;
  }
  if (isJsonObject(payload) && "user" in payload) return payload.user ?? null;
  return null;
};

const getRedirectUrlFromResponse = (payload: unknown): string | null => {
  const payloadObj = isJsonObject(payload) ? payload : {};
  const redirectObj = isJsonObject(payloadObj.redirect)
    ? payloadObj.redirect
    : null;
  const directCandidates: Array<unknown> = [
    payloadObj.url,
    payloadObj.redirectUrl,
    payloadObj.redirect,
    redirectObj?.url,
    redirectObj?.to,
    redirectObj?.href,
    redirectObj?.location,
  ];
  const direct = directCandidates.find((v) => typeof v === "string") as
    string | undefined;
  if (direct && direct.length > 0) return direct;

  const looksLikeUrl = (v: unknown): v is string =>
    typeof v === "string" && (v.startsWith("http") || v.startsWith("/"));

  const deepFind = (obj: unknown, depth: number): string | null => {
    if (depth < 0) return null;
    if (looksLikeUrl(obj)) return obj;
    if (!isJsonObject(obj)) return null;
    for (const key of [
      "url",
      "href",
      "to",
      "location",
      "redirectUrl",
      "redirectURL",
      "callbackURL",
      "callbackUrl",
    ]) {
      const val = obj[key];
      if (looksLikeUrl(val)) return val;
    }
    for (const val of Object.values(obj)) {
      const found = deepFind(val, depth - 1);
      if (found) return found;
    }
    return null;
  };

  return deepFind(payloadObj.redirect, 2);
};

const toAbsoluteUrl = (maybeUrl: string, backendBaseUrl: string): string => {
  try {
    return new URL(maybeUrl).toString();
  } catch {
    const { origin } = new URL(backendBaseUrl);
    return new URL(maybeUrl, origin).toString();
  }
};

const rewriteSetCookieForLocalDev = (cookie: string, reqUrl: URL): string => {
  const { hostname } = reqUrl;
  const isLocalhost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

  const baseDomain = "onchainsuite.com";
  const isOnchainSuiteDomain =
    hostname === baseDomain || hostname.endsWith(`.${baseDomain}`);

  let updated = cookie;

  if (isLocalhost) {
    updated = updated.replace(/;\s*Domain=[^;]+/i, "");
    if (/;\s*Path=/i.test(updated)) {
      updated = updated.replace(/;\s*Path=[^;]+/i, "; Path=/");
    } else {
      updated = `${updated}; Path=/`;
    }

    if (reqUrl.protocol === "http:") {
      updated = updated.replace(/;\s*Secure/gi, "");
      updated = updated.replace(/;\s*SameSite=None/gi, "; SameSite=Lax");
    }

    return updated;
  }

  if (isOnchainSuiteDomain) {
    const name = updated.split("=", 1)[0]?.trim() ?? "";
    const isBetterAuthCookie =
      /^(?:__Secure-|__Host-)?better-auth\./.test(name) ||
      /^better-auth\./.test(name);
    const isHostPrefixed = name.startsWith("__Host-");
    if (isBetterAuthCookie && !isHostPrefixed) {
      updated = updated.replace(/;\s*Domain=[^;]+/i, "");
      updated = `${updated}; Domain=.${baseDomain}`;
    }
  }

  return updated;
};

const getBackendApiKey = () => {
  return pickNonEmpty(
    process.env.BACKEND_API_KEY,
    process.env.NEXT_PUBLIC_BACKEND_API_KEY,
    process.env.NEXT_PUBLIC_API_KEY
  );
};

const withAuthHeaders = (
  base: Headers,
  token: string | null,
  cookieHeader: string
) => {
  const headers = new Headers(base);
  if (cookieHeader) headers.set("Cookie", cookieHeader);
  const hasBetterAuthSession = Boolean(extractBetterAuthSession(cookieHeader));
  if (token && !hasBetterAuthSession && !headers.has("authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const apiKey = getBackendApiKey();
  if (apiKey && !headers.has("x-api-key")) {
    headers.set("x-api-key", apiKey);
  }
  return headers;
};

const appendOnchainUserCookie = (
  response: NextResponse,
  user: unknown,
  token?: string | null
) => {
  if (token && token.length > 0) {
    response.headers.append(
      "set-cookie",
      `onchain.token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax`
    );
  }
  if (user) {
    const encoded = encodeURIComponent(
      Buffer.from(JSON.stringify(user), "utf8").toString("base64")
    );
    response.headers.append(
      "set-cookie",
      `onchain.user=${encoded}; Path=/; HttpOnly; SameSite=Lax`
    );
  }
};

const clearOnchainMirrorCookies = (response: NextResponse) => {
  response.headers.append(
    "set-cookie",
    "onchain.token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  );
  response.headers.append(
    "set-cookie",
    "onchain.user=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  );
};

/**
 * Why `get-session` came back without a session.
 *
 * Four different causes collapsed into a body of `null`: no cookie was sent,
 * the backend rejected the cookie it was sent, the backend was unreachable, or
 * the profile fallback also came back empty. From the browser they are
 * identical, so "No active session found. Please sign in again." was the only
 * thing anyone could report — and it is the one sentence that fits all four.
 *
 * A response HEADER rather than a body field: better-auth parses the body and
 * an extra key risks confusing its client, whereas a header is inert to every
 * consumer and visible in the Network tab, which is where someone debugging
 * this is already looking.
 */
const withSessionMiss = (res: NextResponse, reason: string) => {
  res.headers.set("x-session-miss", reason);
  return res;
};

const buildFallbackSessionResponse = async (args: {
  backendBase: string;
  cookieHeader: string;
  onchainToken: string | null;
  onchainUser: unknown | null;
  cacheKey: string;
}) => {
  const profileTry = await fetch(`${args.backendBase}/user/profile`, {
    method: "GET",
    headers: withAuthHeaders(
      new Headers(),
      args.onchainToken,
      args.cookieHeader
    ),
    cache: "no-store",
  }).catch(() => null);

  if (profileTry?.ok) {
    const profileJson = await profileTry.json().catch(() => null);
    const user = normalizeUserFromResponse(profileJson);
    if (user) {
      const json = {
        session: args.onchainToken ? { token: args.onchainToken } : {},
        user,
      };
      const res = NextResponse.json(
        {
          ...json,
        },
        { status: 200 }
      );
      appendOnchainUserCookie(res, user, args.onchainToken);
      res.headers.set("cache-control", "private, max-age=10");
      getSessionCache.set(args.cacheKey, { at: Date.now(), status: 200, json });
      return res;
    }
  }

  if (args.onchainUser) {
    const json = {
      session: args.onchainToken ? { token: args.onchainToken } : {},
      user: args.onchainUser,
    };
    const res = NextResponse.json(
      {
        ...json,
      },
      { status: 200 }
    );
    res.headers.set("cache-control", "private, max-age=10");
    getSessionCache.set(args.cacheKey, { at: Date.now(), status: 200, json });
    return res;
  }

  return null;
};

const forward = async (
  req: NextRequest,
  path: string[],
  overrideMethod?: string
) => {
  const url = new URL(req.url);
  const isOrganizationPlugin = path.length >= 1 && path[0] === "organization";
  const targetUrl = isOrganizationPlugin
    ? `${getBackendBaseUrl()}/organization/${path.slice(1).join("/")}${url.search}`
    : `${getBackendBaseUrl()}/auth/${path.join("/")}${url.search}`;

  const method = (overrideMethod ?? req.method).toUpperCase();
  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("accept-encoding");
  const backendOrigin = new URL(getBackendBaseUrl()).origin;
  const requestOrigin = url.origin;
  const baseDomain = "onchainsuite.com";
  const isOnchainSuiteDomain =
    url.hostname === baseDomain || url.hostname.endsWith(`.${baseDomain}`);
  const isLocalhost =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "::1";
  const upstreamOrigin = isOnchainSuiteDomain ? backendOrigin : requestOrigin;
  headers.set("origin", isLocalhost ? requestOrigin : upstreamOrigin);
  headers.set("referer", `${isLocalhost ? requestOrigin : upstreamOrigin}/`);

  const cookieHeader = req.headers.get("cookie") ?? "";
  const onchainToken = extractOnchainToken(cookieHeader);
  const onchainUser = extractOnchainUser(cookieHeader);

  const upstreamHeaders = withAuthHeaders(headers, onchainToken, cookieHeader);

  const isGetSession =
    method === "GET" && path.length === 1 && path[0] === "get-session";
  if (isGetSession) {
    const cacheKey = getSessionCacheKey(cookieHeader, onchainToken);
    const cached = getSessionCache.get(cacheKey);
    if (cached && Date.now() - cached.at <= GET_SESSION_CACHE_TTL_MS) {
      const res = NextResponse.json(cached.json, { status: cached.status });
      res.headers.set("cache-control", "private, max-age=10");
      return res;
    }

    const backendBase = getBackendBaseUrl();
    let upstream: Response;
    try {
      upstream = await fetch(`${backendBase}/auth/get-session`, {
        method: "GET",
        headers: upstreamHeaders,
        cache: "no-store",
      });
    } catch {
      return withSessionMiss(
        NextResponse.json(
          {
            error: "upstream_unreachable",
            message: "Authentication service is unavailable",
          },
          { status: 502 }
        ),
        "upstream-unreachable"
      );
    }

    if (!upstream.ok) {
      const fallback = await buildFallbackSessionResponse({
        backendBase,
        cookieHeader,
        onchainToken,
        onchainUser,
        cacheKey,
      });
      if (fallback) return fallback;
    } else {
      const responseHeaders = new Headers(upstream.headers);
      responseHeaders.delete("connection");
      responseHeaders.delete("transfer-encoding");
      responseHeaders.delete("content-length");
      responseHeaders.delete("content-encoding");
      responseHeaders.delete("set-cookie");

      const contentType = responseHeaders.get("content-type") ?? "";
      const canJson = contentType.includes("application/json");
      if (canJson) {
        const json = await upstream.json().catch(() => null);
        const user = normalizeUserFromResponse(json);
        if (!user) {
          const fallback = await buildFallbackSessionResponse({
            backendBase,
            cookieHeader,
            onchainToken,
            onchainUser,
            cacheKey,
          });
          if (fallback) return fallback;
        }
        const res = NextResponse.json(json, { status: upstream.status });
        if (!user) {
          // The cookie header tells these two apart, and they need opposite
          // responses: send the user to sign in, or go and look at why a
          // present cookie was refused.
          withSessionMiss(
            res,
            extractBetterAuthSession(cookieHeader)
              ? "cookie-rejected-by-backend"
              : "no-session-cookie-sent"
          );
        }
        for (const cookie of getSetCookieHeaders(upstream.headers)) {
          res.headers.append(
            "set-cookie",
            rewriteSetCookieForLocalDev(cookie, url)
          );
        }
        if (user) appendOnchainUserCookie(res, user, onchainToken);
        res.headers.set("cache-control", "private, max-age=10");
        if (user) {
          getSessionCache.set(cacheKey, {
            at: Date.now(),
            status: upstream.status,
            json,
          });
        }
        return res;
      }

      const body =
        upstream.status === 204 ? null : await upstream.arrayBuffer();
      const nextResponse = new NextResponse(body, {
        status: upstream.status,
        headers: responseHeaders,
      });

      for (const cookie of getSetCookieHeaders(upstream.headers)) {
        nextResponse.headers.append(
          "set-cookie",
          rewriteSetCookieForLocalDev(cookie, url)
        );
      }

      return nextResponse;
    }
  }

  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? await req.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method,
      headers: upstreamHeaders,
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      {
        error: "upstream_unreachable",
        message: "Authentication service is unavailable",
      },
      { status: 502 }
    );
  }

  // Endpoints that establish a session: mirror the session token into the
  // onchain.* cookies just like email sign-in (passkey + 2FA verification
  // complete a sign-in too).
  const isSignInEmail =
    method === "POST" &&
    path.length >= 2 &&
    ((path[0] === "sign-in" && path[1] === "email") ||
      (path[0] === "passkey" && path[1] === "verify-authentication") ||
      (path[0] === "two-factor" &&
        (path[1] === "verify-totp" || path[1] === "verify-backup-code")));
  const isSignOut =
    method === "POST" &&
    path.length >= 1 &&
    (path[0] === "sign-out" || path[0] === "logout");

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("connection");
  responseHeaders.delete("transfer-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("set-cookie");

  const responseBody =
    upstream.status === 204 ? null : await upstream.arrayBuffer();

  const nextResponse = new NextResponse(responseBody, {
    status: upstream.status,
    headers: responseHeaders,
  });

  const setCookies = getSetCookieHeaders(upstream.headers);

  for (const cookie of setCookies) {
    nextResponse.headers.append(
      "set-cookie",
      rewriteSetCookieForLocalDev(cookie, url)
    );
  }

  if (isSignInEmail) {
    const contentType = upstream.headers.get("content-type") ?? "";
    if (contentType.includes("application/json") && responseBody) {
      try {
        const text = new TextDecoder().decode(responseBody);
        const json: unknown = JSON.parse(text);
        const jsonObj = isJsonObject(json) ? json : {};
        const jsonData = isJsonObject(jsonObj.data) ? jsonObj.data : {};
        const jsonSession = isJsonObject(jsonObj.session)
          ? jsonObj.session
          : {};
        const jsonDataSession = isJsonObject(jsonData.session)
          ? jsonData.session
          : {};
        const candidates: Array<string | undefined> = [
          asString(jsonObj.token),
          asString(jsonObj.accessToken),
          asString(jsonObj.sessionToken),
          asString(jsonData.token),
          asString(jsonData.accessToken),
          asString(jsonData.sessionToken),
          asString(jsonSession.token),
          asString(jsonDataSession.token),
        ];
        const token =
          candidates.find((t) => typeof t === "string" && t.length > 20) ??
          null;

        if (typeof token === "string" && token.length > 0) {
          nextResponse.headers.append(
            "set-cookie",
            `onchain.token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax`
          );
          const user = normalizeUserFromResponse(json);
          if (user) {
            const encoded = encodeURIComponent(
              Buffer.from(JSON.stringify(user), "utf8").toString("base64")
            );
            nextResponse.headers.append(
              "set-cookie",
              `onchain.user=${encoded}; Path=/; HttpOnly; SameSite=Lax`
            );
          }
        }

        const redirectUrl = getRedirectUrlFromResponse(json);
        if (redirectUrl) {
          try {
            const absoluteUrl = toAbsoluteUrl(redirectUrl, targetUrl);
            const redirectRes = await fetch(absoluteUrl, {
              method: "GET",
              headers: {
                "accept-encoding": "identity",
              },
              redirect: "manual",
              cache: "no-store",
            });

            for (const cookie of getSetCookieHeaders(redirectRes.headers)) {
              nextResponse.headers.append(
                "set-cookie",
                rewriteSetCookieForLocalDev(cookie, url)
              );
            }
          } catch (_e) {
            console.error("Failed to follow redirect", _e);
          }
        }
      } catch (_e) {
        String(_e);
      }
    }
  }

  if (isSignOut) {
    clearOnchainMirrorCookies(nextResponse);
    getSessionCache.clear();
  }

  return nextResponse;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return forward(req, path, "GET");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return forward(req, path, "POST");
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return forward(req, path, "PUT");
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return forward(req, path, "PATCH");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return forward(req, path, "DELETE");
}

export async function OPTIONS(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return forward(req, path, "OPTIONS");
}
