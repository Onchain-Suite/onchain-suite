"use client";

import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { authClient } from "@/lib/auth-client";
import {
  cn,
  extractEmailContent,
  getSelectedOrganizationId,
  isJsonObject,
} from "@/lib/utils";

import { campaignsService } from "@/features/campaigns/campaigns.service";
import { templatesService } from "@/features/templates/templates.service";

export const dynamic = "force-dynamic";

const DEFAULT_EDITOR_ORIGIN_PROD = "https://editor.onchainsuite.com";
const DEFAULT_EDITOR_ORIGIN_DEV = DEFAULT_EDITOR_ORIGIN_PROD;
const DEFAULT_BACKEND_API_BASE_PROD = "https://api.onchainsuite.com/api/v1";

const isPlaceholderEditorHost = (hostname: string) =>
  hostname === "example.com" || hostname.endsWith(".example.com");

const isLoopbackHost = (hostname: string) =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";

const normalizeEnvString = (value: string | undefined | null) => {
  let out = typeof value === "string" ? value : "";
  const stripSpace = (s: string) =>
    s.replace(/^[\s\u200B\uFEFF]+|[\s\u200B\uFEFF]+$/g, "");
  out = stripSpace(out);
  if (out.length === 0) return out;
  const wrappers = new Set(["`", '"', "'"]);
  while (out.length > 0) {
    const prev = out;
    while (out.length > 0 && wrappers.has(out[0])) out = out.slice(1);
    while (out.length > 0 && wrappers.has(out[out.length - 1]))
      out = out.slice(0, -1);
    out = stripSpace(out);
    if (out === prev) break;
  }
  return out;
};

const toBackendApiBase = (value: string | undefined | null): string | null => {
  const raw = normalizeEnvString(value);
  if (!raw) return null;
  const clean = raw.replace(/\/$/, "");
  return clean.toLowerCase().endsWith("/api/v1") ? clean : `${clean}/api/v1`;
};

const toEditorOrigin = (value: string | undefined | null): string | null => {
  const raw = normalizeEnvString(value);
  if (!raw) return null;

  const candidates = [raw];
  const needsScheme = !/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(raw);
  if (needsScheme) {
    const scheme =
      raw.startsWith("localhost") || raw.startsWith("127.0.0.1")
        ? "http://"
        : "https://";
    candidates.push(`${scheme}${raw}`);
  }

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      if (url.protocol !== "http:" && url.protocol !== "https:") continue;
      if (isPlaceholderEditorHost(url.hostname)) return null;
      return url.origin;
    } catch {
      // continue
    }
  }

  return null;
};

const decodeBase64Url = (value: string) => {
  let input = value.trim().replace(/-/g, "+").replace(/_/g, "/");
  const pad = input.length % 4;
  if (pad === 2) input += "==";
  if (pad === 3) input += "=";
  if (pad === 1) return null;
  try {
    return typeof atob === "function" ? atob(input) : null;
  } catch {
    return null;
  }
};

/** Pull a push notification payload ({title, body, cta}) out of a builder save message. */
const extractPushPayload = (
  raw: unknown
): {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
} | null => {
  if (!isJsonObject(raw)) return null;
  const candidates = [
    raw.push,
    isJsonObject(raw.data) ? raw.data.push : undefined,
  ];
  for (const candidate of candidates) {
    if (!isJsonObject(candidate)) continue;
    const title = typeof candidate.title === "string" ? candidate.title : "";
    const body = typeof candidate.body === "string" ? candidate.body : "";
    if (title.trim().length === 0 && body.trim().length === 0) continue;
    return {
      title,
      body,
      ctaLabel:
        typeof candidate.ctaLabel === "string" ? candidate.ctaLabel : undefined,
      ctaUrl:
        typeof candidate.ctaUrl === "string" ? candidate.ctaUrl : undefined,
    };
  }
  return null;
};

const parseMaybeJson = (raw: string) => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 200_000) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
};

