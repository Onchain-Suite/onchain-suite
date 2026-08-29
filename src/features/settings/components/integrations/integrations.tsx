"use client";

import { KeyIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CopyButton } from "@/components/common/copy-button";

import { getSelectedOrganizationId } from "@/lib/utils";

import { fadeInUp } from "../../utils";
import { SettingsCard, SettingsStepper } from "../settings-card";
import { DeveloperApiCard } from "./developer-api";
import InAppIntegration from "./inapp";
import { PushCredentialsCard } from "./push-credentials";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

const WEB_STEPS = ["Install the SDK", "We listen", "Connected"];

function normalizeOrigin(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  const withProto = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    return new URL(withProto).origin;
  } catch {
    return "";
  }
}

// DX GOAL: the install snippet must be COPY-PASTE-AND-DONE. That means (1) the real
// publishable key is baked in — no "replace with your key" step — and (2) the
// entered origin is allow-listed server-side on generate, so the pasted tag
// actually connects (the SDK is rejected on any origin the org hasn't allowed).
// The SDK reads ONLY `data-key`; `data-org`/`data-origin` were inert, so they're
// gone — one attribute, nothing to fill in.

// Serve the IIFE (`dist/inapp.js`) from OUR OWN CDN (CloudFront + S3 at
// cdn.onchainsuite.com), PINNED to a version. A host we control: our uptime, our
// CSP origin, our cache rules, hotfixable without npm/unpkg propagation. Pin the
// version — this URL is embedded verbatim on customers' sites, so an unpinned URL
// would silently swap the bundle they load on the next release. Bump this in
// lockstep with a stable SDK release (the release workflow publishes the matching
// inapp-<version>.js). unpkg stays a valid fallback if the CDN ever has an issue.
const SDK_VERSION = "0.3.0";
const SDK_INAPP_URL = `https://cdn.onchainsuite.com/inapp-${SDK_VERSION}.js`;

interface InappStatus {
  /** The org's publishable key (prod preferred, else test). */
  publishableKey: string;
  /** Active SDK sessions - >0 means a wallet has connected (the SDK phoned home). */
  sessionCount: number;
}

/** In-app status: the publishable key plus the live connected-session count. */
async function fetchInappStatus(orgId: string): Promise<InappStatus> {
  const empty: InappStatus = { publishableKey: "", sessionCount: 0 };
  try {
    const res = await fetch("/api/v1/integrations/inapp/status", {
      headers: { "x-org-id": orgId },
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok || !json || typeof json !== "object") return empty;
    const root = json as Record<string, unknown>;
    const d = (root.data ?? root) as Record<string, unknown>;
    const pk = (d.publishableKeys ?? d.publishable ?? {}) as Record<
      string,
      unknown
    >;
    const prod = typeof pk.production === "string" ? pk.production : "";
    const test = typeof pk.test === "string" ? pk.test : "";
    const rawCount =
      d.sessionCount ??
      d.activeSessions ??
      (Array.isArray(d.sessions) ? d.sessions.length : undefined);
    return {
      publishableKey: prod || test || "",
      sessionCount: typeof rawCount === "number" ? rawCount : 0,
    };
  } catch {
    return empty;
  }
}

/** Allow-list an origin so the pasted snippet connects. Best-effort (idempotent). */
async function allowlistOrigin(orgId: string, origin: string): Promise<void> {
  try {
    await fetch("/api/v1/integrations/inapp/origins", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-org-id": orgId },
      body: JSON.stringify({ origin, environment: "production" }),
    });
  } catch {
    /* a duplicate/existing origin is fine — don't block the snippet on it */
  }
}

