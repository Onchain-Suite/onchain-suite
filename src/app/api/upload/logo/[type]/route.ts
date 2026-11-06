import { type NextRequest, NextResponse } from "next/server";

import {
  hasSessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_NAMES,
} from "@/lib/auth-cookie";
import { isJsonObject } from "@/lib/utils";

export const maxDuration = 300; // 5 minutes

const pickNonEmpty = (...values: Array<string | undefined | null>) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return "";
};

const extractTokenFromCookie = (cookieHeader: string): string | null => {
  const pairs = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => {
      const idx = part.indexOf("=");
      if (idx === -1) return [part, ""] as const;
      return [part.slice(0, idx), part.slice(idx + 1)] as const;
    });

  const cookieMap = new Map(pairs);
  const raw =
    cookieMap.get("onchain.token") ??
    SESSION_COOKIE_NAMES.map((n) => cookieMap.get(n)).find(Boolean) ??
    null;
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
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

const ensureBackendAuthHeaders = (req: NextRequest, headers: Headers) => {
  const tokenFromAuth = extractBearer(headers.get("authorization"));
  const tokenFromHeader =
    req.headers.get("x-editor-token") ?? req.headers.get("x-session-token");
  const tokenFromQuery =
    req.nextUrl.searchParams.get("token") ??
    req.nextUrl.searchParams.get("sessionToken") ??
    req.nextUrl.searchParams.get("editorToken");
  const tokenFromCookie = extractTokenFromCookie(
    req.headers.get("cookie") ?? ""
  );

  const token =
    tokenFromAuth ?? tokenFromHeader ?? tokenFromQuery ?? tokenFromCookie;
  if (!token) return;

  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("x-session-token")) headers.set("x-session-token", token);
  if (!headers.has("x-editor-token")) headers.set("x-editor-token", token);

  const existingCookie = headers.get("cookie") ?? "";
  const hasSession = hasSessionCookie(existingCookie);
  const hasOnchainTokenCookie = /(^|;\s*)onchain\.token=/.test(existingCookie);

  let nextCookie = existingCookie;
  if (!hasSession) {
    nextCookie = `${nextCookie}${nextCookie ? "; " : ""}${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`;
  }
  if (!hasOnchainTokenCookie) {
    nextCookie = `${nextCookie}${nextCookie ? "; " : ""}onchain.token=${encodeURIComponent(token)}`;
  }
  if (nextCookie !== existingCookie) {
    headers.set("cookie", nextCookie);
  }
};

const ensureOrgIdHeader = (req: NextRequest, headers: Headers) => {
  if (headers.has("x-org-id")) return;
  const candidate =
    req.nextUrl.searchParams.get("x-org-id") ??
    req.nextUrl.searchParams.get("orgId") ??
    req.nextUrl.searchParams.get("xOrgId") ??
    req.nextUrl.searchParams.get("organizationId") ??
    req.nextUrl.searchParams.get("activeOrganizationId") ??
    null;
  const cleaned = typeof candidate === "string" ? candidate.trim() : "";
  if (cleaned.length > 0) headers.set("x-org-id", cleaned);
};

const getBackendApiKey = () => {
  return pickNonEmpty(
    process.env.BACKEND_API_KEY,
    process.env.NEXT_PUBLIC_BACKEND_API_KEY,
    process.env.NEXT_PUBLIC_API_KEY
  );
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;

    // 1. Validate type
    if (!["primary", "dark", "favicon"].includes(type)) {
      return NextResponse.json({ error: "Invalid logo type" }, { status: 400 });
    }

    // 2. Parse FormData
    let formData;
    try {
      formData = await req.formData();
    } catch (err: unknown) {
      console.error("Error parsing FormData:", err);
      const message = isJsonObject(err) ? err.message : undefined;
      return NextResponse.json(
        { error: "Failed to parse form data", details: String(message ?? err) },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File | null;

    if (!file) {
      console.error("No file found in FormData");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 3. Validation (Size & Type)
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    // Common image types + favicon types
    const ALLOWED_TYPES = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/svg+xml",
      "image/x-icon",
      "image/vnd.microsoft.icon",
    ];

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 100MB limit" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Unsupported file type. Please upload PNG, JPG, SVG, or ICO.",
        },
        { status: 400 }
      );
    }

    // 4. Forward to Backend
    const backendUrl = pickNonEmpty(
      process.env.BACKEND_URL,
      process.env.NEXT_PUBLIC_BACKEND_URL,
      "https://api.onchainsuite.com/api/v1"
    );

    const cleanBase = backendUrl.replace(/\/$/, "");
    const targetUrl = `${cleanBase}/organization/branding/logo/${type}`;

    // Reconstruct FormData for forwarding
    // Important: Convert File to Blob explicitly to ensure compatibility
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type });

    const forwardFormData = new FormData();
    forwardFormData.append("file", blob, file.name);

    // Forward headers
    const headers = new Headers();
    const authHeader = req.headers.get("authorization");
    const cookieHeader = req.headers.get("cookie");
    const orgIdHeader = req.headers.get("x-org-id");

    if (authHeader) headers.set("Authorization", authHeader);
    if (cookieHeader) headers.set("Cookie", cookieHeader);
    if (orgIdHeader) headers.set("x-org-id", orgIdHeader);
    ensureBackendAuthHeaders(req, headers);
    ensureOrgIdHeader(req, headers);
    const apiKey = getBackendApiKey();
    if (apiKey && !headers.has("x-api-key")) headers.set("x-api-key", apiKey);

    let response;
    try {
      const fetchInit: RequestInit & { duplex?: "half" } = {
        method: "POST",
        headers,
        body: forwardFormData,
        duplex: "half",
      };
      response = await fetch(targetUrl, fetchInit);
    } catch (fetchErr: unknown) {
      console.error("Fetch to backend failed:", fetchErr);
      const message = isJsonObject(fetchErr) ? fetchErr.message : undefined;
      return NextResponse.json(
        {
          error: "Failed to connect to backend",
          details: String(message ?? fetchErr),
        },
        { status: 502 }
      );
    }

    if (!response.ok) {
      let errorText = "";
      try {
        errorText = await response.text();
      } catch (_e) {
        String(_e);
        errorText = "Could not read error response body";
      }

      console.error("Backend upload failed:", response.status, errorText);

      let errorJson = null;
      try {
        errorJson = JSON.parse(errorText);
      } catch (_e) {
        String(_e);
        // ignore
      }

      return NextResponse.json(
        {
          error: "Backend upload failed",
          details: errorJson ?? errorText,
          status: response.status,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error("Upload handler fatal error:", error);
    const message = isJsonObject(error) ? error.message : undefined;
    const stack = isJsonObject(error) ? error.stack : undefined;
    return NextResponse.json(
      {
        error: "Internal server error during upload",
        details: String(message ?? error),
        stack: process.env.NODE_ENV === "development" ? stack : undefined,
      },
      { status: 500 }
    );
  }
}
