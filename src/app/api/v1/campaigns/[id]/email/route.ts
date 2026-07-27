import { type NextRequest, NextResponse } from "next/server";

import { extractEmailContent, isJsonObject } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DEFAULT_EDITOR_ORIGIN_PROD = "https://editor.onchainsuite.com";
const DEFAULT_EDITOR_ORIGIN_DEV = "https://email-builder-js-ycf8.onrender.com";

const pickNonEmpty = (...values: Array<string | undefined | null>) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return "";
};

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

const extractTokenFromCookie = (cookieHeader: string): string | null => {
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

const getBackendApiKey = () => {
  return pickNonEmpty(
    process.env.BACKEND_API_KEY,
    process.env.NEXT_PUBLIC_BACKEND_API_KEY,
    process.env.NEXT_PUBLIC_API_KEY
  );
};

const getAllowedCorsOrigins = () => {
  const allowed = new Set<string>([
    DEFAULT_EDITOR_ORIGIN_PROD,
    DEFAULT_EDITOR_ORIGIN_DEV,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
  ]);

  const extra = pickNonEmpty(process.env.NEXT_PUBLIC_EMAIL_EDITOR_ORIGIN);
  if (extra) {
    try {
      allowed.add(new URL(extra).origin);
    } catch {
      allowed.add(extra.trim());
    }
  }

  return allowed;
};

const getCorsHeaders = (req: NextRequest) => {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  const allowed = getAllowedCorsOrigins();
  if (!allowed.has(origin)) return null;

  const requestHeaders =
    req.headers.get("access-control-request-headers") ??
    "content-type, authorization, x-api-key, x-org-id";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
    "Access-Control-Allow-Headers": requestHeaders,
    Vary: "Origin",
  };
};

const extractBearer = (authorizationHeader: string | null): string | null => {
  if (!authorizationHeader) return null;
  const trimmed = authorizationHeader.trim();
  if (trimmed.length === 0) return null;
  const match = /^Bearer\s+(.+)$/i.exec(trimmed);
  if (!match) return null;
  const token = match[1]?.trim() ?? "";
  return token.length > 0 ? token : null;
};

const resolveToken = (req: NextRequest) => {
  const tokenFromAuth = extractBearer(req.headers.get("authorization"));
  const tokenFromHeader =
    req.headers.get("x-editor-token") ?? req.headers.get("x-session-token");
  const tokenFromQuery =
    req.nextUrl.searchParams.get("token") ??
    req.nextUrl.searchParams.get("sessionToken") ??
    req.nextUrl.searchParams.get("editorToken");
  const tokenFromCookie = extractTokenFromCookie(
    req.headers.get("cookie") ?? ""
  );
  return (
    tokenFromAuth ??
    tokenFromHeader ??
    tokenFromQuery ??
    tokenFromCookie ??
    null
  );
};

/**
 * Every better-auth session cookie name we may receive. Kept in step with
 * `getSession()` in @/lib/auth-session, which accepts the same set — the
 * secure/host prefixes vary by deployment.
 */
const SESSION_COOKIE_RE =
  /(^|;\s*)(__Secure-|__Host-)?better-auth\.(session_token|sessionToken)=/;

const hasSessionCookie = (req: NextRequest): boolean =>
  SESSION_COOKIE_RE.test(req.headers.get("cookie") ?? "");

/**
 * This route serves two callers: the embedded editor, which authenticates
 * with an editor-session token, and the host app itself, which calls it
 * through apiClient carrying only the better-auth session cookie. Requiring a
 * token rejected the host app's own saves with "Authentication failed", so
 * accept either credential and let the backend remain the authority.
 */
const hasAnyAuth = (req: NextRequest): boolean =>
  resolveToken(req) !== null || hasSessionCookie(req);

