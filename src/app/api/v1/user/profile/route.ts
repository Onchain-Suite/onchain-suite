import { type NextRequest, NextResponse } from "next/server";

import { hasSessionCookie } from "@/lib/auth-cookie";

export const dynamic = "force-dynamic";

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

const getBackendApiKey = () => {
  return pickNonEmpty(
    process.env.BACKEND_API_KEY,
    process.env.NEXT_PUBLIC_BACKEND_API_KEY,
    process.env.NEXT_PUBLIC_API_KEY
  );
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

const extractMirroredUserFromCookie = (
  cookieHeader: string
): Record<string, unknown> | null => {
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
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const hasBetterAuthSession = (cookieHeader: string) =>
  hasSessionCookie(cookieHeader);

const buildUpstreamHeaders = (req: NextRequest) => {
  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("accept-encoding");

  const cookieHeader = req.headers.get("cookie") ?? "";
  const token = extractTokenFromCookie(cookieHeader);
  if (
    token &&
    !hasBetterAuthSession(cookieHeader) &&
    !headers.has("authorization")
  ) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const apiKey = getBackendApiKey();
  if (apiKey && !headers.has("x-api-key")) {
    headers.set("x-api-key", apiKey);
  }

  return headers;
};

const isPlaceholderIdentity = (user: Record<string, unknown> | null) => {
  if (!user) return false;
  const email = typeof user.email === "string" ? user.email.toLowerCase() : "";
  const name =
    typeof user.name === "string" ? user.name.trim().toLowerCase() : "";
  const id = typeof user.id === "string" ? user.id.toLowerCase() : "";
  return (
    email.endsWith("@onchainsuite.local") ||
    name === "test user" ||
    id === "test-user-id"
  );
};

const patchPlaceholderIdentity = (
  payload: unknown,
  mirroredUser: Record<string, unknown> | null
) => {
  if (!mirroredUser || typeof payload !== "object" || payload === null) {
    return null;
  }

  const payloadObj = payload as Record<string, unknown>;
  const root =
    "data" in payloadObj &&
    payloadObj.data &&
    typeof payloadObj.data === "object"
      ? (payloadObj.data as Record<string, unknown>)
      : payloadObj;
  const currentUser =
    "user" in root && root.user && typeof root.user === "object"
      ? (root.user as Record<string, unknown>)
      : root;

  if (
    !isPlaceholderIdentity(currentUser) ||
    isPlaceholderIdentity(mirroredUser)
  ) {
    return null;
  }

  const patchedUser = { ...currentUser };
  for (const key of [
    "name",
    "email",
    "firstName",
    "lastName",
    "image",
  ] as const) {
    const mirroredValue = mirroredUser[key];
    if (typeof mirroredValue === "string" && mirroredValue.trim().length > 0) {
      patchedUser[key] = mirroredValue;
    }
  }

  if ("user" in root && root.user && typeof root.user === "object") {
    return {
      ...payloadObj,
      data: {
        ...root,
        user: patchedUser,
      },
    };
  }

  if (
    "data" in payloadObj &&
    payloadObj.data &&
    typeof payloadObj.data === "object"
  ) {
    return {
      ...payloadObj,
      data: {
        ...root,
        ...patchedUser,
      },
    };
  }

  return {
    ...payloadObj,
    ...patchedUser,
  };
};

const buildResponse = async (upstream: Response) => {
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("connection");
  responseHeaders.delete("transfer-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("content-encoding");

  return new NextResponse(
    upstream.status === 204 ? null : await upstream.arrayBuffer(),
    { status: upstream.status, headers: responseHeaders }
  );
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const targetUrl = `${getBackendBaseUrl()}/user/profile${url.search}`;
  const cookieHeader = req.headers.get("cookie") ?? "";
  const mirroredUser = extractMirroredUserFromCookie(cookieHeader);
  const upstreamHeaders = buildUpstreamHeaders(req);

  const upstream = await fetch(targetUrl, {
    method: "GET",
    headers: upstreamHeaders,
    cache: "no-store",
  });
  const cloned = upstream.clone();
  const responseText = await cloned.text().catch(() => "");
  const responseJson: unknown = (() => {
    try {
      return responseText.length > 0 ? JSON.parse(responseText) : null;
    } catch {
      return null;
    }
  })();
  const patchedPayload = patchPlaceholderIdentity(responseJson, mirroredUser);
  if (patchedPayload) {
    const headers = new Headers(upstream.headers);
    headers.delete("connection");
    headers.delete("transfer-encoding");
    headers.delete("content-length");
    headers.delete("content-encoding");
    return new NextResponse(JSON.stringify(patchedPayload), {
      status: upstream.status,
      headers,
    });
  }

  return buildResponse(upstream);
}

export async function PUT(req: NextRequest) {
  const url = new URL(req.url);
  const targetUrl = `${getBackendBaseUrl()}/user/profile${url.search}`;

  const headers = buildUpstreamHeaders(req);
  const body = await req.arrayBuffer();

  const upstream = await fetch(targetUrl, {
    method: "PUT",
    headers,
    body,
    cache: "no-store",
  });

  if (upstream.status !== 404) {
    return buildResponse(upstream);
  }

  let message = "";
  try {
    const cloned = upstream.clone();
    const json = await cloned.json();
    message = String(json?.error?.message ?? json?.message ?? "");
  } catch (_e) {
    String(_e);
  }

  if (!message.toLowerCase().includes("record not found")) {
    return buildResponse(upstream);
  }

  const fallback = await fetch(targetUrl, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
  });

  return buildResponse(fallback);
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const targetUrl = `${getBackendBaseUrl()}/user/profile${url.search}`;

  const upstream = await fetch(targetUrl, {
    method: "POST",
    headers: buildUpstreamHeaders(req),
    body: await req.arrayBuffer(),
    cache: "no-store",
  });

  return buildResponse(upstream);
}
