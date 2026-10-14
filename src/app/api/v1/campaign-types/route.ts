import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth-session";

import { campaignTypeStore } from "./store";

export const dynamic = "force-dynamic";

const pickNonEmpty = (...values: Array<string | undefined | null>) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
};

const DEFAULT_ALLOWED_ORIGINS = new Set<string>([
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
]);

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

const okJson = (req: NextRequest, payload: unknown, status = 200) => {
  const cors = getCorsHeaders(req);
  const res = NextResponse.json(payload, { status });
  if (cors) {
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  }
  return res;
};

const jsonError = (
  req: NextRequest,
  status: number,
  code: string,
  message: string
) => okJson(req, { error: { code, message } }, status);

const getClientIp = (req: NextRequest): string => {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  return realIp && realIp.length > 0 ? realIp : "unknown";
};

type RateState = { count: number; resetAtMs: number };
const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX = 30;
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

const isAdmin = (session: Awaited<ReturnType<typeof getSession>> | null) => {
  const role = session?.user?.role;
  if (typeof role !== "string") return false;
  const normalized = role.toLowerCase();
  return normalized === "admin" || normalized === "owner";
};

const recordSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Z][A-Z0-9_]*$/, "id must be uppercase snake_case")
    .optional(),
  label: z.string().trim().min(1).max(100),
  channels: z.array(z.string().trim().min(1).max(32)).default([]),
  supportsSchedule: z.boolean().default(true),
  supportsSequence: z.boolean().default(false),
});

const toIdFromLabel = (label: string) =>
  label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64) || "CUSTOM_TYPE";

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

    const rateKey = `campaign-types:list:${orgId}:${ip}`;
    const rate = enforceRateLimit(rateKey);
    if (!rate.ok) {
      const res = jsonError(req, 429, "RATE_LIMITED", "Too many requests.");
      const retrySeconds = Math.ceil(rate.retryAfterMs / 1000);
      res.headers.set("Retry-After", String(Math.max(1, retrySeconds)));
      return res;
    }

    const items = campaignTypeStore
      .list(orgId)
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id));

    console.warn("[api] campaign-types list", {
      at: new Date().toISOString(),
      orgId,
      ip,
      ok: true,
      status: 200,
      latencyMs: Date.now() - startedAt,
      count: items.length,
    });

    return okJson(req, { data: items }, 200);
  } catch (e) {
    console.error("[api] campaign-types list error", e);
    return jsonError(req, 500, "INTERNAL", "Failed to list campaign types.");
  }
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const ip = getClientIp(req);

  try {
    const session = await getSession();
    if (!session?.user?.id && !session?.user?.email) {
      return jsonError(req, 401, "UNAUTHORIZED", "Authentication required.");
    }

    if (!isAdmin(session)) {
      return jsonError(req, 403, "FORBIDDEN", "Admin access required.");
    }

    const orgId = (req.headers.get("x-org-id") ?? "").trim();
    if (orgId.length === 0) {
      return jsonError(req, 400, "MISSING_ORG", "x-org-id header is required.");
    }

    const rateKey = `campaign-types:create:${orgId}:${ip}`;
    const rate = enforceRateLimit(rateKey);
    if (!rate.ok) {
      const res = jsonError(req, 429, "RATE_LIMITED", "Too many requests.");
      const retrySeconds = Math.ceil(rate.retryAfterMs / 1000);
      res.headers.set("Retry-After", String(Math.max(1, retrySeconds)));
      return res;
    }

    const json = await req.json().catch(() => null);
    const parsed = recordSchema.safeParse(json);
    if (!parsed.success) {
      return jsonError(req, 422, "VALIDATION_FAILED", "Invalid request body.");
    }

    const id = parsed.data.id ?? toIdFromLabel(parsed.data.label);
    const existing = campaignTypeStore.get(orgId, id);
    if (existing) {
      return jsonError(
        req,
        409,
        "CONFLICT",
        `Campaign type '${id}' already exists.`
      );
    }

    const record = campaignTypeStore.create(orgId, {
      id,
      label: parsed.data.label,
      channels: parsed.data.channels,
      supportsSchedule: parsed.data.supportsSchedule,
      supportsSequence: parsed.data.supportsSequence,
      isSystem: false,
    });

    console.warn("[api] campaign-types create", {
      at: new Date().toISOString(),
      orgId,
      ip,
      ok: true,
      status: 201,
      latencyMs: Date.now() - startedAt,
      id: record.id,
    });

    return okJson(req, { data: record }, 201);
  } catch (e) {
    console.error("[api] campaign-types create error", e);
    return jsonError(req, 500, "INTERNAL", "Failed to create campaign type.");
  }
}