export default function CampaignEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasRedirectedRef = useRef(false);
  const hasWarnedAuth401Ref = useRef(false);
  const isConfirmingSaveRef = useRef(false);
  const hasPostedInitRef = useRef(false);
  const lastAuthRefreshAtRef = useRef(0);
  const [iframeFailed, setIframeFailed] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isConfirmingSave, setIsConfirmingSave] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [lastConfirmedSaveAt, setLastConfirmedSaveAt] = useState<string | null>(
    null
  );
  const [lastTemplateId, setLastTemplateId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const campaignId = (searchParams?.get("campaign") ?? "").trim();
  const returnTo = (searchParams?.get("returnTo") ?? "").trim();

  /**
   * The editor refuses to load templates without an orgId ("Missing orgId.
   * Host app must provide orgId via HOST_CONFIG").
   *
   * The `onchain.selectedOrgId` cookie is written client-side by the org
   * switcher with no expiry, so it's a session cookie: on a fresh browser
   * session — or simply before the switcher has mounted and written it — the
   * cookie is empty and we'd hand the editor a null orgId. Fall back to the
   * session's active organization, which is authoritative and always present
   * once authenticated.
   */
  const { data: authSession } = authClient.useSession();
  const sessionOrgId =
    typeof authSession?.session?.activeOrganizationId === "string"
      ? authSession.session.activeOrganizationId.trim()
      : "";
  const resolvedOrgId = useMemo(
    () => getSelectedOrganizationId() ?? (sessionOrgId || null),
    [sessionOrgId]
  );
  // In-app push campaigns author a pop-up notification in the builder's push
  // panel instead of an email — saves skip the email render pipeline.
  const isPushMode = (searchParams?.get("channel") ?? "") === "in-app-push";
  const templateNameParam = (searchParams?.get("templateName") ?? "").trim();
  const subjectParam = (searchParams?.get("subject") ?? "").trim();
  const previewTextParam = (searchParams?.get("previewText") ?? "").trim();
  const senderNameParam = (searchParams?.get("senderName") ?? "").trim();
  const senderEmailParam = (searchParams?.get("senderEmail") ?? "").trim();
  const replyToEmailParam = (searchParams?.get("replyToEmail") ?? "").trim();
  const initialDocument = useMemo(() => {
    const b64 = (searchParams?.get("initialJsonB64") ??
      searchParams?.get("initB64") ??
      "") as string;
    if (b64.trim().length > 0) {
      const decoded = decodeBase64Url(b64);
      const parsed = decoded ? parseMaybeJson(decoded) : null;
      return parsed;
    }
    const raw = (searchParams?.get("initialJson") ??
      searchParams?.get("init") ??
      searchParams?.get("document") ??
      "") as string;
    return raw.trim().length > 0 ? parseMaybeJson(raw) : null;
  }, [searchParams]);

  const editorSessionQuery = useQuery({
    queryKey: ["campaigns", "editor-session", campaignId],
    queryFn: () => campaignsService.getEditorSession(campaignId),
    enabled: campaignId.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      const data = query.state.data as unknown;
      const expiresAtRaw = isJsonObject(data) ? data.expiresAt : undefined;
      if (
        typeof expiresAtRaw !== "string" ||
        expiresAtRaw.trim().length === 0
      ) {
        return false;
      }
      const expiresAtMs = new Date(expiresAtRaw).getTime();
      if (!Number.isFinite(expiresAtMs)) return 60_000;
      const msUntilExpiry = expiresAtMs - Date.now();
      const refreshIn = msUntilExpiry - 30_000;
      const clamped = Math.min(Math.max(refreshIn, 15_000), 5 * 60_000);
      return clamped;
    },
    refetchIntervalInBackground: true,
  });

  const editorSessionData = useMemo(() => {
    const raw = editorSessionQuery.data as unknown;
    if (!isJsonObject(raw)) return null;
    const level1 = isJsonObject(raw.data) ? raw.data : raw;
    const level2 = isJsonObject(level1.data) ? level1.data : level1;
    return isJsonObject(level2) ? level2 : null;
  }, [editorSessionQuery.data]);

  const pickStringField = useCallback(
    (obj: Record<string, unknown> | null, keys: string[]) => {
      if (!obj) return undefined;
      for (const key of keys) {
        const raw = obj[key];
        if (typeof raw !== "string") continue;
        const cleaned = normalizeEnvString(raw);
        if (cleaned.length > 0) return cleaned;
      }
      return undefined;
    },
    []
  );

  const editorSessionEditorUrl = pickStringField(editorSessionData, [
    "editorUrl",
    "editorURL",
    "url",
    "sessionUrl",
    "sessionURL",
  ]);
  const editorSessionToken = pickStringField(editorSessionData, [
    "token",
    "sessionToken",
    "editorToken",
    "accessToken",
    "jwt",
  ]);
  const editorSessionExpiresAt = pickStringField(editorSessionData, [
    "expiresAt",
    "expires_at",
    "expires",
  ]);

  useEffect(() => {
    if (!campaignId) return;
    if (!editorSessionQuery.isError) return;
    const err = editorSessionQuery.error;
    const message =
      err instanceof Error ? err.message : "Failed to start editor session";
    toast.error(message);
  }, [campaignId, editorSessionQuery.error, editorSessionQuery.isError]);

  useEffect(() => {
    if (!campaignId) return;
    const tokenLength =
      typeof editorSessionToken === "string" ? editorSessionToken.length : 0;
    if (
      editorSessionQuery.isSuccess &&
      (!editorSessionToken || tokenLength === 0)
    ) {
      toast.error(
        "Editor session started but no token was returned by the API."
      );
    }
  }, [
    campaignId,
    editorSessionEditorUrl,
    editorSessionExpiresAt,
    editorSessionQuery.isSuccess,
    editorSessionToken,
  ]);

  const editorOrigin = useMemo(() => {
    const configured = toEditorOrigin(
      process.env.NEXT_PUBLIC_EMAIL_EDITOR_ORIGIN
    );
    if (configured) return configured;

    const fromSession = toEditorOrigin(editorSessionEditorUrl);
    if (editorSessionQuery.isSuccess && fromSession) return fromSession;

    return process.env.NODE_ENV === "production"
      ? DEFAULT_EDITOR_ORIGIN_PROD
      : DEFAULT_EDITOR_ORIGIN_DEV;
  }, [editorSessionEditorUrl, editorSessionQuery.isSuccess]);

  const allowedOrigins = useMemo(() => {
    const fromSession =
      editorSessionQuery.isSuccess && editorSessionEditorUrl
        ? (() => {
            try {
              return new URL(String(editorSessionEditorUrl)).origin;
            } catch {
              return null;
            }
          })()
        : null;
    return new Set<string>([
      DEFAULT_EDITOR_ORIGIN_PROD,
      DEFAULT_EDITOR_ORIGIN_DEV,
      editorOrigin,
      ...(fromSession ? [fromSession] : []),
    ]);
  }, [editorOrigin, editorSessionEditorUrl, editorSessionQuery.isSuccess]);

  const apiBaseUrlForEditor = useMemo(() => {
    if (typeof window === "undefined") return null;
    const localProxy = `${window.location.origin}/api/v1`;
    const hostHostname = (() => {
      try {
        return new URL(window.location.origin).hostname;
      } catch {
        return window.location.hostname;
      }
    })();

    if (!isLoopbackHost(hostHostname)) return localProxy;

    const editorIsLoopback = (() => {
      try {
        return isLoopbackHost(new URL(editorOrigin).hostname);
      } catch {
        return false;
      }
    })();
    if (editorIsLoopback) return localProxy;

    return (
      toBackendApiBase(process.env.NEXT_PUBLIC_BACKEND_URL) ??
      toBackendApiBase(process.env.BACKEND_URL) ??
      DEFAULT_BACKEND_API_BASE_PROD
    );
  }, [editorOrigin]);

  const iframeSrc = useMemo(() => {
    if (!campaignId) return "";
    const sessionUrl =
      editorSessionQuery.isSuccess && editorSessionEditorUrl
        ? String(editorSessionEditorUrl)
        : null;
    const hostOrigin =
      typeof window !== "undefined" ? window.location.origin : null;
    const apiBaseUrl =
      typeof apiBaseUrlForEditor === "string"
        ? normalizeEnvString(apiBaseUrlForEditor)
        : null;
    const orgId = resolvedOrgId;
    const token =
      editorSessionQuery.isSuccess && editorSessionToken
        ? String(editorSessionToken)
        : null;

    if (sessionUrl) {
      try {
        const url = new URL(sessionUrl);
        if (!isPlaceholderEditorHost(url.hostname)) {
          if (url.origin !== editorOrigin) {
            throw new Error("Editor session URL origin mismatch");
          }
          url.searchParams.set("campaign", campaignId);
          url.searchParams.set("campaignId", campaignId);
          url.searchParams.set("campaign_id", campaignId);
          url.searchParams.set("id", campaignId);
          url.searchParams.set("campaign.id", campaignId);
          url.searchParams.set("embedded", "true");
          if (hostOrigin) {
            url.searchParams.set("hostOrigin", hostOrigin);
            url.searchParams.set("parentOrigin", hostOrigin);
            url.searchParams.set("appOrigin", hostOrigin);
            url.searchParams.set("targetOrigin", hostOrigin);
          }
          if (apiBaseUrl) {
            url.searchParams.set("apiBaseUrl", apiBaseUrl);
            url.searchParams.set("baseUrl", apiBaseUrl);
            url.searchParams.set("backendBaseUrl", apiBaseUrl);
          }
          if (orgId) {
            url.searchParams.set("orgId", orgId);
            url.searchParams.set("xOrgId", orgId);
            url.searchParams.set("organizationId", orgId);
            url.searchParams.set("activeOrganizationId", orgId);
            url.searchParams.set("x-org-id", orgId);
            url.searchParams.set("org.id", orgId);
            url.searchParams.set("organization.id", orgId);
          }
          if (token) {
            url.searchParams.set("token", token);
            url.searchParams.set("sessionToken", token);
            url.searchParams.set("editorToken", token);
          }
          return url.toString();
        }
      } catch {
        // fall through
      }
    }

    try {
      const url = new URL("/", editorOrigin);
      url.searchParams.set("campaign", campaignId);
      url.searchParams.set("campaignId", campaignId);
      url.searchParams.set("campaign_id", campaignId);
      url.searchParams.set("id", campaignId);
      url.searchParams.set("campaign.id", campaignId);
      url.searchParams.set("embedded", "true");
      if (hostOrigin) {
        url.searchParams.set("hostOrigin", hostOrigin);
        url.searchParams.set("parentOrigin", hostOrigin);
        url.searchParams.set("appOrigin", hostOrigin);
        url.searchParams.set("targetOrigin", hostOrigin);
      }
      if (apiBaseUrl) {
        url.searchParams.set("apiBaseUrl", apiBaseUrl);
        url.searchParams.set("baseUrl", apiBaseUrl);
        url.searchParams.set("backendBaseUrl", apiBaseUrl);
      }
      if (orgId) {
        url.searchParams.set("orgId", orgId);
        url.searchParams.set("xOrgId", orgId);
        url.searchParams.set("organizationId", orgId);
        url.searchParams.set("activeOrganizationId", orgId);
        url.searchParams.set("x-org-id", orgId);
        url.searchParams.set("org.id", orgId);
        url.searchParams.set("organization.id", orgId);
      }
      if (token) {
        url.searchParams.set("token", token);
        url.searchParams.set("sessionToken", token);
        url.searchParams.set("editorToken", token);
      }
      return url.toString();
    } catch {
      return "";
    }
  }, [
    campaignId,
    apiBaseUrlForEditor,
    editorOrigin,
    editorSessionEditorUrl,
    editorSessionToken,
    editorSessionQuery.isSuccess,
    // Rebuild the src once the org resolves, so the editor never boots
    // against a URL that omitted orgId.
    resolvedOrgId,
  ]);

  useEffect(() => {
    setIframeFailed(false);
    setIframeLoaded(false);
    hasPostedInitRef.current = false;
  }, [iframeSrc]);

  const iframeDiagnostics = useMemo(() => {
    if (!iframeSrc) return null;
    try {
      const url = new URL(iframeSrc);
      return { origin: url.origin, hostname: url.hostname };
    } catch {
      return null;
    }
  }, [iframeSrc]);

  const postIframeConfig = useCallback(
    (opts?: {
      targetWindow?: Window | null;
      targetOrigin?: string | null;
      requestId?: string | null;
      tokenOverride?: string | null;
    }) => {
      const tokenFromSession =
        editorSessionQuery.isSuccess && editorSessionToken
          ? String(editorSessionToken)
          : null;
      const token = opts?.tokenOverride ?? tokenFromSession;
      const apiBaseUrl =
        typeof apiBaseUrlForEditor === "string"
          ? normalizeEnvString(apiBaseUrlForEditor)
          : null;
      const hostOrigin =
        typeof window !== "undefined" ? window.location.origin : null;
      const postTargetOrigin = "*";
      const orgId = resolvedOrgId;

      const hostConfig = {
        embedded: true,
        id: campaignId,
        campaignId,
        campaign: campaignId,
        orgId,
        token,
        apiBaseUrl: apiBaseUrl ?? undefined,
        sessionToken: token,
        editorToken: token,
        baseUrl: apiBaseUrl ?? undefined,
        backendBaseUrl: apiBaseUrl ?? undefined,
        hostOrigin: hostOrigin ?? undefined,
      };

      try {
        const win = opts?.targetWindow ?? iframeRef.current?.contentWindow;
        win?.postMessage(
          { type: "HOST_CONFIG", ...hostConfig },
          postTargetOrigin
        );
        win?.postMessage(
          {
            type: "HOST_CONFIG",
            hostConfig,
            requestId: opts?.requestId ?? undefined,
          },
          postTargetOrigin
        );
      } catch (e) {
        String(e);
      }
    },
    [
      apiBaseUrlForEditor,
      campaignId,
      editorSessionQuery.isSuccess,
      editorSessionToken,
      // Re-post HOST_CONFIG when the org resolves — otherwise a config sent
      // before the session landed leaves the editor stuck on "Missing orgId".
      resolvedOrgId,
    ]
  );

  const postInitEmailBuilder = useCallback(
    (opts?: { targetWindow?: Window | null; targetOrigin?: string | null }) => {
      if (!initialDocument) return;
      if (hasPostedInitRef.current) return;
      const win = opts?.targetWindow ?? iframeRef.current?.contentWindow;
      if (!win) return;
      try {
        win.postMessage(
          { type: "INIT_EMAIL_BUILDER", data: initialDocument },
          "*"
        );
        hasPostedInitRef.current = true;
      } catch (e) {
        String(e);
      }
    },
    [initialDocument]
  );

  useEffect(() => {
    if (!iframeLoaded) return;
    if (!campaignId) return;

    postIframeConfig();
    postInitEmailBuilder();

    const timeouts = [150, 500, 1200].map((ms) =>
      window.setTimeout(() => {
        postIframeConfig();
        postInitEmailBuilder();
      }, ms)
    );
    return () => {
      for (const id of timeouts) window.clearTimeout(id);
    };
  }, [
    campaignId,
    editorOrigin,
    editorSessionQuery.isSuccess,
    editorSessionToken,
    iframeDiagnostics?.origin,
    iframeLoaded,
    postIframeConfig,
    postInitEmailBuilder,
  ]);

  const nextWizardUrl = useMemo(() => {
    if (returnTo.length > 0) {
      const url = new URL(returnTo, "http://localhost");
      if (campaignId) url.searchParams.set("campaign", campaignId);
      return `${url.pathname}?${url.searchParams.toString()}`;
    }
    const url = new URL("/campaigns/new", "http://localhost");
    url.searchParams.set("step", "3");
    if (campaignId) url.searchParams.set("campaign", campaignId);
    return `${url.pathname}?${url.searchParams.toString()}`;
  }, [campaignId, returnTo]);

  const prevWizardUrl = useMemo(() => {
    const base = returnTo.length > 0 ? returnTo : "/campaigns/new";
    const url = new URL(base, "http://localhost");
    url.searchParams.set("step", "2");
    if (campaignId) url.searchParams.set("campaign", campaignId);
    return `${url.pathname}?${url.searchParams.toString()}`;
  }, [campaignId, returnTo]);

  const backUrl = useMemo(() => {
    if (returnTo.length > 0) return returnTo;
    return prevWizardUrl;
  }, [prevWizardUrl, returnTo]);

  const createTemplateFromCampaign = useCallback(
    async (preferredSource?: unknown) => {
      if (!campaignId) throw new Error("Missing campaign id.");

      const preferredExtracted = extractEmailContent(preferredSource);
      const preview = await campaignsService
        .preview(campaignId)
        .catch(() => null);
      const email = await campaignsService
        .getEmailContent(campaignId)
        .catch(() => null);
      const previewExtracted = extractEmailContent(preview);
      const emailExtracted = extractEmailContent(email);
      const extracted =
        (preferredExtracted.html?.trim().length ?? 0) > 0 ||
        (preferredExtracted.textVersion?.trim().length ?? 0) > 0
          ? preferredExtracted
          : (previewExtracted.html?.trim().length ?? 0) > 0 ||
              (previewExtracted.textVersion?.trim().length ?? 0) > 0
            ? previewExtracted
            : emailExtracted;
      const finalHtml = extracted.html ?? "";
      const finalTextVersion = extracted.textVersion ?? "";
      const finalJson = extracted.json ?? null;
      const finalAssets = extracted.assets ?? null;

      if (
        finalHtml.trim().length === 0 &&
        finalTextVersion.trim().length === 0
      ) {
        throw new Error("No email content found. Save the email first.");
      }

      let name = "";
      if (templateNameParam.length > 0) {
        name = templateNameParam;
      }
      try {
        const content = await campaignsService.getContent(campaignId);
        if (!name && typeof content.subject === "string") {
          name = content.subject.trim();
        }
      } catch (_e) {
        String(_e);
      }

      if (!name) {
        name = `Template ${new Date().toLocaleString()}`;
      }

      const created = await templatesService.create({
        name,
        folder: "saved",
        content: {
          html: finalHtml,
          textVersion: finalTextVersion,
          json: finalJson,
          assets: finalAssets,
        },
      });

      const createdId =
        created && typeof created.id === "string" ? created.id.trim() : "";
      if (!createdId) {
        throw new Error(
          "Template save did not return a template id. Check backend response."
        );
      }

      await templatesService.get(createdId);
      setLastTemplateId(createdId);
      window.dispatchEvent(new CustomEvent("onchain:templates-updated"));
      return createdId;
    },
    [campaignId, templateNameParam]
  );

  useEffect(() => {
    const sanitizeAuthDebug = (value: Record<string, unknown>) => {
      const removed = new Set([
        "authorization",
        "Authorization",
        "token",
        "editorToken",
        "bearer",
        "headers",
        "requestHeaders",
        "responseHeaders",
      ]);
      return Object.fromEntries(
        Object.entries(value).filter(([key]) => !removed.has(key))
      );
    };

    const handleMessage = (event: MessageEvent) => {
      const { data: messageData, origin } = event;
      const originClean = normalizeEnvString(origin);
      const fromIframe =
        Boolean(iframeRef.current?.contentWindow) &&
        event.source === iframeRef.current?.contentWindow;
      const originAllowed =
        allowedOrigins.has(originClean) ||
        (fromIframe &&
          (originClean === "null" ||
            originClean.endsWith(".onchainsuite.com") ||
            originClean === "http://localhost:3000" ||
            originClean === "http://127.0.0.1:3000"));
      if (!originAllowed) return;

      if (!isJsonObject(messageData)) return;

      const messageType =
        typeof messageData.type === "string" ? messageData.type : "";
      const requestId =
        typeof messageData.requestId === "string"
          ? messageData.requestId
          : null;
      const looksLikeConfigRequest =
        messageType === "REQUEST_HOST_CONFIG" ||
        messageType === "EDITOR_READY" ||
        messageType === "EMAIL_EDITOR_READY" ||
        messageType === "EMAIL_EDITOR_REQUEST_HOST_CONFIG" ||
        messageType.endsWith("REQUEST_HOST_CONFIG") ||
        messageType.endsWith("EDITOR_READY");

      if (looksLikeConfigRequest) {
        const sourceWindow =
          event.source &&
          typeof (event.source as Window).postMessage === "function"
            ? (event.source as Window)
            : null;
        postIframeConfig({
          targetWindow: sourceWindow,
          targetOrigin: originClean,
          requestId,
        });
        postInitEmailBuilder({
          targetWindow: sourceWindow,
          targetOrigin: originClean,
        });
        if (requestId) {
          try {
            sourceWindow?.postMessage(
              { type: "HOST_CONFIG_ACK", requestId },
              "*"
            );
          } catch (e) {
            String(e);
          }
        }
        return;
      }

      const isAuthRequired =
        messageType === "EMAIL_AUTH_REQUIRED" ||
        messageType === "EMAIL_EDITOR_AUTH_REQUIRED" ||
        messageType.endsWith("EMAIL_AUTH_REQUIRED") ||
        messageType.endsWith("AUTH_REQUIRED");
      if (isAuthRequired) {
        const now = Date.now();
        if (now - lastAuthRefreshAtRef.current < 1500) return;
        lastAuthRefreshAtRef.current = now;

        const sourceWindow =
          event.source &&
          typeof (event.source as Window).postMessage === "function"
            ? (event.source as Window)
            : null;

        (async () => {
          try {
            if (!campaignId) throw new Error("Missing campaign id.");
            const result = await editorSessionQuery.refetch();
            const raw = result.data as unknown;
            const unwrap = (v: unknown) => {
              if (!isJsonObject(v)) return null;
              const level1 = isJsonObject(v.data) ? v.data : v;
              const level2 = isJsonObject(level1.data) ? level1.data : level1;
              return isJsonObject(level2) ? level2 : null;
            };
            const data = unwrap(raw);
            const pick = (
              obj: Record<string, unknown> | null,
              keys: string[]
            ) => {
              if (!obj) return null;
              for (const key of keys) {
                const val = obj[key];
                if (typeof val !== "string") continue;
                const cleaned = normalizeEnvString(val);
                if (cleaned.length > 0) return cleaned;
              }
              return null;
            };
            const nextToken = pick(data, [
              "token",
              "sessionToken",
              "editorToken",
              "accessToken",
              "jwt",
            ]);
            if (!nextToken) {
              throw new Error("Failed to refresh editor session token.");
            }
            postIframeConfig({
              targetWindow: sourceWindow,
              targetOrigin: originClean,
              requestId,
              tokenOverride: nextToken,
            });
            postInitEmailBuilder({
              targetWindow: sourceWindow,
              targetOrigin: originClean,
            });
            toast.message("Editor session refreshed");
          } catch (e) {
            const message =
              e instanceof Error
                ? e.message
                : "Failed to refresh editor session";
            toast.error(message);
          }
        })();
        return;
      }

      if (messageData.type === "EMAIL_AUTH_DEBUG") {
        const safe = sanitizeAuthDebug(messageData);
        const hasAuthorization = safe.hasAuthorization === true;
        const hasOrgId = safe.hasOrgId === true;
        const expiresAtIso =
          editorSessionQuery.isSuccess &&
          typeof editorSessionExpiresAt === "string"
            ? editorSessionExpiresAt
            : null;
        const expiresAtMs = expiresAtIso
          ? new Date(expiresAtIso).getTime()
          : NaN;
        const isExpired = Number.isFinite(expiresAtMs)
          ? Date.now() >= expiresAtMs
          : null;
        const status =
          typeof safe.status === "number"
            ? safe.status
            : typeof safe.statusCode === "number"
              ? safe.statusCode
              : null;

        if (
          status === 401 &&
          hasAuthorization &&
          hasOrgId &&
          !hasWarnedAuth401Ref.current
        ) {
          hasWarnedAuth401Ref.current = true;
          toast.error(
            isExpired === true
              ? "Editor token appears expired; refresh the editor session token (it is short-lived) and retry."
              : "Editor requests are still getting 401 even though Authorization + orgId are present. This almost always means the token is wrong (not the editor-session token) or expired."
          );
        }
        return;
      }

      if (messageData.type === "EMAIL_SAVED" && !hasRedirectedRef.current) {
        if (isConfirmingSaveRef.current) return;
        isConfirmingSaveRef.current = true;
        setIsConfirmingSave(true);

        (async () => {
          try {
            if (!campaignId) throw new Error("Missing campaign id.");

            // Push campaigns: persist the pop-up notification variant and
            // return to the wizard — there is no email to render/confirm.
            if (isPushMode) {
              const pushPayload = extractPushPayload(messageData);
              if (pushPayload) {
                await campaignsService.editorSaved(campaignId, {
                  push: pushPayload,
                });
              }
              // The builder may also save the push variant itself via its
              // editor-token API — verify the campaign has one either way.
              const saved = await campaignsService
                .getEditorContent(campaignId)
                .catch(() => null);
              const savedPush =
                isJsonObject(saved) && isJsonObject(saved.push)
                  ? saved.push
                  : null;
              const hasStoredPush = Boolean(
                savedPush &&
                ((typeof savedPush.title === "string" &&
                  savedPush.title.trim().length > 0) ||
                  (typeof savedPush.body === "string" &&
                    savedPush.body.trim().length > 0))
              );
              if (!pushPayload && !hasStoredPush) {
                throw new Error(
                  "No push notification content was saved. Author the pop-up in the builder's push panel, then save again."
                );
              }
              setLastConfirmedSaveAt(new Date().toISOString());
              toast.success("Push notification saved");
              hasRedirectedRef.current = true;
              router.push(nextWizardUrl);
              return;
            }

            const sleep = (ms: number) =>
              new Promise<void>((resolve) => {
                window.setTimeout(resolve, ms);
              });
            const extractedFromSave = extractEmailContent(messageData);
            const saveHtml = extractedFromSave.html?.trim() ?? "";
            const saveText = extractedFromSave.textVersion?.trim() ?? "";
            const saveJson = extractedFromSave.json ?? null;
            const saveAssets = extractedFromSave.assets ?? null;

            if (
              saveHtml.length === 0 &&
              saveText.length === 0 &&
              saveJson === null
            ) {
              throw new Error(
                "Editor save completed, but no email payload was returned from the builder."
              );
            }

            const content = await campaignsService
              .getContent(campaignId)
              .catch(() => null);
            const renderRequest = {
              subject:
                content && typeof content.subject === "string"
                  ? content.subject
                  : subjectParam || undefined,
              previewText:
                content && typeof content.previewText === "string"
                  ? content.previewText
                  : previewTextParam || undefined,
              senderName:
                content && typeof content.senderName === "string"
                  ? content.senderName
                  : senderNameParam || undefined,
              senderEmail:
                content && typeof content.senderEmail === "string"
                  ? content.senderEmail
                  : senderEmailParam || undefined,
              replyToEmail:
                content && typeof content.replyToEmail === "string"
                  ? content.replyToEmail
                  : replyToEmailParam || undefined,
              html: saveHtml || undefined,
              textVersion: saveText || undefined,
              json: saveJson ?? undefined,
              assets: saveAssets ?? undefined,
            };
            const saveResult = await campaignsService.saveEmailContent(
              campaignId,
              renderRequest
            );

            const savedExtracted = extractEmailContent(saveResult);
            let renderedSource: unknown = saveResult;
            if (
              (savedExtracted.html?.trim().length ?? 0) > 0 ||
              (savedExtracted.textVersion?.trim().length ?? 0) > 0
            ) {
              setLastConfirmedSaveAt(new Date().toISOString());
              setIsSavingTemplate(true);
              try {
                await createTemplateFromCampaign(renderedSource);
              } finally {
                setIsSavingTemplate(false);
              }

              toast.success("Saved");
              hasRedirectedRef.current = true;
              router.push(nextWizardUrl);
              return;
            }

            const retryDelays = [0, 250, 700, 1500, 3000];
            let hasRenderedEmail = false;
            for (const delayMs of retryDelays) {
              if (delayMs > 0) await sleep(delayMs);

              try {
                const preview = await campaignsService.preview(
                  campaignId,
                  renderRequest
                );
                const extracted = extractEmailContent(preview);
                const nextHtml = extracted.html?.trim() ?? "";
                const nextText = extracted.textVersion?.trim() ?? "";
                if (nextHtml.length > 0 || nextText.length > 0) {
                  hasRenderedEmail = true;
                  renderedSource = preview;
                  break;
                }
              } catch (_e) {
                String(_e);
              }

              try {
                const email =
                  await campaignsService.getEmailContent(campaignId);
                const extracted = extractEmailContent(email);
                const nextHtml = extracted.html?.trim() ?? "";
                const nextText = extracted.textVersion?.trim() ?? "";
                if (nextHtml.length > 0 || nextText.length > 0) {
                  hasRenderedEmail = true;
                  renderedSource = email;
                  break;
                }
              } catch (_e) {
                String(_e);
              }
            }

            if (!hasRenderedEmail) {
              throw new Error(
                "Email save was reported, but the backend did not return a rendered email after PUT /campaigns/:id/email. Ensure the canonical render endpoint persists populated html or text."
              );
            }

            setLastConfirmedSaveAt(new Date().toISOString());
            setIsSavingTemplate(true);
            try {
              await createTemplateFromCampaign(renderedSource);
            } finally {
              setIsSavingTemplate(false);
            }

            toast.success("Saved");

            hasRedirectedRef.current = true;
            router.push(nextWizardUrl);
          } catch (e) {
            const message =
              e instanceof Error
                ? e.message
                : "Failed to confirm that the email was saved";
            toast.error(message);
          } finally {
            isConfirmingSaveRef.current = false;
            setIsConfirmingSave(false);
          }
        })();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    allowedOrigins,
    createTemplateFromCampaign,
    editorSessionExpiresAt,
    editorSessionQuery,
    editorSessionQuery.refetch,
    editorSessionQuery.isSuccess,
    nextWizardUrl,
    postIframeConfig,
    postInitEmailBuilder,
    router,
    campaignId,
    initialDocument,
    previewTextParam,
    replyToEmailParam,
    senderEmailParam,
    senderNameParam,
    subjectParam,
    isPushMode,
  ]);

  return (
    <div className="mx-auto -mt-4 w-full max-w-[1720px] px-4 pb-1">
      {!campaignId ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Missing campaign id.
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={() => router.push(backUrl)}
              disabled={isConfirmingSave || isSavingTemplate}
            >
              <ArrowLeftIcon aria-hidden="true" className="mr-1 h-4 w-4" />
              Back
            </Button>

            <div className="flex items-center gap-2">
              {lastConfirmedSaveAt ? (
                <div className="hidden rounded-full border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground sm:block">
                  Saved {new Date(lastConfirmedSaveAt).toLocaleTimeString()}
                </div>
              ) : null}
              {lastTemplateId ? (
                <div className="hidden rounded-full border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground sm:block">
                  Template {lastTemplateId}
                </div>
              ) : null}
            </div>
          </div>

          {/* The embedded builder is a desktop-oriented external editor; the
              page itself never overflows, but warn small screens up front. */}
          <p className="rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground lg:hidden">
            The email builder works best on a larger screen. You can still edit
            here, but some tools may be cramped.
          </p>

          <div
            ref={containerRef}
            className={cn(
              "relative h-[calc(100vh-96px)] min-h-[480px] overflow-hidden rounded-2xl border border-border bg-background shadow-sm"
            )}
          >
            {iframeFailed ? (
              <div className="absolute inset-0 z-10 flex h-full w-full flex-col items-center justify-center gap-3 bg-background px-6 text-center">
                <div className="text-sm font-medium">
                  Editor failed to load.
                </div>
                <div className="text-xs text-muted-foreground">
                  {iframeDiagnostics?.origin
                    ? `Tried: ${iframeDiagnostics.origin}`
                    : "The editor URL is invalid."}
                </div>
                {iframeSrc ? (
                  <a
                    className="text-xs text-primary underline underline-offset-2"
                    href={iframeSrc}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open editor URL
                  </a>
                ) : null}
              </div>
            ) : null}
            <iframe
              key={iframeSrc}
              src={iframeSrc}
              title="Email editor"
              className="h-full w-full"
              style={{ border: "none" }}
              referrerPolicy="strict-origin-when-cross-origin"
              ref={iframeRef}
              onLoad={() => {
                setIframeFailed(false);
                setIframeLoaded(true);
                postIframeConfig();
              }}
              onError={() => setIframeFailed(true)}
              allow="fullscreen"
            />
          </div>
        </div>
      )}
    </div>
  );
}
