import { type NextRequest, NextResponse } from "next/server";

import { ensureBackendAuthHeaders } from "./auth";
import { getBackendApiKey, getBackendBaseUrl, getCorsHeaders } from "./config";

/** Response and backend-request helpers shared by the proxy handlers. */

export const randomJobId = () => {
  const cryptoObj = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return cryptoObj.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const okJson = (req: NextRequest, payload: unknown, status = 200) => {
  const cors = getCorsHeaders(req);
  const res = NextResponse.json(payload, { status });
  if (cors) {
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  }
  return res;
};

export const readJsonSafe = async (req: NextRequest): Promise<unknown> => {
  try {
    return await req.json();
  } catch {
    return null;
  }
};

export const buildBackendHeaders = (req: NextRequest) => {
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

export const fetchBackendJson = async (
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
