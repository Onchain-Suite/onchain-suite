"use client";

import { ArrowLeftIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

import { campaignsService } from "@/features/campaigns/campaigns.service";

interface EmbeddedEmailEditorProps {
  campaignId: string;
  title?: string;
  onBack: () => void;
}

/** Extract the origin of the editor host so we only trust its postMessages. */
function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

/**
 * Embeds the hosted OnchainSuite email builder (editor.onchainsuite.com) via an
 * iframe. The flow is backend-designed: we mint a short-lived editor-session
 * token (`GET /campaigns/{id}/editor-session`), hand it to the iframe, and the
 * builder saves straight to the campaign using that token - so nothing round-
 * trips through this app. We only react to the builder's `close` postMessage to
 * leave and refresh the campaign's saved content.
 *
 * This replaces the from-scratch block editor (`@/features/email-editor`) while
 * that one is being stabilised; restoring it is a one-file revert of the route.
 */
export function EmbeddedEmailEditor({
  campaignId,
  title,
  onBack,
}: EmbeddedEmailEditorProps) {
  const queryClient = useQueryClient();
  const orgId = getSelectedOrganizationId() ?? undefined;
  const [ready, setReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // The builder calls the backend directly with the editor token, so it must hit
  // the SAME backend that issued the token. Prefer our public backend; the
  // builder falls back to its baked default if we can't supply one.
  const apiBaseUrl = useMemo(() => {
    const value = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").trim();
    return /^https:\/\//i.test(value) ? value : "";
  }, []);

  // A mutation (not a query) because minting a session writes a token hash onto
  // the campaign server-side; we want exactly one per editor open.
  const sessionMutation = useMutation({
    mutationFn: () => campaignsService.getEditorSession(campaignId, orgId),
  });

  const { mutate: startSession } = sessionMutation;
  useEffect(() => {
    if (campaignId.length > 0) startSession();
  }, [campaignId, startSession]);

  const session = sessionMutation.data;

  const iframeSrc = useMemo(() => {
    const editorUrl = session?.editorUrl;
    const token = session?.token;
    if (!editorUrl || !token) return "";
    const base = editorUrl.replace(/\/$/, "");
    const params = new URLSearchParams({
      embedded: "1",
      token,
      campaign: campaignId,
      parentOrigin: typeof window !== "undefined" ? window.location.origin : "",
    });
    if (orgId) params.set("orgId", orgId);
    if (apiBaseUrl) params.set("apiBaseUrl", apiBaseUrl);
    return `${base}/?${params.toString()}`;
  }, [session, campaignId, orgId, apiBaseUrl]);

  const allowedOrigin = useMemo(
    () => originOf(session?.editorUrl ?? ""),
    [session?.editorUrl]
  );

  // The backend returns a placeholder editorUrl ("editor.example.com") when its
  // EDITOR_URL env is unset - that host doesn't resolve, so the iframe would
  // just show a broken frame. Detect it and tell the operator what to fix.
  const editorConfigured = useMemo(() => {
    const url = session?.editorUrl ?? "";
    return url.length > 0 && !/(^|\.)example\.com/i.test(url);
  }, [session?.editorUrl]);

  const leave = () => {
    // The builder persists via the editor token; refresh what the wizard reads.
    queryClient.invalidateQueries({
      queryKey: ["campaigns", "editor-content", campaignId],
    });
    queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId] });
    onBack();
  };

  // The embedded builder does a handshake: on load it posts EDITOR_READY +
  // REQUEST_HOST_CONFIG (retrying on an interval) and waits for the host to push
  // its config back via a `HOST_CONFIG` message. URL params alone are ignored in
  // embedded mode, so without this reply it errors "Missing campaignId. Host app
  // must provide campaign via HOST_CONFIG."
  const sendHostConfig = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    const token = session?.token;
    if (!win || !allowedOrigin || !token) return;
    const payload: Record<string, unknown> = {
      type: "HOST_CONFIG",
      campaignId,
      campaign: campaignId,
      token,
    };
    if (orgId) payload.orgId = orgId;
    if (apiBaseUrl) {
      payload.apiBaseUrl = apiBaseUrl;
      payload.apiUrl = apiBaseUrl;
    }
    win.postMessage(payload, allowedOrigin);
  }, [allowedOrigin, session?.token, campaignId, orgId, apiBaseUrl]);

  useEffect(() => {
    if (!allowedOrigin) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== allowedOrigin) return;
      const { data } = event;
      const type =
        typeof data === "string"
          ? data
          : isJsonObject(data)
            ? String(data.type ?? "")
            : "";
      if (type === "EDITOR_READY" || type === "ready") {
        setReady(true);
        sendHostConfig();
      } else if (
        type === "REQUEST_HOST_CONFIG" ||
        type === "INIT_EMAIL_BUILDER"
      ) {
        sendHostConfig();
      } else if (type === "close") {
        leave();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // `leave` is stable enough for this lifecycle; re-binding per render is fine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedOrigin, campaignId, sendHostConfig]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-2 rounded-lg"
          onClick={leave}
        >
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
          Back
        </Button>
        <p className="truncate text-sm font-medium text-foreground">
          {title && title.length > 0 ? title : "Email editor"}
        </p>
        <span className="ml-auto hidden text-xs text-muted-foreground sm:block">
          Saved to this campaign automatically
        </span>
      </div>

      <div className="relative flex-1 bg-muted/30">
        {sessionMutation.isError ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="max-w-sm text-sm text-muted-foreground">
              We couldn&apos;t start the email editor.{" "}
              {sessionMutation.error instanceof Error
                ? sessionMutation.error.message
                : ""}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onBack}>
                Back to campaign
              </Button>
              <Button onClick={() => sessionMutation.mutate()}>
                Try again
              </Button>
            </div>
          </div>
        ) : session && !editorConfigured ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="max-w-md text-sm text-muted-foreground">
              The email editor isn&apos;t configured yet. Point the
              backend&apos;s{" "}
              <span className="font-mono text-foreground">EDITOR_URL</span> at{" "}
              <span className="font-mono text-foreground">
                https://editor.onchainsuite.com
              </span>{" "}
              (it currently returns a placeholder host), then reopen the editor.
            </p>
            <Button variant="outline" onClick={onBack}>
              Back to campaign
            </Button>
          </div>
        ) : iframeSrc && editorConfigured ? (
          <>
            {!ready ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <ArrowPathIcon
                  className="h-5 w-5 animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
            ) : null}
            <iframe
              ref={iframeRef}
              title="Email editor"
              src={iframeSrc}
              onLoad={() => {
                setReady(true);
                // Proactive first push in case the builder's REQUEST_HOST_CONFIG
                // fired before our listener attached; it also retries on its own.
                sendHostConfig();
              }}
              className="h-full w-full border-0"
              allow="clipboard-write"
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ArrowPathIcon
              className="h-5 w-5 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          </div>
        )}
      </div>
    </div>
  );
}
