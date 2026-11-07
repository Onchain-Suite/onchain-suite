"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import {
  type FacebookSdk,
  loadFacebookSdk,
  readSignupMessage,
} from "../../utils/facebook-sdk";
import { connectionsService } from "@/features/integrations/connections.service";
import {
  CONNECTIONS_PREFIX,
  useConnection,
} from "@/features/integrations/hooks/use-connections";

export const whatsappEmbeddedKey = (orgId: string | null) =>
  [...CONNECTIONS_PREFIX, "whatsapp", "embedded", orgId] as const;

/**
 * "Connect with Facebook": Meta's Embedded Signup. The person creates or picks
 * their own WhatsApp Business Account and number in Meta's window and adds
 * their own payment method, so Meta bills them for conversations. The popup
 * hands back a one-time code (to `FB.login`) and the account ids (as a window
 * message), in either order; once both are here the server finishes the job.
 * Shown only before WhatsApp is connected, and only when the server has a Meta
 * app set up.
 *
 * Two invariants:
 * - The SDK is loaded ahead of time, so `FB.login` runs synchronously inside
 *   the click. Awaiting the download first can outlast the browser's user
 *   activation, and the popup is then blocked.
 * - The workspace is captured when signup starts. Switching workspace mid-way
 *   abandons the flow, so a connection can never land in the wrong org.
 */
export function WhatsAppEmbeddedSignup() {
  const { organizationId, canManage, connection } = useConnection("whatsapp");
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [sdk, setSdk] = useState<FacebookSdk | null>(null);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const pending = useRef<{
    orgId?: string | null;
    code?: string;
    wabaId?: string;
    phoneNumberId?: string;
  }>({});

  const settings = useQuery({
    queryKey: whatsappEmbeddedKey(organizationId),
    enabled: canManage && Boolean(organizationId),
    retry: false,
    staleTime: 5 * 60_000,
    queryFn: () =>
      connectionsService.whatsappEmbeddedSettings(organizationId ?? undefined),
  });

  const s = settings.data;
  const appId = s?.enabled && s.configId ? s.appId : null;
  const graphVersion = s?.graphVersion;
  const [loadAttempt, setLoadAttempt] = useState(0);

  // Load the SDK as soon as signup is available, never on the click itself.
  useEffect(() => {
    if (!appId || !graphVersion) return;
    let live = true;
    setSdkError(null);
    loadFacebookSdk(appId, graphVersion)
      .then((fb) => live && setSdk(fb))
      .catch(
        (e) =>
          live &&
          setSdkError(
            e instanceof Error ? e.message : "Couldn't load Facebook."
          )
      );
    return () => {
      live = false;
    };
  }, [appId, graphVersion, loadAttempt]);

  // A workspace switch mid-signup abandons it rather than finishing elsewhere.
  useEffect(() => {
    if (
      pending.current.orgId !== undefined &&
      pending.current.orgId !== organizationId
    ) {
      pending.current = {};
      setBusy(false);
    }
  }, [organizationId]);

  const finish = async () => {
    const { orgId, code, wabaId, phoneNumberId } = pending.current;
    if (orgId === undefined || !code || !wabaId || !phoneNumberId) return;
    pending.current = {};
    try {
      const r = await connectionsService.whatsappEmbeddedComplete(
        { code, wabaId, phoneNumberId },
        orgId ?? undefined
      );
      await qc.invalidateQueries({ queryKey: CONNECTIONS_PREFIX });
      if (r.warning) toast.warning(r.warning);
      else
        toast.success(`WhatsApp connected${r.label ? ` as ${r.label}` : ""}`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Couldn't finish connecting WhatsApp."
      );
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const msg = readSignupMessage(event.origin, event.data);
      if (!msg) return;
      // Only a signup this card started (in this workspace) is listened to.
      if (pending.current.orgId === undefined) return;
      if (msg.kind === "finish") {
        pending.current.wabaId = msg.wabaId;
        pending.current.phoneNumberId = msg.phoneNumberId;
        finish().catch(() => undefined);
      } else if (msg.kind === "cancel") {
        pending.current = {};
        setBusy(false);
      } else {
        pending.current = {};
        setBusy(false);
        toast.error(msg.message);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // finish reads refs and stable values only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  if (!s?.enabled || !s.appId || !s.configId || connection) return null;

  // Synchronous on purpose: see the invariants above.
  const start = () => {
    if (sdkError) {
      setLoadAttempt((n) => n + 1);
      return;
    }
    if (!sdk) return;
    setBusy(true);
    pending.current = { orgId: organizationId };
    try {
      sdk.login(
        (response) => {
          const code = response.authResponse?.code;
          if (!code) {
            // Closed the window without finishing.
            setBusy(false);
            return;
          }
          pending.current.code = code;
          finish().catch(() => undefined);
        },
        {
          config_id: s.configId,
          response_type: "code",
          override_default_response_type: true,
          extras: { setup: {}, sessionInfoVersion: "3" },
        }
      );
    } catch (e) {
      pending.current = {};
      setBusy(false);
      toast.error(e instanceof Error ? e.message : "Couldn't open Facebook.");
    }
  };

  const label = busy
    ? "Waiting for Facebook..."
    : sdkError
      ? "Retry Facebook"
      : sdk
        ? "Connect WhatsApp"
        : "Loading Facebook...";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
      <div className="min-w-0 space-y-1">
        <h3 className="text-sm font-medium text-foreground">
          Connect with Facebook
        </h3>
        <p className="text-xs text-muted-foreground">
          Create or pick your WhatsApp Business account and number in
          Facebook&apos;s window. No tokens to copy; replies and delivery
          reports are set up for you. Meta bills your account for messages.
        </p>
        {sdkError ? (
          <p className="text-xs text-destructive">{sdkError}</p>
        ) : null}
      </div>
      <Button size="sm" disabled={busy || (!sdk && !sdkError)} onClick={start}>
        {label}
      </Button>
    </div>
  );
}
