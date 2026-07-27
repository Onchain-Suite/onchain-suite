import { type NextRequest, NextResponse } from "next/server";

import { extractEmailContent, isJsonObject } from "@/lib/utils";
import {
  appendMessageToThread,
  createLabel,
  createThreadWithMessage,
  ensureDefaultLabels,
  getInboxStore,
  inboxEvents,
  type InboxFolder,
} from "@/server/inbox-state";

export const dynamic = "force-dynamic";

type AudienceImportExportFormat = "csv" | "json";
type AudienceJobState =
  "queued" | "processing" | "completed" | "failed" | "cancelled";

type AudienceImportError = {
  rowNumber?: number;
  key?: string;
  code?: string;
  message: string;
};

type AudienceImportJob = {
  jobId: string;
  orgId: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  state: AudienceJobState;
  format: AudienceImportExportFormat;
  totalRows?: number;
  processedRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: AudienceImportError[];
};

type AudienceExportJob = {
  jobId: string;
  orgId: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  state: AudienceJobState;
  format: AudienceImportExportFormat;
  processedRows: number;
  totalRows?: number;
  fileName: string;
  contentType: string;
  fileBytes: Uint8Array;
};

const audienceImportJobs = new Map<string, AudienceImportJob>();
const audienceExportJobs = new Map<string, AudienceExportJob>();

const DEFAULT_EDITOR_ORIGIN_PROD = "https://editor.onchainsuite.com";
const DEFAULT_EDITOR_ORIGIN_DEV = "https://email-builder-js-ycf8.onrender.com";

const pickNonEmpty = (...values: Array<string | undefined | null>) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return "";
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
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": requestHeaders,
    Vary: "Origin",
  };
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

const getBackendApiKey = () => {
  return pickNonEmpty(
    process.env.BACKEND_API_KEY,
    process.env.NEXT_PUBLIC_BACKEND_API_KEY,
    process.env.NEXT_PUBLIC_API_KEY
  );
};

const DEBUG_SERVER_URL =
  process.env.DEBUG_SERVER_URL ?? "http://127.0.0.1:7777/event";
const DEBUG_SESSION_ID = process.env.DEBUG_SESSION_ID ?? "email-empty-preview";
const reportEmailDebug = (
  hypothesisId: "A" | "B" | "C" | "D" | "E",
  location: string,
  msg: string,
  data: Record<string, unknown>
) => {
  fetch(DEBUG_SERVER_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      runId: "pre-fix",
      hypothesisId,
      location,
      msg,
      data,
      ts: Date.now(),
    }),
  }).catch(() => undefined);
};

const reportSettingsProfileBillingDebug = (
  hypothesisId: "A" | "B" | "C" | "D" | "E",
  location: string,
  msg: string,
  data: Record<string, unknown>
) => {
  fetch("http://127.0.0.1:7777/event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: "settings-profile-billing",
      runId: "pre-fix",
      hypothesisId,
      location,
      msg,
      data,
      ts: Date.now(),
    }),
  }).catch(() => undefined);
};

