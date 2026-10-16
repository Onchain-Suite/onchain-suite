import { type NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth-session";
import { getSelectedOrganizationId } from "@/lib/utils";

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
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
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

const appendUniqueQueryParams = (
  target: URLSearchParams,
  key: string,
  values: string[]
) => {
  const seen = new Set<string>();
  for (const value of values) {
    const pieces = value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    for (const piece of pieces) {
      if (seen.has(piece)) continue;
      seen.add(piece);
      target.append(key, piece);
    }
  }
};

const resolveOrgId = async (req: NextRequest) => {
  const session = await getSession();
  if (!session?.user?.id && !session?.user?.email) {
    return {
      session: null,
      orgId: null,
    } as const;
  }

  const orgIdCandidate = pickNonEmpty(
    req.headers.get("x-org-id"),
    req.nextUrl.searchParams.get("x-org-id"),
    req.nextUrl.searchParams.get("orgId"),
    typeof session.session?.activeOrganizationId === "string"
      ? session.session.activeOrganizationId
      : "",
    getSelectedOrganizationId(req.headers.get("cookie") ?? "")
  );
  const orgId = orgIdCandidate.length > 0 ? orgIdCandidate : null;

  return {
    session,
    orgId,
  } as const;
};

const buildUpstreamHeaders = (req: NextRequest, orgId: string) => {
  const upstreamHeaders = new Headers();
  upstreamHeaders.set("x-org-id", orgId);
  upstreamHeaders.set("accept", "text/event-stream");

  const cookie = req.headers.get("cookie");
  if (cookie) upstreamHeaders.set("cookie", cookie);

  const auth = req.headers.get("authorization");
  if (auth) upstreamHeaders.set("authorization", auth);

  const apiKey = getBackendApiKey();
  if (apiKey) upstreamHeaders.set("x-api-key", apiKey);

  return upstreamHeaders;
};

const buildStreamHeaders = (req: NextRequest) => {
  const headers = new Headers();
  headers.set("Content-Type", "text/event-stream; charset=utf-8");
  headers.set("Cache-Control", "no-cache, no-transform");
  headers.set("Connection", "keep-alive");

  const cors = getCorsHeaders(req);
  if (cors) {
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);
  }

  return headers;
};

const forwardStreamRequest = async (args: {
  req: NextRequest;
  method: "GET" | "POST";
  orgId: string;
  upstreamUrl: string;
  body?: string;
}) => {
  const startedAt = Date.now();
  const ip = getClientIp(args.req);
  const rateKey = `intelligence-agent-stream:${args.orgId}:${ip}`;
  const rate = enforceRateLimit(rateKey);
  if (!rate.ok) {
    const res = jsonError(
      args.req,
      429,
      "RATE_LIMITED",
      "Too many streaming requests. Please retry shortly."
    );
    const retrySeconds = Math.ceil(rate.retryAfterMs / 1000);
    res.headers.set("Retry-After", String(Math.max(1, retrySeconds)));
    return res;
  }

  const upstreamHeaders = buildUpstreamHeaders(args.req, args.orgId);
  if (args.method === "POST") {
    upstreamHeaders.set("content-type", "application/json");
  }

  const upstream = await fetch(args.upstreamUrl, {
    method: args.method,
    headers: upstreamHeaders,
    cache: "no-store",
    body: args.method === "POST" ? (args.body ?? "{}") : undefined,
  });

  const latencyMs = Date.now() - startedAt;
  console.warn("[api] intelligence/agent/stream", {
    at: new Date().toISOString(),
    method: args.method,
    orgId: args.orgId,
    ip,
    ok: upstream.ok,
    status: upstream.status,
    latencyMs,
  });

  if (!upstream.ok || !upstream.body) {
    const msg = await upstream.text().catch(() => "");
    const preview = msg.length > 300 ? `${msg.slice(0, 300)}...` : msg;
    return jsonError(
      args.req,
      upstream.status || 502,
      "UPSTREAM_ERROR",
      preview.length > 0 ? preview : "Upstream streaming request failed."
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: buildStreamHeaders(args.req),
  });
};

export async function OPTIONS(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const res = new NextResponse(null, { status: 204 });
  if (cors) {
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  }
  return res;
}

export async function GET(req: NextRequest) {
  try {
    const { session, orgId } = await resolveOrgId(req);
    if (!session) {
      return jsonError(req, 401, "UNAUTHORIZED", "Authentication required.");
    }
    if (!orgId) {
      return jsonError(
        req,
        400,
        "MISSING_ORG",
        "Organization context is required."
      );
    }

    const { searchParams } = new URL(req.url);
    const upstreamParams = new URLSearchParams();

    const passthroughKeys = [
      "prompt",
      "sql",
      "protocol",
      "chain",
      "contractAddress",
      "walletAddress",
      "mode",
      "maxSteps",
      "useProjectSettings",
      "useProtocolRegistry",
    ] as const;

    passthroughKeys.forEach((key) => {
      const value = searchParams.get(key);
      if (typeof value === "string" && value.trim().length > 0) {
        upstreamParams.set(key, value.trim());
      }
    });

    appendUniqueQueryParams(
      upstreamParams,
      "chains",
      searchParams.getAll("chains")
    );
    appendUniqueQueryParams(
      upstreamParams,
      "contractAddresses",
      searchParams.getAll("contractAddresses")
    );
    appendUniqueQueryParams(
      upstreamParams,
      "walletAddresses",
      searchParams.getAll("walletAddresses")
    );

    for (const contract of searchParams.getAll("contracts")) {
      const trimmed = contract.trim();
      if (trimmed.length > 0) upstreamParams.append("contracts", trimmed);
    }

    const backendBase = getBackendBaseUrl();
    const queryString = upstreamParams.toString();
    const upstreamUrl =
      queryString.length > 0
        ? `${backendBase}/intelligence/query/agent/query/stream?${queryString}`
        : `${backendBase}/intelligence/query/agent/query/stream`;

    return forwardStreamRequest({
      req,
      method: "GET",
      orgId,
      upstreamUrl,
    });
  } catch (error) {
    console.error("[api] intelligence/agent/stream error", error);
    return jsonError(
      req,
      500,
      "INTERNAL",
      "Failed to stream the agent response."
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, orgId } = await resolveOrgId(req);
    if (!session) {
      return jsonError(req, 401, "UNAUTHORIZED", "Authentication required.");
    }
    if (!orgId) {
      return jsonError(
        req,
        400,
        "MISSING_ORG",
        "Organization context is required."
      );
    }

    const bodyText = await req.text();
    const trimmedBody = bodyText.trim();
    const backendBase = getBackendBaseUrl();
    const upstreamUrl = `${backendBase}/intelligence/query/agent/query/stream`;

    return forwardStreamRequest({
      req,
      method: "POST",
      orgId,
      upstreamUrl,
      body: trimmedBody.length > 0 ? trimmedBody : "{}",
    });
  } catch (error) {
    console.error("[api] intelligence/agent/stream error", error);
    return jsonError(
      req,
      500,
      "INTERNAL",
      "Failed to stream the agent response."
    );
  }
}