export default function IntegrationsSettings() {
  const [manageKeysOpen, setManageKeysOpen] = useState(false);

  // Web in-app push - generate a copy-paste install snippet from the dApp
  // origin. Origin allow-listing + key management stay in the full panel behind
  // "Manage keys" (real API); this card is the first-mile install surface.
  const [dappOrigin, setDappOrigin] = useState("");
  const [snippet, setSnippet] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const orgId = useMemo(() => getSelectedOrganizationId(), []);

  // Pre-load the publishable key (baked into the snippet) and the live session
  // count. Poll so the "Connected" step ticks the moment the SDK phones home.
  const statusQuery = useQuery({
    queryKey: ["integrations", "inapp", "status", orgId],
    enabled: !!orgId,
    queryFn: () => fetchInappStatus(orgId as string),
    refetchInterval: 15_000,
  });
  const publishableKey = statusQuery.data?.publishableKey ?? "";
  const sessionCount = statusQuery.data?.sessionCount ?? 0;

  // Drive the 3-step rail from real state: a connected wallet (sessionCount > 0)
  // ticks all three; generating the snippet allow-lists the origin + bakes the
  // key, so we're installed + listening (step 3 "Connected" then pending).
  const setupStep = sessionCount > 0 ? 3 : snippet ? 2 : 0;

  const generateSnippet = async () => {
    if (!orgId) {
      toast.error(
        "Select an organization first - the snippet needs a real org id."
      );
      return;
    }
    const origin = normalizeOrigin(dappOrigin);
    if (!origin) {
      toast.error("Enter the domain your dApp runs on, e.g. app.yourdapp.com");
      return;
    }
    if (!publishableKey) {
      toast.error("Create a publishable key first - open Manage keys.");
      setManageKeysOpen(true);
      return;
    }
    setGenerating(true);
    try {
      // Allow-list the origin so the pasted tag connects immediately.
      await allowlistOrigin(orgId, origin);
      setSnippet(
        [
          `<script`,
          `  src="${SDK_INAPP_URL}"`,
          `  data-key="${publishableKey}"`,
          `  async`,
          `></script>`,
        ].join("\n")
      );
      toast.success(`Snippet ready - ${origin} is now an allowed origin.`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <SettingsCard
        title="In-app push · Web"
        description="Install the SDK in your dApp - push can't send until it reports a connected wallet"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setManageKeysOpen(true)}
          >
            <KeyIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
            Manage keys
          </Button>
        }
      >
        <SettingsStepper steps={WEB_STEPS} current={setupStep} />
        <div className="mt-6 max-w-xl space-y-2">
          <Label htmlFor="dapp-origin">dApp origin</Label>
          <Input
            id="dapp-origin"
            value={dappOrigin}
            onChange={(e) => {
              setDappOrigin(e.target.value);
              setSnippet(null);
            }}
            placeholder="app.yourdapp.com"
          />
          <p className="text-xs text-muted-foreground">
            The domain your dApp runs on. Generating the snippet allow-lists it,
            so the SDK is rejected anywhere else - a stolen key can&apos;t
            render messages on another site.
          </p>
        </div>
        {snippet ? (
          <div className="mt-4 max-w-xl">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Install snippet
              </span>
              <CopyButton value={snippet} label="Copy snippet" />
            </div>
            <pre className="overflow-x-auto rounded-xl border border-border/60 bg-muted/40 p-3 text-xs leading-5 text-foreground">
              <code>{snippet}</code>
            </pre>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Paste this once, anywhere on your site - your publishable key is
              already in it. Nothing else to install.
            </p>
          </div>
        ) : null}
        <div className="mt-4">
          <Button onClick={generateSnippet} disabled={!orgId || generating}>
            {generating ? "Generating…" : "Generate install snippet"}
          </Button>
          {orgId && !publishableKey && !statusQuery.isLoading ? (
            <p className="mt-2 text-xs text-amber-500">
              No publishable key yet - open{" "}
              <span className="font-medium">Manage keys</span> to create one,
              then generate.
            </p>
          ) : null}
          {!orgId ? (
            <p className="mt-2 text-xs text-amber-500">
              Select an organization to generate a working install snippet.
            </p>
          ) : null}
        </div>
      </SettingsCard>

      <PushCredentialsCard />

      <DeveloperApiCard />

      <Dialog open={manageKeysOpen} onOpenChange={setManageKeysOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>In-app push keys &amp; origins</DialogTitle>
            <DialogDescription>
              SDK keys, approved origins, and test delivery.
            </DialogDescription>
          </DialogHeader>
          <InAppIntegration />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