const reportMcpQueryDebug = (
  stage: "request" | "response" | "error",
  data: Record<string, unknown>
) => {
  console.warn("[api] intelligence/mcp/query", {
    at: new Date().toISOString(),
    stage,
    ...data,
  });
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
  /(^|;\s*)(?:__Secure-|__Host-)?better-auth\.(?:session_token|sessionToken)=/.test(
    cookieHeader
  );

const extractBearer = (authorizationHeader: string | null): string | null => {
  if (!authorizationHeader) return null;
  const trimmed = authorizationHeader.trim();
  if (trimmed.length === 0) return null;
  const match = /^Bearer\s+(.+)$/i.exec(trimmed);
  if (!match) return null;
  const token = match[1]?.trim() ?? "";
  return token.length > 0 ? token : null;
};

const requireOrgId = (req: NextRequest): string | null => {
  const raw = req.headers.get("x-org-id") ?? "";
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * Every better-auth session cookie name we may receive. Kept in step with
 * `getSession()` in @/lib/auth-session, which accepts the same set — the
 * secure/host prefixes and the snake/camel spelling vary by deployment, and
 * matching a narrower set here would 401 a perfectly valid session.
 */
const SESSION_COOKIE_RE =
  /(^|;\s*)(__Secure-|__Host-)?better-auth\.(session_token|sessionToken)=/;

const hasAnyAuth = (req: NextRequest): boolean => {
  const auth = req.headers.get("authorization");
  if (extractBearer(auth)) return true;
  const cookie = req.headers.get("cookie") ?? "";
  if (extractTokenFromCookie(cookie)) return true;
  return SESSION_COOKIE_RE.test(cookie);
};

const randomJobId = () => {
  const cryptoObj = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return cryptoObj.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const okJson = (req: NextRequest, payload: unknown, status = 200) => {
  const cors = getCorsHeaders(req);
  const res = NextResponse.json(payload, { status });
  if (cors) {
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  }
  return res;
};

const readJsonSafe = async (req: NextRequest): Promise<unknown> => {
  try {
    return await req.json();
  } catch {
    return null;
  }
};

const parseCsvRow = (line: string): string[] => {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      const next = i + 1 < line.length ? line[i + 1] : "";
      if (inQuotes && next === '"') {
        cur += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
};

const parseCsv = (text: string) => {
  const cleaned = text.replace(/^\uFEFF/, "");
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] as string[][] };
  const headers = parseCsvRow(lines[0]).map((h) =>
    h.replace(/^"|"$/g, "").trim()
  );
  const rows = lines.slice(1).map((line) => parseCsvRow(line));
  return { headers, rows };
};

const toTags = (raw: unknown): string[] | undefined => {
  if (Array.isArray(raw)) {
    const out = raw
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter((v) => v.length > 0);
    return out.length > 0 ? out : undefined;
  }
  if (typeof raw !== "string") return undefined;
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return parts.length > 0 ? parts : undefined;
};

const buildBackendHeaders = (req: NextRequest) => {
  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("accept-encoding");
  const backendOrigin = new URL(getBackendBaseUrl()).origin;
  const requestOrigin = req.nextUrl.origin;
  const baseDomain = "onchainsuite.com";
  const isOnchainSuiteDomain =
    req.nextUrl.hostname === baseDomain ||
    req.nextUrl.hostname.endsWith(`.${baseDomain}`);
  const isLocalhost =
    req.nextUrl.hostname === "localhost" ||
    req.nextUrl.hostname === "127.0.0.1" ||
    req.nextUrl.hostname === "::1";
  const upstreamOrigin = isOnchainSuiteDomain ? backendOrigin : requestOrigin;
  headers.set("origin", isLocalhost ? requestOrigin : upstreamOrigin);
  headers.set("referer", `${isLocalhost ? requestOrigin : upstreamOrigin}/`);
  ensureBackendAuthHeaders(req, headers);
  const apiKey = getBackendApiKey();
  if (apiKey && !headers.has("x-api-key")) headers.set("x-api-key", apiKey);
  return headers;
};

const fetchBackendJson = async (
  input: string,
  init: RequestInit
): Promise<{ ok: boolean; status: number; json: unknown; text: string }> => {
  const upstream = await fetch(input, init);
  const text = await upstream.text().catch(() => "");
  const contentType = upstream.headers.get("content-type") ?? "";
  const json =
    contentType.includes("application/json") && text.length > 0
      ? (() => {
          try {
            return JSON.parse(text);
          } catch {
            return null;
          }
        })()
      : null;
  return { ok: upstream.ok, status: upstream.status, json, text };
};

const handleAudienceImportExport = async (
  req: NextRequest,
  path: string[],
  method: string
) => {
  if (path.length < 2 || path[0] !== "audience") return null;
  const sub = path[1] ?? "";
  if (sub !== "imports" && sub !== "exports") return null;

  const orgId = requireOrgId(req);
  if (!orgId) {
    return okJson(
      req,
      {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Missing x-org-id header",
        },
        meta: {
          timestamp: new Date().toISOString(),
          path: req.nextUrl.pathname,
          requestId: "unknown",
        },
      },
      400
    );
  }

  if (!hasAnyAuth(req)) {
    return okJson(
      req,
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication failed",
          details: { error: "Missing session", statusCode: 401 },
        },
        meta: {
          timestamp: new Date().toISOString(),
          path: req.nextUrl.pathname,
          requestId: "unknown",
        },
      },
      401
    );
  }

  const backendBase = getBackendBaseUrl();
  const backendHeaders = buildBackendHeaders(req);

  if (sub === "imports") {
    const jobId = path.length >= 3 ? path[2] : null;
    const extra = path.length >= 4 ? path[3] : null;

    if (method === "POST" && !jobId) {
      const formatFromQuery = (req.nextUrl.searchParams.get("format") ?? "")
        .trim()
        .toLowerCase();
      const fd = await req.formData().catch(() => null);
      const file = fd?.get("file");
      if (!(file instanceof File)) {
        return okJson(
          req,
          {
            success: false,
            error: { code: "BAD_REQUEST", message: "Missing file" },
            meta: {
              timestamp: new Date().toISOString(),
              path: req.nextUrl.pathname,
              requestId: "unknown",
            },
          },
          400
        );
      }

      const maxBytes = 25 * 1024 * 1024;
      if (file.size > maxBytes) {
        return okJson(
          req,
          {
            success: false,
            error: { code: "PAYLOAD_TOO_LARGE", message: "File too large" },
            meta: {
              timestamp: new Date().toISOString(),
              path: req.nextUrl.pathname,
              requestId: "unknown",
            },
          },
          413
        );
      }

      const fileName = file.name.toLowerCase();
      const inferred: AudienceImportExportFormat | null = fileName.endsWith(
        ".csv"
      )
        ? "csv"
        : fileName.endsWith(".json")
          ? "json"
          : null;
      const format: AudienceImportExportFormat | null =
        formatFromQuery === "csv" || formatFromQuery === "json"
          ? (formatFromQuery as AudienceImportExportFormat)
          : inferred;

      if (!format) {
        return okJson(
          req,
          {
            success: false,
            error: {
              code: "UNSUPPORTED_MEDIA_TYPE",
              message: "Only CSV and JSON are supported",
            },
            meta: {
              timestamp: new Date().toISOString(),
              path: req.nextUrl.pathname,
              requestId: "unknown",
            },
          },
          415
        );
      }

      const mappingRaw = fd?.get("mapping");
      const mapping =
        typeof mappingRaw === "string" && mappingRaw.length > 0
          ? (() => {
              try {
                const json = JSON.parse(mappingRaw);
                return isJsonObject(json)
                  ? (json as Record<string, string>)
                  : null;
              } catch {
                return null;
              }
            })()
          : null;

      const now = new Date().toISOString();
      const createdJobId = randomJobId();
      const job: AudienceImportJob = {
        jobId: createdJobId,
        orgId,
        createdAt: now,
        startedAt: now,
        state: "processing",
        format,
        processedRows: 0,
        createdCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        errors: [],
      };
      audienceImportJobs.set(createdJobId, job);

      const text = await file.text();
      const maxRows = 2000;

      const pushError = (err: AudienceImportError) => {
        job.errors.push(err);
        job.errorCount = job.errors.length;
      };

      const upsertOne = async (
        body: Record<string, unknown>,
        rowNumber?: number
      ) => {
        const res = await fetchBackendJson(`${backendBase}/audience/profiles`, {
          method: "POST",
          headers: (() => {
            const h = new Headers(backendHeaders);
            h.set("content-type", "application/json");
            return h;
          })(),
          body: JSON.stringify(body),
          cache: "no-store",
        });
        if (res.ok) {
          job.createdCount += 1;
          return;
        }
        if (res.status === 409) {
          job.skippedCount += 1;
          return;
        }
        const msg =
          (isJsonObject(res.json) && typeof res.json.message === "string"
            ? res.json.message
            : res.text) || "Failed to import row";
        pushError({ rowNumber, message: msg });
      };

      try {
        if (format === "csv") {
          const { headers, rows } = parseCsv(text);
          job.totalRows = rows.length;
          const headerToIndex = new Map<string, number>();
          headers.forEach((h, i) => headerToIndex.set(h, i));
          const limit = Math.min(rows.length, maxRows);
          for (let i = 0; i < limit; i += 1) {
            const row = rows[i];
            const rowNumber = i + 2;
            const body: Record<string, unknown> = {};
            const attributes: Record<string, unknown> = {};
            for (const [header, idx] of headerToIndex.entries()) {
              const rawValue = idx < row.length ? row[idx] : "";
              const value = rawValue.replace(/^"|"$/g, "").trim();
              if (!value) continue;
              const target =
                mapping && typeof mapping[header] === "string"
                  ? mapping[header]
                  : header;
              const normalized = String(target).trim();
              if (!normalized) continue;
              if (normalized.startsWith("attributes.")) {
                const key = normalized.slice("attributes.".length).trim();
                if (key) attributes[key] = value;
                continue;
              }
              if (
                normalized === "walletAddress" ||
                normalized === "wallet" ||
                normalized === "wallet_address" ||
                normalized === "address"
              ) {
                body.walletAddress = value;
                body.wallet = value;
              } else if (normalized === "tags") body.tags = toTags(value);
              else body[normalized] = value;
            }
            if (Object.keys(attributes).length > 0)
              body.attributes = attributes;
            if (!body.email && !body.wallet && !body.walletAddress) {
              pushError({ rowNumber, message: "Missing email or wallet" });
              job.processedRows += 1;
              continue;
            }
            await upsertOne(body, rowNumber);
            job.processedRows += 1;
          }
        } else {
          const parsed = JSON.parse(text);
          const arr = Array.isArray(parsed)
            ? parsed
            : isJsonObject(parsed) &&
                Array.isArray((parsed as { data?: unknown }).data)
              ? ((parsed as { data?: unknown }).data as unknown[])
              : null;
          if (!arr) {
            job.state = "failed";
            pushError({
              message: "Invalid JSON format. Expected an array or { data: [] }",
            });
          } else {
            job.totalRows = arr.length;
            const limit = Math.min(arr.length, maxRows);
            for (let i = 0; i < limit; i += 1) {
              const item = arr[i];
              const rowNumber = i + 1;
              const obj = isJsonObject(item)
                ? (item as Record<string, unknown>)
                : {};
              const next: Record<string, unknown> = {};
              if (typeof obj.email === "string") next.email = obj.email;
              if (typeof obj.name === "string") next.name = obj.name;
              if (typeof obj.walletAddress === "string") {
                next.walletAddress = obj.walletAddress;
                next.wallet = obj.walletAddress;
              }
              if (
                typeof obj.wallet === "string" &&
                !("walletAddress" in next)
              ) {
                next.walletAddress = obj.wallet;
                next.wallet = obj.wallet;
              }
              if ("tags" in obj) {
                const tags = toTags(obj.tags);
                if (tags) next.tags = tags;
              }
              if (isJsonObject(obj.attributes))
                next.attributes = obj.attributes;
              for (const [k, v] of Object.entries(obj)) {
                if (
                  k === "email" ||
                  k === "name" ||
                  k === "wallet" ||
                  k === "walletAddress" ||
                  k === "tags" ||
                  k === "attributes"
                ) {
                  continue;
                }
                next.attributes ??= {};
                if (isJsonObject(next.attributes))
                  (next.attributes as Record<string, unknown>)[k] = v;
              }
              if (!next.email && !next.wallet && !next.walletAddress) {
                pushError({ rowNumber, message: "Missing email or wallet" });
                job.processedRows += 1;
                continue;
              }
              await upsertOne(next, rowNumber);
              job.processedRows += 1;
            }
          }
        }

        job.state = job.state === "failed" ? "failed" : "completed";
        job.finishedAt = new Date().toISOString();
      } catch (e) {
        job.state = "failed";
        job.finishedAt = new Date().toISOString();
        pushError({
          message: e instanceof Error ? e.message : "Import failed",
        });
      }

      const responseData = {
        jobId: job.jobId,
        state: job.state,
        format: job.format,
        createdAt: job.createdAt,
      };

      return okJson(
        req,
        {
          success: true,
          message: "Import job created",
          data: responseData,
          timestamp: new Date().toISOString(),
          requestId: "local",
        },
        202
      );
    }

    if (method === "GET" && jobId && !extra) {
      const job = audienceImportJobs.get(jobId);
      if (job?.orgId !== orgId) {
        return okJson(
          req,
          {
            success: false,
            error: { code: "NOT_FOUND", message: "Job not found" },
            meta: {
              timestamp: new Date().toISOString(),
              path: req.nextUrl.pathname,
              requestId: "unknown",
            },
          },
          404
        );
      }
      const progress =
        typeof job.totalRows === "number" && job.totalRows > 0
          ? Math.round((job.processedRows / job.totalRows) * 100)
          : job.state === "completed"
            ? 100
            : 0;
      return okJson(req, {
        success: true,
        message: "Request processed successfully",
        data: {
          ...job,
          progress,
          errorSample: job.errors.slice(0, 50),
        },
        timestamp: new Date().toISOString(),
        requestId: "local",
      });
    }

    if (method === "GET" && jobId && extra === "errors") {
      const job = audienceImportJobs.get(jobId);
      if (job?.orgId !== orgId) {
        return okJson(
          req,
          {
            success: false,
            error: { code: "NOT_FOUND", message: "Job not found" },
            meta: {
              timestamp: new Date().toISOString(),
              path: req.nextUrl.pathname,
              requestId: "unknown",
            },
          },
          404
        );
      }
      if (job.errors.length === 0) {
        return okJson(
          req,
          {
            success: false,
            error: { code: "CONFLICT", message: "No errors available" },
            meta: {
              timestamp: new Date().toISOString(),
              path: req.nextUrl.pathname,
              requestId: "unknown",
            },
          },
          409
        );
      }
      const lines = [
        "rowNumber,key,code,message",
        ...job.errors.map((e) => {
          const row =
            typeof e.rowNumber === "number" ? String(e.rowNumber) : "";
          const key =
            typeof e.key === "string" ? e.key.replaceAll('"', '""') : "";
          const code =
            typeof e.code === "string" ? e.code.replaceAll('"', '""') : "";
          const message = e.message.replaceAll('"', '""');
          return `${row},"${key}","${code}","${message}"`;
        }),
      ];
      const csv = lines.join("\n");
      const cors = getCorsHeaders(req);
      const res = new NextResponse(csv, {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="audience-import-errors-${jobId}.csv"`,
        },
      });
      if (cors) {
        for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      }
      return res;
    }

    if (method === "POST" && jobId && extra === "cancel") {
      const job = audienceImportJobs.get(jobId);
      if (job?.orgId !== orgId) {
        return okJson(
          req,
          {
            success: false,
            error: { code: "NOT_FOUND", message: "Job not found" },
            meta: {
              timestamp: new Date().toISOString(),
              path: req.nextUrl.pathname,
              requestId: "unknown",
            },
          },
          404
        );
      }
      if (job.state === "completed" || job.state === "failed") {
        return okJson(
          req,
          {
            success: false,
            error: { code: "CONFLICT", message: "Job already finished" },
            meta: {
              timestamp: new Date().toISOString(),
              path: req.nextUrl.pathname,
              requestId: "unknown",
            },
          },
          409
        );
      }
      job.state = "cancelled";
      job.finishedAt = new Date().toISOString();
      return okJson(req, {
        success: true,
        message: "Request processed successfully",
        data: { jobId: job.jobId, state: job.state },
        timestamp: new Date().toISOString(),
        requestId: "local",
      });
    }

    return null;
  }

  if (sub === "exports") {
    const jobId = path.length >= 3 ? path[2] : null;
    const extra = path.length >= 4 ? path[3] : null;

    if (method === "POST" && !jobId) {
      const body = (await readJsonSafe(req)) as unknown;
      const formatRaw =
        isJsonObject(body) && typeof body.format === "string"
          ? body.format.toLowerCase().trim()
          : "";
      const format: AudienceImportExportFormat | null =
        formatRaw === "csv" || formatRaw === "json"
          ? (formatRaw as AudienceImportExportFormat)
          : null;
      if (!format) {
        return okJson(
          req,
          {
            success: false,
            error: { code: "BAD_REQUEST", message: "Invalid format" },
            meta: {
              timestamp: new Date().toISOString(),
              path: req.nextUrl.pathname,
              requestId: "unknown",
            },
          },
          400
        );
      }

      const now = new Date().toISOString();
      const createdJobId = randomJobId();
      const job: AudienceExportJob = {
        jobId: createdJobId,
        orgId,
        createdAt: now,
        startedAt: now,
        state: "processing",
        format,
        processedRows: 0,
        fileName: `audience-export-${createdJobId}.${format}`,
        contentType:
          format === "json"
            ? "application/json; charset=utf-8"
            : "text/csv; charset=utf-8",
        fileBytes: new Uint8Array(),
      };
      audienceExportJobs.set(createdJobId, job);

      try {
        const maxItems = 5000;
        const limit = 500;
        let page = 1;
        const all: unknown[] = [];
        while (all.length < maxItems) {
          const url = `${backendBase}/audience/profiles?page=${page}&limit=${limit}`;
          const res = await fetchBackendJson(url, {
            method: "GET",
            headers: backendHeaders,
            cache: "no-store",
          });
          if (!res.ok) {
            const msg =
              (isJsonObject(res.json) && typeof res.json.message === "string"
                ? res.json.message
                : res.text) || "Failed to export";
            throw new Error(msg);
          }
          const root = res.json;
          const list = Array.isArray(root)
            ? root
            : isJsonObject(root) &&
                Array.isArray((root as { data?: unknown }).data)
              ? ((root as { data?: unknown }).data as unknown[])
              : isJsonObject(root) &&
                  isJsonObject((root as { data?: unknown }).data) &&
                  Array.isArray(
                    ((root as { data?: unknown }).data as { items?: unknown })
                      .items
                  )
                ? ((((root as { data?: unknown }).data as { items?: unknown })
                    .items as unknown[]) ?? [])
                : [];
          if (!Array.isArray(list) || list.length === 0) break;
          all.push(...list);
          if (list.length < limit) break;
          page += 1;
        }

        job.processedRows = all.length;
        job.totalRows = all.length;

        if (format === "json") {
          const json = JSON.stringify(all, null, 2);
          job.fileBytes = new TextEncoder().encode(json);
        } else {
          const headers = ["email", "name", "wallet", "tags"];
          const lines: string[] = [];
          lines.push(headers.join(","));
          for (const item of all) {
            const obj = isJsonObject(item)
              ? (item as Record<string, unknown>)
              : {};
            const email = typeof obj.email === "string" ? obj.email : "";
            const name =
              typeof obj.name === "string"
                ? obj.name
                : typeof obj.fullName === "string"
                  ? obj.fullName
                  : "";
            const wallet =
              typeof obj.wallet === "string"
                ? obj.wallet
                : typeof obj.walletAddress === "string"
                  ? obj.walletAddress
                  : "";
            const tags = Array.isArray(obj.tags)
              ? obj.tags.filter((t) => typeof t === "string").join(",")
              : "";
            const escape = (v: string) => {
              const s = v.replaceAll('"', '""');
              return /[",\n\r]/.test(s) ? `"${s}"` : s;
            };
            lines.push(
              [escape(email), escape(name), escape(wallet), escape(tags)].join(
                ","
              )
            );
          }
          job.fileBytes = new TextEncoder().encode(lines.join("\n"));
        }

        job.state = "completed";
        job.finishedAt = new Date().toISOString();
      } catch (e) {
        job.state = "failed";
        job.finishedAt = new Date().toISOString();
        return okJson(
          req,
          {
            success: false,
            error: {
              code: "BAD_REQUEST",
              message: e instanceof Error ? e.message : "Export failed",
            },
            meta: {
              timestamp: new Date().toISOString(),
              path: req.nextUrl.pathname,
              requestId: "unknown",
            },
          },
          400
        );
      }

      return okJson(
        req,
        {
          success: true,
          message: "Export job created",
          data: {
            jobId: job.jobId,
            state: job.state,
            format: job.format,
            createdAt: job.createdAt,
          },
          timestamp: new Date().toISOString(),
          requestId: "local",
        },
        202
      );
    }

    if (method === "GET" && jobId && !extra) {
      const job = audienceExportJobs.get(jobId);
      if (job?.orgId !== orgId) {
        return okJson(
          req,
          {
            success: false,
            error: { code: "NOT_FOUND", message: "Job not found" },
            meta: {
              timestamp: new Date().toISOString(),
              path: req.nextUrl.pathname,
              requestId: "unknown",
            },
          },
          404
        );
      }
      const progress =
        typeof job.totalRows === "number" && job.totalRows > 0
          ? Math.round((job.processedRows / job.totalRows) * 100)
          : job.state === "completed"
            ? 100
            : 0;
      return okJson(req, {
        success: true,
        message: "Request processed successfully",
        data: {
          jobId: job.jobId,
          state: job.state,
          format: job.format,
          createdAt: job.createdAt,
          startedAt: job.startedAt,
          finishedAt: job.finishedAt,
          progress,
          processedRows: job.processedRows,
          totalRows: job.totalRows,
          fileSizeBytes: job.fileBytes.length,
        },
        timestamp: new Date().toISOString(),
        requestId: "local",
      });
    }

    if (method === "GET" && jobId && extra === "download") {
      const job = audienceExportJobs.get(jobId);
      if (job?.orgId !== orgId) {
        return okJson(
          req,
          {
            success: false,
            error: { code: "NOT_FOUND", message: "Job not found" },
            meta: {
              timestamp: new Date().toISOString(),
              path: req.nextUrl.pathname,
              requestId: "unknown",
            },
          },
          404
        );
      }
      if (job.state !== "completed") {
        return okJson(
          req,
          {
            success: false,
            error: { code: "CONFLICT", message: "Job not completed" },
            meta: {
              timestamp: new Date().toISOString(),
              path: req.nextUrl.pathname,
              requestId: "unknown",
            },
          },
          409
        );
      }
      const cors = getCorsHeaders(req);
      const bytes = Uint8Array.from(job.fileBytes).buffer;
      const res = new NextResponse(bytes, {
        status: 200,
        headers: {
          "content-type": job.contentType,
          "content-disposition": `attachment; filename="${job.fileName}"`,
        },
      });
      if (cors) {
        for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      }
      return res;
    }

    if (method === "POST" && jobId && extra === "cancel") {
      const job = audienceExportJobs.get(jobId);
      if (job?.orgId !== orgId) {
        return okJson(
          req,
          {
            success: false,
            error: { code: "NOT_FOUND", message: "Job not found" },
            meta: {
              timestamp: new Date().toISOString(),
              path: req.nextUrl.pathname,
              requestId: "unknown",
            },
          },
          404
        );
      }
      if (job.state === "completed" || job.state === "failed") {
        return okJson(
          req,
          {
            success: false,
            error: { code: "CONFLICT", message: "Job already finished" },
            meta: {
              timestamp: new Date().toISOString(),
              path: req.nextUrl.pathname,
              requestId: "unknown",
            },
          },
          409
        );
      }
      job.state = "cancelled";
      job.finishedAt = new Date().toISOString();
      return okJson(req, {
        success: true,
        message: "Request processed successfully",
        data: { jobId: job.jobId, state: job.state },
        timestamp: new Date().toISOString(),
        requestId: "local",
      });
    }
  }

  return null;
};

const pickUserKey = (req: NextRequest): string => {
  const auth = extractBearer(req.headers.get("authorization"));
  if (auth) return `bearer:${auth.slice(0, 16)}`;
  const cookie = req.headers.get("cookie") ?? "";
  const token = extractTokenFromCookie(cookie);
  if (token) return `cookie:${token.slice(0, 16)}`;
  const sessionMatch =
    /(^|;\s*)(__Secure-)?better-auth\.session_token=([^;]+)/.exec(cookie) ??
    /(^|;\s*)(__Host-)?better-auth\.session_token=([^;]+)/.exec(cookie);
  const session = sessionMatch?.[3] ?? "";
  if (session) return `session:${decodeURIComponent(session).slice(0, 16)}`;
  return "session";
};

const toBool = (raw: string | null): boolean | null => {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return null;
};

const toInt = (raw: string | null, fallback: number): number => {
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.floor(n));
};

const clampInt = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

const toFolder = (raw: string | null): InboxFolder | null => {
  if (!raw) return null;
  const v = raw.trim().toUpperCase();
  if (v === "INBOX" || v === "SENT" || v === "ARCHIVE" || v === "TRASH") {
    return v as InboxFolder;
  }
  return null;
};

const sendEmailViaAcs = async (input: {
  fromEmail: string;
  to: string[];
  subject: string;
  content: string;
}) => {
  const conn = (process.env.AZURE_COMMUNICATION_CONNECTION_STRING ?? "").trim();
  const from = (
    process.env.AZURE_COMMUNICATION_EMAIL_FROM ?? input.fromEmail
  ).trim();
  if (conn.length === 0 || from.length === 0) return;

  try {
    const mod = (await import("@azure/communication-email")) as unknown as {
      EmailClient?: new (connectionString: string) => {
        beginSend: (message: unknown) => Promise<unknown>;
      };
    };
    if (!mod.EmailClient) return;
    const client = new mod.EmailClient(conn);
    const recipients = input.to.map((address) => ({ address }));
    await client.beginSend({
      senderAddress: from,
      content: {
        subject: input.subject,
        plainText: input.content,
        html: `<pre>${input.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`,
      },
      recipients: { to: recipients },
    });
  } catch (_e) {
    String(_e);
  }
};

const handleInbox = async (
  req: NextRequest,
  path: string[],
  method: string
) => {
  if (path.length === 0 || path[0] !== "inbox") return null;

  const orgId = requireOrgId(req);
  if (!orgId) {
    return okJson(
      req,
      {
        success: false,
        error: { code: "BAD_REQUEST", message: "Missing x-org-id header" },
      },
      400
    );
  }

  if (!hasAnyAuth(req)) {
    return okJson(
      req,
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication failed" },
      },
      401
    );
  }

  const userKey = pickUserKey(req);
  const store = getInboxStore(orgId, userKey);
  ensureDefaultLabels(store);

  const sub = path[1] ?? "";
  const nowIso = () => new Date().toISOString();

  const computeUnread = () => {
    let unreadCount = 0;
    for (const t of store.threads.values()) {
      if (t.folder === "TRASH") continue;
      if (t.unreadCount > 0) unreadCount += t.unreadCount;
    }
    return unreadCount;
  };

  if (sub === "labels") {
    if (method === "GET") {
      return okJson(req, { items: Array.from(store.labels.values()) });
    }
    if (method === "POST") {
      const body = await readJsonSafe(req);
      const name =
        isJsonObject(body) && typeof body.name === "string"
          ? body.name.trim()
          : "";
      const color =
        isJsonObject(body) && typeof body.color === "string"
          ? body.color.trim()
          : undefined;
      if (name.length === 0) {
        return okJson(
          req,
          {
            success: false,
            error: { code: "BAD_REQUEST", message: "Missing name" },
          },
          400
        );
      }
      const created = createLabel(store, { name, color });
      return okJson(req, created, 201);
    }
    return okJson(
      req,
      {
        success: false,
        error: { code: "METHOD_NOT_ALLOWED", message: "Not supported" },
      },
      405
    );
  }

  if (sub === "drafts") {
    if (method === "GET") {
      return okJson(req, { items: Array.from(store.drafts.values()) });
    }
    if (method === "POST") {
      const body = await readJsonSafe(req);
      const content =
        isJsonObject(body) && typeof body.content === "string"
          ? body.content
          : "";
      const to =
        isJsonObject(body) && Array.isArray(body.to)
          ? body.to.filter((v: unknown) => typeof v === "string")
          : undefined;
      const subject =
        isJsonObject(body) && typeof body.subject === "string"
          ? body.subject
          : undefined;
      const attachments = isJsonObject(body) ? body.attachments : undefined;

      const id = randomJobId();
      const draft = {
        id,
        to,
        subject,
        content,
        attachments,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      store.drafts.set(id, draft);
      return okJson(req, draft, 201);
    }

    if (method === "PUT" && path.length >= 3) {
      const draftId = path[2] ?? "";
      const existing = store.drafts.get(draftId);
      if (!existing)
        return okJson(
          req,
          {
            success: false,
            error: { code: "NOT_FOUND", message: "Draft not found" },
          },
          404
        );
      const body = await readJsonSafe(req);
      const next = { ...existing };
      if (isJsonObject(body) && Array.isArray(body.to)) {
        next.to = body.to.filter((v: unknown) => typeof v === "string");
      }
      if (isJsonObject(body) && typeof body.subject === "string")
        next.subject = body.subject;
      if (isJsonObject(body) && typeof body.content === "string")
        next.content = body.content;
      if (isJsonObject(body) && "attachments" in body)
        next.attachments = body.attachments;
      next.updatedAt = nowIso();
      store.drafts.set(draftId, next);
      return okJson(req, next);
    }

    return okJson(
      req,
      {
        success: false,
        error: { code: "METHOD_NOT_ALLOWED", message: "Not supported" },
      },
      405
    );
  }

  if (sub === "search" && method === "GET") {
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
    const limit = clampInt(
      toInt(req.nextUrl.searchParams.get("limit"), 20),
      1,
      200
    );
    const threads: unknown[] = [];
    const messages: unknown[] = [];
    if (q.length > 0) {
      for (const t of store.threads.values()) {
        if (threads.length >= limit) break;
        const hit =
          t.subject.toLowerCase().includes(q) ||
          t.snippet.toLowerCase().includes(q);
        if (hit) threads.push(t);
      }
      for (const m of store.messages.values()) {
        if (messages.length >= limit) break;
        const hit =
          m.subject.toLowerCase().includes(q) ||
          m.content.toLowerCase().includes(q) ||
          m.from.toLowerCase().includes(q);
        if (hit) messages.push(m);
      }
    }
    return okJson(req, { threads, messages });
  }

  if (sub === "messages" && method === "POST") {
    const body = await readJsonSafe(req);
    const subject =
      isJsonObject(body) && typeof body.subject === "string"
        ? body.subject
        : "";
    const content =
      isJsonObject(body) && typeof body.content === "string"
        ? body.content
        : "";
    const fromEmail =
      isJsonObject(body) && typeof body.fromEmail === "string"
        ? body.fromEmail
        : "you@onchainsuite.com";
    const rawTo = isJsonObject(body) ? body.to : null;
    const to =
      typeof rawTo === "string"
        ? [rawTo]
        : Array.isArray(rawTo)
          ? rawTo.filter((v: unknown) => typeof v === "string")
          : [];
    if (
      to.length === 0 ||
      subject.trim().length === 0 ||
      content.trim().length === 0
    ) {
      return okJson(
        req,
        { ok: false, message: "Missing to/subject/content" },
        400
      );
    }

    const { thread, message } = createThreadWithMessage(store, {
      threadId: "",
      from: fromEmail,
      to,
      subject,
      content,
      attachments: isJsonObject(body) ? body.attachments : undefined,
      direction: "outbound",
    });
    thread.folder = "SENT";
    thread.unreadCount = 0;
    thread.updatedAt = nowIso();
    store.threads.set(thread.id, thread);

    inboxEvents.emit("new_message", { orgId, threadId: thread.id, message });
    inboxEvents.emit("thread_updated", { orgId, threadId: thread.id });
    inboxEvents.emit("unread_count_changed", {
      orgId,
      unreadCount: computeUnread(),
    });

    sendEmailViaAcs({ fromEmail, to, subject, content }).catch(() => undefined);

    return okJson(
      req,
      { ok: true, threadId: thread.id, messageId: message.id },
      202
    );
  }

  if (sub === "threads") {
    if (method === "GET" && path.length === 3 && path[2] === "unread-count") {
      return okJson(req, { unreadCount: computeUnread() });
    }

    if (method === "GET" && path.length === 2) {
      const folder =
        toFolder(req.nextUrl.searchParams.get("folder")) ?? "INBOX";
      const unread = toBool(req.nextUrl.searchParams.get("unread"));
      const starred = toBool(req.nextUrl.searchParams.get("starred"));
      const labelId = (req.nextUrl.searchParams.get("labelId") ?? "").trim();
      const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
      const page = toInt(req.nextUrl.searchParams.get("page"), 1);
      const limit = clampInt(
        toInt(req.nextUrl.searchParams.get("limit"), 50),
        1,
        200
      );

      const all = Array.from(store.threads.values())
        .filter((t) => t.folder === folder)
        .filter((t) =>
          unread === null
            ? true
            : unread
              ? t.unreadCount > 0
              : t.unreadCount === 0
        )
        .filter((t) => (starred === null ? true : t.starred === starred))
        .filter((t) => (labelId ? t.labelIds.includes(labelId) : true))
        .filter((t) => {
          if (q.length === 0) return true;
          if (
            t.subject.toLowerCase().includes(q) ||
            t.snippet.toLowerCase().includes(q)
          )
            return true;
          for (const mid of t.messageIds) {
            const m = store.messages.get(mid);
            if (!m) continue;
            if (m.content.toLowerCase().includes(q)) return true;
          }
          return false;
        })
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

      const totalItems = all.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));
      const safePage = clampInt(page, 1, totalPages);
      const start = (safePage - 1) * limit;
      const items = all.slice(start, start + limit).map((t) => {
        const labels = t.labelIds
          .map((id) => store.labels.get(id))
          .filter((x): x is NonNullable<typeof x> => !!x);
        const lastMessageId = t.messageIds[t.messageIds.length - 1] ?? "";
        const lastMessage = lastMessageId
          ? store.messages.get(lastMessageId)
          : null;
        const from =
          lastMessage?.direction === "inbound"
            ? lastMessage.from
            : (lastMessage?.to?.[0] ?? lastMessage?.from ?? "");
        const fromEmail =
          lastMessage?.direction === "inbound" ? lastMessage.from : "";
        const hasAttachment = !!lastMessage?.attachments;
        return { ...t, labels, from, fromEmail, hasAttachment };
      });

      return okJson(req, {
        items,
        meta: {
          totalItems,
          totalPages,
          page: safePage,
          limit,
          hasPreviousPage: safePage > 1,
          hasNextPage: safePage < totalPages,
        },
      });
    }

    if (path.length >= 3) {
      const threadId = path[2] ?? "";
      const thread = store.threads.get(threadId);
      if (!thread) {
        return okJson(
          req,
          {
            success: false,
            error: { code: "NOT_FOUND", message: "Thread not found" },
          },
          404
        );
      }

      if (method === "GET" && path.length === 3) {
        const messages = thread.messageIds
          .slice(-200)
          .map((id) => store.messages.get(id))
          .filter((m): m is NonNullable<typeof m> => !!m);
        const labels = thread.labelIds
          .map((id) => store.labels.get(id))
          .filter((l): l is NonNullable<typeof l> => !!l);
        return okJson(req, { ...thread, labels, messages });
      }

      if (method === "GET" && path.length === 4 && path[3] === "messages") {
        const cursor = (req.nextUrl.searchParams.get("cursor") ?? "").trim();
        const limit = clampInt(
          toInt(req.nextUrl.searchParams.get("limit"), 50),
          1,
          200
        );
        const ids = thread.messageIds;
        const startIdx = cursor
          ? Math.max(0, ids.indexOf(cursor) + 1)
          : Math.max(0, ids.length - limit);
        const slice = ids.slice(startIdx, startIdx + limit);
        const items = slice
          .map((id) => store.messages.get(id))
          .filter((m): m is NonNullable<typeof m> => !!m);
        const nextCursor =
          startIdx + limit < ids.length
            ? (slice[slice.length - 1] ?? null)
            : null;
        return okJson(req, { items, nextCursor });
      }

      if (method === "POST" && path.length === 4 && path[3] === "messages") {
        const body = await readJsonSafe(req);
        const content =
          isJsonObject(body) && typeof body.content === "string"
            ? body.content
            : "";
        const fromEmail =
          isJsonObject(body) && typeof body.fromEmail === "string"
            ? body.fromEmail
            : "you@onchainsuite.com";
        const explicitTo =
          isJsonObject(body) && typeof body.to === "string"
            ? body.to.trim()
            : "";
        const toFallback = (() => {
          const ids = [...thread.messageIds].reverse();
          for (const id of ids) {
            const m = store.messages.get(id);
            if (!m) continue;
            if (m.direction === "inbound") return m.from;
          }
          return "";
        })();
        const to = (explicitTo || toFallback).trim();
        if (content.trim().length === 0) {
          return okJson(req, { ok: false, message: "Missing content" }, 400);
        }
        if (to.length === 0) {
          return okJson(req, { ok: false, message: "Missing recipient" }, 400);
        }

        const next = appendMessageToThread(store, threadId, {
          from: fromEmail,
          to: [to],
          subject: thread.subject,
          content,
          attachments: isJsonObject(body) ? body.attachments : undefined,
          direction: "outbound",
        });
        if (!next)
          return okJson(req, { ok: false, message: "Thread not found" }, 404);

        inboxEvents.emit("new_message", {
          orgId,
          threadId,
          message: next.message,
        });
        inboxEvents.emit("thread_updated", { orgId, threadId });
        inboxEvents.emit("unread_count_changed", {
          orgId,
          unreadCount: computeUnread(),
        });

        sendEmailViaAcs({
          fromEmail,
          to: [to],
          subject: thread.subject,
          content,
        }).catch(() => undefined);

        return okJson(req, { ok: true, messageId: next.message.id }, 202);
      }

      if (method === "PUT" && path.length === 4 && path[3] === "read") {
        thread.unreadCount = 0;
        thread.updatedAt = nowIso();
        store.threads.set(threadId, thread);
        inboxEvents.emit("thread_updated", {
          orgId,
          threadId,
          patch: { unreadCount: 0 },
        });
        inboxEvents.emit("unread_count_changed", {
          orgId,
          unreadCount: computeUnread(),
        });
        return okJson(req, { ok: true });
      }

      if (method === "PUT" && path.length === 4 && path[3] === "unread") {
        thread.unreadCount = thread.unreadCount > 0 ? thread.unreadCount : 1;
        thread.updatedAt = nowIso();
        store.threads.set(threadId, thread);
        inboxEvents.emit("thread_updated", {
          orgId,
          threadId,
          patch: { unreadCount: thread.unreadCount },
        });
        inboxEvents.emit("unread_count_changed", {
          orgId,
          unreadCount: computeUnread(),
        });
        return okJson(req, { ok: true });
      }

      if (method === "PUT" && path.length === 4 && path[3] === "star") {
        const body = await readJsonSafe(req);
        const provided =
          isJsonObject(body) && typeof body.starred === "boolean"
            ? body.starred
            : null;
        thread.starred = provided ?? !thread.starred;
        thread.updatedAt = nowIso();
        store.threads.set(threadId, thread);
        inboxEvents.emit("thread_updated", {
          orgId,
          threadId,
          patch: { starred: thread.starred },
        });
        return okJson(req, { ok: true, starred: thread.starred });
      }

      if (method === "PUT" && path.length === 4 && path[3] === "label") {
        const body = await readJsonSafe(req);
        const add =
          isJsonObject(body) && Array.isArray(body.add)
            ? body.add.filter((v: unknown) => typeof v === "string")
            : [];
        const remove =
          isJsonObject(body) && Array.isArray(body.remove)
            ? body.remove.filter((v: unknown) => typeof v === "string")
            : [];
        const set = new Set(thread.labelIds);
        add.forEach((id: string) => set.add(id));
        remove.forEach((id: string) => set.delete(id));
        thread.labelIds = Array.from(set);
        thread.updatedAt = nowIso();
        store.threads.set(threadId, thread);
        const labels = thread.labelIds
          .map((id) => store.labels.get(id))
          .filter((l): l is NonNullable<typeof l> => !!l);
        inboxEvents.emit("thread_updated", {
          orgId,
          threadId,
          patch: { labelIds: thread.labelIds },
        });
        return okJson(req, { ok: true, labels });
      }

      return okJson(
        req,
        {
          success: false,
          error: { code: "METHOD_NOT_ALLOWED", message: "Not supported" },
        },
        405
      );
    }
  }

  return okJson(
    req,
    { success: false, error: { code: "NOT_FOUND", message: "Not found" } },
    404
  );
};

const ensureBackendAuthHeaders = (req: NextRequest, headers: Headers) => {
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

const ensureOrgIdHeader = (req: NextRequest, headers: Headers) => {
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

const toSavedPayload = (raw: unknown) => {
  const extracted = extractEmailContent(raw);
  return {
    html: extracted.html,
    textVersion: extracted.textVersion,
    json: extracted.json,
    assets: extracted.assets,
  };
};

const forward = async (
  req: NextRequest,
  path: string[],
  overrideMethod?: string
) => {
  const cors = getCorsHeaders(req);
  const method = (overrideMethod ?? req.method).toUpperCase();
  const startedAt = Date.now();

  const audienceImportExport = await handleAudienceImportExport(
    req,
    path,
    method
  );
  if (audienceImportExport) return audienceImportExport;

  const inbox = await handleInbox(req, path, method);
  if (inbox) return inbox;

  if (method === "OPTIONS" && cors) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        ...cors,
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const url = new URL(req.url);
  const targetUrl = `${getBackendBaseUrl()}/${path.join("/")}${url.search}`;
  const joinedPath = path.join("/");
  const isGoldrushMcpQueryPath =
    method === "POST" && joinedPath === "intelligence/query/goldrush/mcp/query";

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("accept-encoding");
  ensureBackendAuthHeaders(req, headers);
  ensureOrgIdHeader(req, headers);
  const apiKey = getBackendApiKey();
  if (apiKey && !headers.has("x-api-key")) {
    headers.set("x-api-key", apiKey);
  }
  const isSettingsBillingPath =
    path[0] === "billing" ||
    (path[0] === "organization" && path.includes("billing"));
  if (isSettingsBillingPath) {
    // #region debug-point C:billing-proxy-start
    reportSettingsProfileBillingDebug(
      "C",
      "src/app/api/v1/[...path]/route.ts:1861",
      "[DEBUG] billing proxy request",
      {
        method,
        path: path.join("/"),
        targetUrl,
        hasAuthorization: headers.has("authorization"),
        hasApiKey: headers.has("x-api-key"),
        hasOrgId: headers.has("x-org-id"),
        orgId: headers.get("x-org-id"),
        cookieNames: (req.headers.get("cookie") ?? "")
          .split(";")
          .map((item) => item.trim().split("=")[0])
          .filter(Boolean)
          .slice(0, 12),
      }
    );
    // #endregion
  }

  const hasBody = !["GET", "HEAD"].includes(method);
  let body: ArrayBuffer | undefined = undefined;
  if (hasBody) {
    try {
      body = await req.arrayBuffer();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to read request body";
      const res = NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message,
          },
        },
        { status: 400 }
      );
      if (cors) {
        for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      }
      return res;
    }
  }

  if (isGoldrushMcpQueryPath) {
    const bodyPreview =
      body && body.byteLength > 0
        ? new TextDecoder().decode(body).slice(0, 500)
        : "";
    reportMcpQueryDebug("request", {
      method,
      path: joinedPath,
      targetUrl,
      hasAuthorization: headers.has("authorization"),
      hasApiKey: headers.has("x-api-key"),
      hasOrgId: headers.has("x-org-id"),
      orgId: headers.get("x-org-id"),
      bodyLength: body?.byteLength ?? 0,
      bodyPreview,
    });
  }

  const isCampaignEditorSaved =
    method === "POST" &&
    path.length === 4 &&
    path[0] === "campaigns" &&
    path[2] === "editor" &&
    path[3] === "saved";
  if (isCampaignEditorSaved && body) {
    try {
      const rawText = new TextDecoder().decode(body);
      const parsed = rawText.trim().length > 0 ? JSON.parse(rawText) : null;
      // #region debug-point A:editor-saved-raw
      reportEmailDebug(
        "A",
        "src/app/api/v1/[...path]/route.ts:1875",
        "[DEBUG] editor saved raw payload received",
        {
          path: path.join("/"),
          rawLength: rawText.length,
          topLevelKeys:
            parsed && typeof parsed === "object" ? Object.keys(parsed) : [],
          payloadKeys:
            parsed &&
            typeof parsed === "object" &&
            parsed !== null &&
            "payload" in parsed &&
            typeof (parsed as { payload?: unknown }).payload === "object" &&
            (parsed as { payload?: object }).payload !== null
              ? Object.keys(
                  (parsed as { payload: Record<string, unknown> }).payload
                )
              : [],
        }
      );
      // #endregion
      const payload = toSavedPayload(parsed);
      // #region debug-point A:editor-saved-normalized
      reportEmailDebug(
        "A",
        "src/app/api/v1/[...path]/route.ts:1899",
        "[DEBUG] editor saved payload normalized",
        {
          hasHtml: typeof payload.html === "string" && payload.html.length > 0,
          htmlLength:
            typeof payload.html === "string" ? payload.html.length : 0,
          hasText:
            typeof payload.textVersion === "string" &&
            payload.textVersion.length > 0,
          textLength:
            typeof payload.textVersion === "string"
              ? payload.textVersion.length
              : 0,
          hasJson: payload.json !== undefined && payload.json !== null,
          hasAssets: payload.assets !== undefined && payload.assets !== null,
        }
      );
      // #endregion
      const nextBody = JSON.stringify(payload);
      body = new TextEncoder().encode(nextBody).buffer;
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }
    } catch (_e) {
      String(_e);
    }
  }

  let upstream: Response;
  try {
    const isCampaignPreview =
      method === "POST" &&
      path.length === 3 &&
      path[0] === "campaigns" &&
      path[2] === "preview";
    const isCampaignSendTest =
      method === "POST" &&
      path.length === 3 &&
      path[0] === "campaigns" &&
      path[2] === "send-test";
    const isCampaignEditorContent =
      method === "GET" &&
      path.length === 4 &&
      path[0] === "campaigns" &&
      path[2] === "editor" &&
      path[3] === "content";
    if (isCampaignPreview || isCampaignSendTest || isCampaignEditorContent) {
      const rawBodyText =
        body && body.byteLength > 0 ? new TextDecoder().decode(body) : "";
      // #region debug-point B:campaign-email-proxy-request
      reportEmailDebug(
        isCampaignPreview ? "B" : isCampaignSendTest ? "D" : "C",
        "src/app/api/v1/[...path]/route.ts:1937",
        "[DEBUG] campaign email proxy request",
        {
          path: path.join("/"),
          method,
          hasBody: rawBodyText.length > 0,
          bodyLength: rawBodyText.length,
          bodyPreview: rawBodyText.slice(0, 300),
        }
      );
      // #endregion
    }
    upstream = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: "no-store",
    });
    if (isGoldrushMcpQueryPath) {
      const upstreamPreview = await upstream
        .clone()
        .text()
        .then((text) => text.slice(0, 1000))
        .catch(() => "");
      reportMcpQueryDebug("response", {
        method,
        path: joinedPath,
        targetUrl,
        ok: upstream.ok,
        status: upstream.status,
        latencyMs: Date.now() - startedAt,
        contentType: upstream.headers.get("content-type"),
        bodyPreview: upstreamPreview,
      });
    }
    if (isSettingsBillingPath) {
      // #region debug-point C:billing-proxy-response
      reportSettingsProfileBillingDebug(
        "C",
        "src/app/api/v1/[...path]/route.ts:1995",
        "[DEBUG] billing proxy response",
        {
          method,
          path: path.join("/"),
          targetUrl,
          status: upstream.status,
          contentType: upstream.headers.get("content-type"),
        }
      );
      // #endregion
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upstream request failed";
    if (isGoldrushMcpQueryPath) {
      reportMcpQueryDebug("error", {
        method,
        path: joinedPath,
        targetUrl,
        latencyMs: Date.now() - startedAt,
        message,
      });
    }
    const res = NextResponse.json(
      {
        success: false,
        error: {
          code: "UPSTREAM_UNREACHABLE",
          message,
          details: {
            path: `/${path.join("/")}`,
            method,
          },
        },
      },
      { status: 502 }
    );
    if (cors) {
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    }
    return res;
  }

  const isOrganizationSetActive =
    method === "POST" &&
    path.length === 2 &&
    path[0] === "organization" &&
    path[1] === "set-active";

  const isOrganizationCreate =
    method === "POST" &&
    path.length === 2 &&
    path[0] === "organization" &&
    path[1] === "create";

  const isOrganizationList =
    method === "GET" &&
    path.length === 2 &&
    path[0] === "organization" &&
    path[1] === "list";

  if (isOrganizationCreate && upstream.status === 409) {
    const base = getBackendBaseUrl();

    let requestedName = "";
    let requestedSlug = "";
    try {
      const text = body ? new TextDecoder().decode(body) : "";
      const json = text ? JSON.parse(text) : null;
      requestedName = String(json?.name ?? "");
      requestedSlug = String(json?.slug ?? "");
    } catch (_e) {
      String(_e);
    }

    try {
      const listRes = await fetch(`${base}/organization/list`, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const listJson = await listRes.json().catch(() => null);
      const list = Array.isArray(listJson)
        ? listJson
        : Array.isArray(listJson?.data)
          ? listJson.data
          : Array.isArray(listJson?.data?.data)
            ? listJson.data.data
            : [];

      const nameLower = requestedName.toLowerCase().trim();
      const slugLower = requestedSlug.toLowerCase().trim();
      const match = Array.isArray(list)
        ? list.find((org) => {
            if (!isJsonObject(org)) return false;
            const orgName = String(org.name ?? "")
              .toLowerCase()
              .trim();
            const orgSlug = String(org.slug ?? "")
              .toLowerCase()
              .trim();
            return (
              (slugLower && orgSlug === slugLower) ||
              (nameLower && orgName === nameLower)
            );
          })
        : null;

      const orgId = isJsonObject(match)
        ? (match.id ?? match.organizationId ?? null)
        : null;

      if (typeof orgId === "string" && orgId.length > 0) {
        await fetch(`${base}/organization/set-active`, {
          method: "POST",
          headers: (() => {
            const h = new Headers(headers);
            if (!h.has("content-type")) {
              h.set("content-type", "application/json");
            }
            return h;
          })(),
          body: JSON.stringify({ organizationId: orgId }),
          cache: "no-store",
        }).catch(() => null);

        return NextResponse.json(
          { success: true, conflict: true, data: match ?? { id: orgId } },
          { status: 200 }
        );
      }
    } catch (_e) {
      String(_e);
    }

    return NextResponse.json(
      {
        success: false,
        conflict: true,
        message: "Organization already exists",
      },
      { status: 200 }
    );
  }

  if (isOrganizationList && upstream.status === 409) {
    try {
      const json = await upstream.clone().json();
      return NextResponse.json(json, { status: 200 });
    } catch {
      return NextResponse.json({ data: [] }, { status: 200 });
    }
  }

  if (isOrganizationSetActive && upstream.status === 400) {
    const base = getBackendBaseUrl();
    const upstreamJson = await upstream
      .clone()
      .json()
      .catch(() => null);
    const upstreamErrorMessage = (() => {
      if (!isJsonObject(upstreamJson)) return "";
      const err = isJsonObject(upstreamJson.error)
        ? upstreamJson.error
        : undefined;
      const nested = isJsonObject(err?.details) ? err.details : undefined;
      const msg =
        (typeof err?.message === "string" ? err.message : "") ||
        (typeof upstreamJson.message === "string"
          ? upstreamJson.message
          : "") ||
        (typeof nested?.message === "string" ? nested.message : "");
      return msg;
    })();

    if (/not a member of organization/i.test(upstreamErrorMessage)) {
      const requestedOrgId = (() => {
        if (!body) return null;
        try {
          const text = new TextDecoder().decode(body);
          const json = text.trim().length > 0 ? JSON.parse(text) : null;
          const raw = isJsonObject(json)
            ? (json.organizationId ??
              json.organization_id ??
              json.orgId ??
              json.org_id ??
              null)
            : null;
          return typeof raw === "string" && raw.trim().length > 0
            ? raw.trim()
            : null;
        } catch {
          return null;
        }
      })();

      if (requestedOrgId) {
        try {
          const listRes = await fetch(`${base}/organization/list`, {
            method: "GET",
            headers,
            cache: "no-store",
          });
          const listJson = await listRes.json().catch(() => null);
          const list = Array.isArray(listJson)
            ? listJson
            : Array.isArray(listJson?.data)
              ? listJson.data
              : Array.isArray(listJson?.data?.data)
                ? listJson.data.data
                : [];

          const found = Array.isArray(list)
            ? list.some(
                (org) =>
                  isJsonObject(org) &&
                  (org.id === requestedOrgId ||
                    org.organizationId === requestedOrgId)
              )
            : false;

          if (found) {
            return NextResponse.json(
              {
                success: true,
                fallback: true,
                data: { organizationId: requestedOrgId },
              },
              { status: 200 }
            );
          }
        } catch (_e) {
          String(_e);
        }
      }
    }
  }

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("connection");
  responseHeaders.delete("transfer-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("content-encoding");
  {
    const isCampaignPreview =
      method === "POST" &&
      path.length === 3 &&
      path[0] === "campaigns" &&
      path[2] === "preview";
    const isCampaignSendTest =
      method === "POST" &&
      path.length === 3 &&
      path[0] === "campaigns" &&
      path[2] === "send-test";
    const isCampaignEditorContent =
      method === "GET" &&
      path.length === 4 &&
      path[0] === "campaigns" &&
      path[2] === "editor" &&
      path[3] === "content";
    if (isCampaignPreview || isCampaignSendTest || isCampaignEditorContent) {
      const cloned = upstream.clone();
      const text = await cloned.text().catch(() => "");
      const json: unknown = (() => {
        try {
          return text.length > 0 ? JSON.parse(text) : null;
        } catch {
          return null;
        }
      })();
      const obj =
        json && typeof json === "object"
          ? (json as Record<string, unknown>)
          : {};
      const extracted = extractEmailContent(json);
      // #region debug-point C:campaign-email-proxy-response
      reportEmailDebug(
        isCampaignPreview ? "B" : isCampaignSendTest ? "D" : "C",
        "src/app/api/v1/[...path]/route.ts:2172",
        "[DEBUG] campaign email proxy response",
        {
          path: path.join("/"),
          status: upstream.status,
          textLength: text.length,
          hasHtml:
            typeof extracted.html === "string" && extracted.html.length > 0,
          htmlLength:
            typeof extracted.html === "string" ? extracted.html.length : 0,
          hasText:
            typeof extracted.textVersion === "string" &&
            extracted.textVersion.length > 0,
          textLengthValue:
            typeof extracted.textVersion === "string"
              ? extracted.textVersion.length
              : 0,
          hasJson: extracted.json !== undefined && extracted.json !== null,
          success: typeof obj.success === "boolean" ? obj.success : upstream.ok,
        }
      );
      // #endregion
    }
  }
  if (cors) {
    for (const [k, v] of Object.entries(cors)) responseHeaders.set(k, v);
  }

  return new NextResponse(
    upstream.status === 204 ? null : await upstream.arrayBuffer(),
    { status: upstream.status, headers: responseHeaders }
  );
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
