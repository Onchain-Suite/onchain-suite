import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { hasSessionCookie } from "@/lib/auth-cookie";
import { getSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

const DEFAULT_BACKEND_BASE_PROD = "https://api.onchainsuite.com/api/v1";
const DEFAULT_BACKEND_BASE_DEV = "http://127.0.0.1:3333/api/v1";

const DEFAULT_ALLOWED_ORIGINS = new Set<string>([
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "https://editor.onchainsuite.com",
  "https://email-builder-js-ycf8.onrender.com",
]);

const pickNonEmpty = (...values: Array<string | undefined | null>) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
};

const getBackendBaseUrl = () => {
  const backendUrl = pickNonEmpty(
    process.env.BACKEND_URL,
    process.env.NEXT_PUBLIC_BACKEND_URL,
    process.env.NODE_ENV === "production"
      ? DEFAULT_BACKEND_BASE_PROD
      : DEFAULT_BACKEND_BASE_DEV
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
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

const hasBetterAuthSessionCookie = (cookieHeader: string) =>
  hasSessionCookie(cookieHeader);

const extractBearer = (authorizationHeader: string | null): string | null => {
  if (!authorizationHeader) return null;
  const trimmed = authorizationHeader.trim();
  if (trimmed.length === 0) return null;
  const match = /^Bearer\s+(.+)$/i.exec(trimmed);
  if (!match) return null;
  const token = match[1]?.trim() ?? "";
  return token.length > 0 ? token : null;
};

const getBackendApiKey = () => {
  return pickNonEmpty(
    process.env.BACKEND_API_KEY,
    process.env.NEXT_PUBLIC_BACKEND_API_KEY,
    process.env.NEXT_PUBLIC_API_KEY
  );
};

const getClientIp = (req: NextRequest): string => {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  return realIp && realIp.length > 0 ? realIp : "unknown";
};

const getCorsHeaders = (req: NextRequest) => {
  const origin = req.headers.get("origin");
  if (!origin) return null;

  const allowed = new Set(DEFAULT_ALLOWED_ORIGINS);
  const extra = pickNonEmpty(process.env.NEXT_PUBLIC_APP_URL);
  if (extra) {
    try {
      allowed.add(new URL(extra).origin);
    } catch {
      allowed.add(extra);
    }
  }

  if (!allowed.has(origin)) return null;

  const requestHeaders =
    req.headers.get("access-control-request-headers") ??
    "content-type, authorization, x-api-key, x-org-id";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": requestHeaders,
    Vary: "Origin",
  };
};

const jsonError = (
  req: NextRequest,
  status: number,
  code: string,
  message: string
) => {
  const cors = getCorsHeaders(req);
  const res = NextResponse.json(
    {
      error: { code, message },
    },
    { status }
  );
  if (cors) {
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  }
  return res;
};

type RateState = { count: number; resetAtMs: number };
const RATE_LIMIT_WINDOW_MS = 30_000;
const RATE_LIMIT_MAX = 10;
const rateState = new Map<string, RateState>();

const enforceRateLimit = (key: string) => {
  const now = Date.now();
  const existing = rateState.get(key);
  if (!existing || existing.resetAtMs <= now) {
    rateState.set(key, { count: 1, resetAtMs: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true as const };
  }
  if (existing.count >= RATE_LIMIT_MAX) {
    return {
      ok: false as const,
      retryAfterMs: Math.max(0, existing.resetAtMs - now),
    };
  }
  existing.count += 1;
  return { ok: true as const };
};

const querySchema = z.object({
  query: z.string().trim().min(1).max(4000),
  mode: z.enum(["fast", "best"]).optional(),
});

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const res = new NextResponse(null, { status: 204 });
  if (cors) {
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  }
  return res;
}

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const ip = getClientIp(req);

  try {
    const session = await getSession();
    if (!session?.user?.id && !session?.user?.email) {
      return jsonError(req, 401, "UNAUTHORIZED", "Authentication required.");
    }

    const orgId = (req.headers.get("x-org-id") ?? "").trim();
    if (orgId.length === 0) {
      return jsonError(req, 400, "MISSING_ORG", "x-org-id header is required.");
    }

    const rateKey = `query-text-stream:${orgId}:${ip}`;
    const rate = enforceRateLimit(rateKey);
    if (!rate.ok) {
      const res = jsonError(
        req,
        429,
        "RATE_LIMITED",
        "Too many streaming requests. Please retry shortly."
      );
      const retrySeconds = Math.ceil(rate.retryAfterMs / 1000);
      res.headers.set("Retry-After", String(Math.max(1, retrySeconds)));
      return res;
    }

    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
      query: searchParams.get("query"),
      mode: searchParams.get("mode"),
    });

    if (!parsed.success) {
      return jsonError(
        req,
        422,
        "VALIDATION_FAILED",
        "Invalid query parameters."
      );
    }

    const upstreamParams = new URLSearchParams();
    upstreamParams.set("query", parsed.data.query);
    if (parsed.data.mode) upstreamParams.set("mode", parsed.data.mode);

    const backendBase = getBackendBaseUrl();
    const upstreamUrl = `${backendBase}/query/text/stream?${upstreamParams.toString()}`;

    const upstreamHeaders = new Headers();
    upstreamHeaders.set("x-org-id", orgId);
    upstreamHeaders.set("accept", "text/event-stream");

    const cookie = req.headers.get("cookie");
    if (cookie) upstreamHeaders.set("cookie", cookie);

    const auth = req.headers.get("authorization");
    if (auth) upstreamHeaders.set("authorization", auth);

    // Session-token normalization, mirroring the catch-all proxy's
    // ensureBackendAuthHeaders: the app's own `onchain.token` cookie is not
    // understood by the backend guard, so when no Bearer and no better-auth
    // session cookie are present, promote it to an Authorization header.
    // Without this, palette "ask AI" requests reach the backend
    // unauthenticated and fail with 401 while every catch-all-proxied route
    // works.
    if (!extractBearer(auth)) {
      const tokenFromHeader = req.headers.get("x-session-token");
      const tokenFromCookie =
        cookie && !hasBetterAuthSessionCookie(cookie)
          ? extractTokenFromCookie(cookie)
          : null;
      const headerToken = tokenFromHeader?.trim();
      const token =
        headerToken && headerToken.length > 0 ? headerToken : tokenFromCookie;
      if (token) {
        upstreamHeaders.set("authorization", `Bearer ${token}`);
        if (!upstreamHeaders.has("x-session-token")) {
          upstreamHeaders.set("x-session-token", token);
        }
      }
    }

    const apiKey = getBackendApiKey();
    if (apiKey) upstreamHeaders.set("x-api-key", apiKey);

    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: upstreamHeaders,
      cache: "no-store",
    });

    const latencyMs = Date.now() - startedAt;
    console.warn("[api] query/text/stream", {
      at: new Date().toISOString(),
      orgId,
      ip,
      ok: upstream.ok,
      status: upstream.status,
      latencyMs,
    });

    if (!upstream.ok || !upstream.body) {
      const msg = await upstream.text().catch(() => "");
      const preview = msg.length > 300 ? `${msg.slice(0, 300)}…` : msg;
      return jsonError(
        req,
        upstream.status || 502,
        "UPSTREAM_ERROR",
        preview.length > 0 ? preview : "Upstream streaming request failed."
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", "text/event-stream; charset=utf-8");
    headers.set("Cache-Control", "no-cache, no-transform");
    headers.set("Connection", "keep-alive");

    const cors = getCorsHeaders(req);
    if (cors) {
      for (const [k, v] of Object.entries(cors)) headers.set(k, v);
    }

    return new Response(upstream.body, { status: 200, headers });
  } catch (e) {
    console.error("[api] query/text/stream error", e);
    return jsonError(req, 500, "INTERNAL", "Failed to stream AI response.");
  }
}