const buildUpstreamHeaders = (req: NextRequest) => {
  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("accept-encoding");

  if (!headers.has("x-org-id")) {
    const orgIdFromQuery =
      req.nextUrl.searchParams.get("orgId") ??
      req.nextUrl.searchParams.get("xOrgId");
    if (orgIdFromQuery && orgIdFromQuery.trim().length > 0) {
      headers.set("x-org-id", orgIdFromQuery.trim());
    }
  }

  const token = resolveToken(req);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
    if (!headers.has("x-session-token")) headers.set("x-session-token", token);
    if (!headers.has("x-editor-token")) headers.set("x-editor-token", token);

    const existingCookie = headers.get("cookie") ?? "";
    const hasOnchainTokenCookie = /(^|;\s*)onchain\.token=/.test(
      existingCookie
    );

    let nextCookie = existingCookie;
    if (!SESSION_COOKIE_RE.test(existingCookie)) {
      nextCookie = `${nextCookie}${nextCookie ? "; " : ""}better-auth.session_token=${encodeURIComponent(token)}`;
    }
    if (!hasOnchainTokenCookie) {
      nextCookie = `${nextCookie}${nextCookie ? "; " : ""}onchain.token=${encodeURIComponent(token)}`;
    }
    if (nextCookie !== existingCookie) headers.set("cookie", nextCookie);
  }
  const apiKey = getBackendApiKey();
  if (apiKey && !headers.has("x-api-key")) {
    headers.set("x-api-key", apiKey);
  }

  return headers;
};

const toSavedPayload = (raw: unknown) => {
  const extracted = extractEmailContent(raw);
  const obj = isJsonObject(raw) ? raw : {};
  return {
    subject:
      typeof obj.subject === "string" && obj.subject.trim().length > 0
        ? obj.subject
        : undefined,
    previewText:
      typeof obj.previewText === "string" && obj.previewText.trim().length > 0
        ? obj.previewText
        : undefined,
    senderName:
      typeof obj.senderName === "string" && obj.senderName.trim().length > 0
        ? obj.senderName
        : undefined,
    senderEmail:
      typeof obj.senderEmail === "string" && obj.senderEmail.trim().length > 0
        ? obj.senderEmail
        : undefined,
    replyToEmail:
      typeof obj.replyToEmail === "string" && obj.replyToEmail.trim().length > 0
        ? obj.replyToEmail
        : undefined,
    html: extracted.html,
    textVersion: extracted.textVersion,
    json: extracted.json,
    assets: extracted.assets,
    to:
      typeof obj.to === "string" && obj.to.trim().length > 0
        ? obj.to
        : undefined,
    recipient: obj.recipient,
    contact: obj.contact,
    audience: obj.audience,
  };
};

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  if (!cors) return new NextResponse(null, { status: 204 });
  return new NextResponse(null, {
    status: 204,
    headers: { ...cors, "Access-Control-Max-Age": "86400" },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cors = getCorsHeaders(req);
  if (!hasAnyAuth(req)) {
    const res = NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication failed",
          details: {
            message: "No editor token and no session cookie on this request",
            error: "Missing credentials",
            statusCode: 401,
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          path: `/api/v1/campaigns/${id}/email`,
        },
      },
      { status: 401 }
    );
    if (cors) {
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    }
    return res;
  }
  const upstream = await fetch(`${getBackendBaseUrl()}/campaigns/${id}/email`, {
    method: "GET",
    headers: buildUpstreamHeaders(req),
    cache: "no-store",
  });

  const headers = new Headers(upstream.headers);
  headers.delete("connection");
  headers.delete("transfer-encoding");
  headers.delete("content-length");
  headers.delete("content-encoding");
  if (cors) {
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);
  }

  return new NextResponse(
    upstream.status === 204 ? null : await upstream.arrayBuffer(),
    { status: upstream.status, headers }
  );
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cors = getCorsHeaders(req);
  if (!hasAnyAuth(req)) {
    const res = NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication failed",
          details: {
            message: "No editor token and no session cookie on this request",
            error: "Missing credentials",
            statusCode: 401,
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          path: `/api/v1/campaigns/${id}/email`,
        },
      },
      { status: 401 }
    );
    if (cors) {
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    }
    return res;
  }

  const bodyJson: unknown = await req.json().catch(() => null);

  const payload = toSavedPayload(bodyJson);
  const upstream = await fetch(`${getBackendBaseUrl()}/campaigns/${id}/email`, {
    method: "PUT",
    headers: (() => {
      const headers = buildUpstreamHeaders(req);
      if (!headers.has("content-type"))
        headers.set("content-type", "application/json");
      return headers;
    })(),
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const headers = new Headers(upstream.headers);
  headers.delete("connection");
  headers.delete("transfer-encoding");
  headers.delete("content-length");
  headers.delete("content-encoding");
  if (cors) {
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);
  }

  return new NextResponse(
    upstream.status === 204 ? null : await upstream.arrayBuffer(),
    { status: upstream.status, headers }
  );
}
