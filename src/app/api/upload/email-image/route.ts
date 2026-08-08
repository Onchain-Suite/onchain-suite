import { type NextRequest, NextResponse } from "next/server";

import { isJsonObject } from "@/lib/utils";

export const maxDuration = 300; // 5 minutes

const pickNonEmpty = (...values: Array<string | undefined | null>) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return "";
};

const extractTokenFromCookie = (cookieHeader: string): string | null => {
  const cookieMap = new Map(
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .map((part) => {
        const idx = part.indexOf("=");
        if (idx === -1) return [part, ""] as const;
        return [part.slice(0, idx), part.slice(idx + 1)] as const;
      })
  );
  const raw =
    cookieMap.get("onchain.token") ??
    cookieMap.get("better-auth.session_token") ??
    cookieMap.get("__Secure-better-auth.session_token") ??
    cookieMap.get("__Host-better-auth.session_token") ??
    null;
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

const extractBearer = (header: string | null): string | null => {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim() ?? "";
  return token.length > 0 ? token : null;
};

const ensureBackendAuthHeaders = (req: NextRequest, headers: Headers) => {
  const token =
    extractBearer(headers.get("authorization")) ??
    req.headers.get("x-editor-token") ??
    req.headers.get("x-session-token") ??
    extractTokenFromCookie(req.headers.get("cookie") ?? "");
  if (!token) return;
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("x-session-token")) headers.set("x-session-token", token);
  const existingCookie = headers.get("cookie") ?? "";
  if (!/(^|;\s*)onchain\.token=/.test(existingCookie)) {
    headers.set(
      "cookie",
      `${existingCookie}${existingCookie ? "; " : ""}onchain.token=${encodeURIComponent(token)}`
    );
  }
};

/**
 * Upload an email image asset. Mirrors the logo-upload proxy: accepts a
 * multipart `file`, forwards it to the backend asset endpoint with the caller's
 * auth + org context, and returns the backend response ({ url } / { data: {
 * url } }). The hosted asset URL (not a data URI) is what gets embedded in the
 * email HTML so Gmail/Outlook render it.
 */
export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err: unknown) {
    const message = isJsonObject(err) ? err.message : undefined;
    return NextResponse.json(
      { error: "Failed to parse form data", details: String(message ?? err) },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB - email images should be small
  const ALLOWED_TYPES = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/webp",
  ];
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Image exceeds the 10MB limit" },
      { status: 400 }
    );
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Unsupported image type. Use PNG, JPG, GIF, or WebP." },
      { status: 400 }
    );
  }

  const backendUrl = pickNonEmpty(
    process.env.BACKEND_URL,
    process.env.NEXT_PUBLIC_BACKEND_URL,
    "https://api.onchainsuite.com/api/v1"
  );
  const targetUrl = `${backendUrl.replace(/\/$/, "")}/uploads/email-image`;

  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: file.type });
  const forwardFormData = new FormData();
  forwardFormData.append("file", blob, file.name);

  const headers = new Headers();
  const authHeader = req.headers.get("authorization");
  const cookieHeader = req.headers.get("cookie");
  const orgIdHeader = req.headers.get("x-org-id");
  if (authHeader) headers.set("Authorization", authHeader);
  if (cookieHeader) headers.set("Cookie", cookieHeader);
  if (orgIdHeader) headers.set("x-org-id", orgIdHeader);
  ensureBackendAuthHeaders(req, headers);
  const apiKey = pickNonEmpty(
    process.env.BACKEND_API_KEY,
    process.env.NEXT_PUBLIC_BACKEND_API_KEY,
    process.env.NEXT_PUBLIC_API_KEY
  );
  if (apiKey && !headers.has("x-api-key")) headers.set("x-api-key", apiKey);

  let response: Response;
  try {
    const fetchInit: RequestInit & { duplex?: "half" } = {
      method: "POST",
      headers,
      body: forwardFormData,
      duplex: "half",
    };
    response = await fetch(targetUrl, fetchInit);
  } catch (fetchErr: unknown) {
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
    const errorText = await response.text().catch(() => "");
    let errorJson: unknown = null;
    try {
      errorJson = JSON.parse(errorText);
    } catch {
      // keep raw text
    }
    return NextResponse.json(
      { error: "Backend upload failed", details: errorJson ?? errorText },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data, { status: 200 });
}
