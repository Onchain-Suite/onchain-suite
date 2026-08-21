import { headers } from "next/headers";

import { fetchWithTimeout } from "@/lib/server-fetch";
import { isJsonObject } from "@/lib/utils";

const normalizeSessionResponse = (payload: unknown) => {
  const payloadObj = isJsonObject(payload) ? payload : undefined;
  const root = payloadObj?.data ?? payload;
  const rootObj = isJsonObject(root) ? root : payloadObj;
  const nestedRoot = isJsonObject(rootObj?.data) ? rootObj.data : undefined;

  const userCandidate =
    rootObj?.user ?? nestedRoot?.user ?? payloadObj?.user ?? null;
  const user = isJsonObject(userCandidate) ? userCandidate : null;
  if (!user) return null;

  const sessionCandidate =
    rootObj?.session ?? nestedRoot?.session ?? payloadObj?.session ?? {};
  const session = isJsonObject(sessionCandidate) ? sessionCandidate : {};

  return { session, user };
};

export async function getSession() {
  try {
    const headersList = await headers();
    const cookie = headersList.get("cookie") ?? "";
    const cookieLength = cookie.length;
    const hasCookieHeader = cookieLength > 0;
    if (!hasCookieHeader) return null;
    const cookiePairs = cookie
      .split(";")
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .map((p) => {
        const idx = p.indexOf("=");
        if (idx === -1) return [p, ""] as const;
        return [p.slice(0, idx), p.slice(idx + 1)] as const;
      });
    const cookieNames = cookiePairs.map(([name]) => name);
    const cookieMap = new Map(cookiePairs);
    const sessionCookieRaw =
      cookieMap.get("better-auth.session_token") ??
      cookieMap.get("__Secure-better-auth.session_token") ??
      cookieMap.get("__Host-better-auth.session_token") ??
      cookieMap.get("better-auth.sessionToken") ??
      cookieMap.get("__Secure-better-auth.sessionToken") ??
      cookieMap.get("__Host-better-auth.sessionToken") ??
      null;
    const sessionCookie = sessionCookieRaw
      ? decodeURIComponent(sessionCookieRaw)
      : null;
    const apiTokenRaw = cookieMap.get("onchain.token") ?? null;
    const apiToken = apiTokenRaw ? decodeURIComponent(apiTokenRaw) : null;
    const hasBetterAuthCookie = cookieNames.some((n) =>
      n.toLowerCase().includes("better-auth")
    );
    const shouldSendApiBearer = Boolean(apiToken) && !hasBetterAuthCookie;

    const forwardedProto = headersList.get("x-forwarded-proto") ?? "http";
    const forwardedHost =
      headersList.get("x-forwarded-host") ?? headersList.get("host");
    const inferredBase = forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : null;

    const appBase =
      inferredBase ??
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.APP_URL ??
      "http://localhost:3000";
    const appClean = appBase.replace(/\/$/, "");

    try {
      // 1) Prefer local proxy so it can inject Authorization from onchain.token.
      // Bounded + retried once: a stalled session fetch must not hang the whole
      // server render (which leaves the dashboard stuck on its skeleton).
      const sessionResponse = await fetchWithTimeout(
        `${appClean}/api/v1/auth/get-session`,
        {
          headers: {
            Cookie: cookie,
            ...(shouldSendApiBearer
              ? { Authorization: `Bearer ${apiToken}` }
              : {}),
          },
          cache: "no-store",
        },
        { timeoutMs: 8000, retries: 1 }
      );

      if (sessionResponse.ok) {
        const sessionJson = await sessionResponse.json();
        const normalized = normalizeSessionResponse(sessionJson);
        const user = normalized?.user ?? null;
        if (user?.id || user?.email) {
          return {
            session: sessionJson?.session ?? {},
            user,
          };
        }
      }

      if (!sessionResponse.ok) {
        if (sessionResponse.status !== 404 && sessionResponse.status !== 401) {
          console.warn("[getSession]", {
            at: new Date().toISOString(),
            ok: false,
            status: sessionResponse.status,
            hasCookieHeader,
            cookieLength,
            endpoint: "/auth/get-session",
            tokenPresent: !!apiToken || !!sessionCookie,
          });
        }
      }

      // 2) Fallback to profile check directly if get-session failed or didn't return a user
      const profileResponse = await fetchWithTimeout(
        `${appClean}/api/v1/user/profile`,
        {
          headers: {
            Cookie: cookie,
            ...(shouldSendApiBearer
              ? { Authorization: `Bearer ${apiToken}` }
              : {}),
          },
          cache: "no-store",
        },
        { timeoutMs: 8000, retries: 1 }
      );

      if (!profileResponse.ok) {
        if (profileResponse.status !== 404 && profileResponse.status !== 401) {
          console.warn("[getSession]", {
            at: new Date().toISOString(),
            ok: false,
            status: profileResponse.status,
            hasCookieHeader,
            cookieLength,
            endpoint: "/user/profile",
            tokenPresent: !!apiToken || !!sessionCookie,
            hasBetterAuthCookie,
            cookieNames: cookieNames.slice(0, 10),
          });
        }
        return null;
      }

      const profileJson = await profileResponse.json();
      const normalized = normalizeSessionResponse(profileJson);
      const user = normalized?.user ?? null;
      if (!user?.id && !user?.email) {
        console.warn("[getSession]", {
          at: new Date().toISOString(),
          ok: true,
          invalidShape: true,
          hasCookieHeader,
          cookieLength,
          endpoint: "/user/profile",
          tokenPresent: !!apiToken || !!sessionCookie,
          hasBetterAuthCookie,
          cookieNames: cookieNames.slice(0, 10),
        });
        return null;
      }

      return {
        session: apiToken ? { token: apiToken } : {},
        user,
      };
    } catch (innerError) {
      console.error("Inner fetch failed:", innerError);
      return null;
    }
  } catch (error) {
    console.error("Failed to fetch session:", error);
    return null;
  }
}
