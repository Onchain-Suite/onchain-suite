import { type NextRequest, NextResponse } from "next/server";

import { handleAudienceImportExport } from "./audience-jobs/handler";
import { ensureBackendAuthHeaders, ensureOrgIdHeader } from "./auth";
import { getBackendApiKey, getBackendBaseUrl, getCorsHeaders } from "./config";
import {
  reportAgentQueryDebug,
  reportEmailDebug,
  reportSettingsProfileBillingDebug,
} from "./debug";
import {
  debugCampaignEmailResponse,
  rewriteEditorSavedBody,
} from "./editor-payload";
import { handleInbox } from "./inbox/handler";
import { handleOrgFallbacks } from "./org-fallbacks";

/** `organization/integrations/oauth/:connector/authorize` (a top-level
 *  navigation whose 302 must reach the browser). */
const isOAuthAuthorizePath = (path: string[]) =>
  path.length === 5 &&
  path[0] === "organization" &&
  path[1] === "integrations" &&
  path[2] === "oauth" &&
  path[4] === "authorize";

/** Proxy one request to the backend, with the local routes and fallbacks. */
export const forward = async (
  req: NextRequest,
  path: string[],
  overrideMethod?: string
) => {
  const cors = getCorsHeaders(req);
  const method = (overrideMethod ?? req.method).toUpperCase();
  const startedAt = Date.now();

  const useLocalAudienceJobs =
    process.env.USE_LOCAL_AUDIENCE_JOBS === "1" &&
    process.env.NODE_ENV !== "production";
  if (useLocalAudienceJobs) {
    const audienceImportExport = await handleAudienceImportExport(
      req,
      path,
      method
    );
    if (audienceImportExport) return audienceImportExport;
  }

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
  // The agent query POST gets extra debug logging. Match the live path
  // (`agent/query`) and the legacy alias the backend still accepts.
  const isAgentQueryPath =
    method === "POST" &&
    (joinedPath === "intelligence/query/agent/query" ||
      joinedPath === "intelligence/query/goldrush/mcp/query");

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

  if (isAgentQueryPath) {
    const bodyPreview =
      body && body.byteLength > 0
        ? new TextDecoder().decode(body).slice(0, 500)
        : "";
    reportAgentQueryDebug("request", {
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

  body = rewriteEditorSavedBody(method, path, body, headers);

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
      // OAuth authorize answers with a 302 to the provider; pass it to the
      // browser instead of following it server-side.
      ...(isOAuthAuthorizePath(path) ? { redirect: "manual" as const } : {}),
    });
    if (isAgentQueryPath) {
      const upstreamPreview = await upstream
        .clone()
        .text()
        .then((text) => text.slice(0, 1000))
        .catch(() => "");
      reportAgentQueryDebug("response", {
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
    if (isAgentQueryPath) {
      reportAgentQueryDebug("error", {
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

  const fallback = await handleOrgFallbacks({
    method,
    path,
    upstream,
    body,
    headers,
  });
  if (fallback) return fallback;

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("connection");
  responseHeaders.delete("transfer-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("content-encoding");
  await debugCampaignEmailResponse(method, path, upstream);
  if (cors) {
    for (const [k, v] of Object.entries(cors)) responseHeaders.set(k, v);
  }

  return new NextResponse(
    upstream.status === 204 ? null : await upstream.arrayBuffer(),
    { status: upstream.status, headers: responseHeaders }
  );
};
