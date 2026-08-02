"use client";

import { KeyIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CopyButton } from "@/components/common/copy-button";

import { getSelectedOrganizationId } from "@/lib/utils";

import { fadeInUp } from "../../utils";
import { SettingsCard, SettingsStepper } from "../settings-card";
import { DeveloperApiCard } from "./developer-api";
import InAppIntegration from "./inapp";
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
const MOBILE_STEPS = ["Add your app", "Credentials & SDK", "Connected"];

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

export default function IntegrationsSettings() {
  const [manageKeysOpen, setManageKeysOpen] = useState(false);

  // Web in-app push — generate a copy-paste install snippet from the dApp
  // origin. Origin allow-listing + key management stay in the full panel behind
  // "Manage keys" (real API); this card is the first-mile install surface.
  const [dappOrigin, setDappOrigin] = useState("");
  const [snippet, setSnippet] = useState<string | null>(null);

  // Mobile in-app push — no backend yet; capture the bundle id and flag it as
  // coming soon rather than pretending to register.
  const [bundleId, setBundleId] = useState("");

  const orgId = useMemo(() => getSelectedOrganizationId() ?? "your-org-id", []);

  const generateSnippet = () => {
    const origin = normalizeOrigin(dappOrigin);
    if (!origin) {
      toast.error("Enter the domain your dApp runs on, e.g. app.vault77.com");
      return;
    }
    setSnippet(
      [
        `<script`,
        `  src="https://cdn.onchainsuite.com/inapp.js"`,
        `  data-org="${orgId}"`,
        `  data-origin="${origin}"`,
        `  async`,
        `></script>`,
      ].join("\n")
    );
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
        description="Install the SDK in your dApp — push can't send until it reports a connected wallet"
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
        <SettingsStepper steps={WEB_STEPS} current={0} />
        <div className="mt-6 max-w-xl space-y-2">
          <Label htmlFor="dapp-origin">dApp origin</Label>
          <Input
            id="dapp-origin"
            value={dappOrigin}
            onChange={(e) => {
              setDappOrigin(e.target.value);
              setSnippet(null);
            }}
            placeholder="app.vault77.com"
          />
          <p className="text-xs text-muted-foreground">
            The domain your dApp runs on. The SDK is rejected anywhere else, so
            a stolen key can&apos;t render messages on another site.
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
          </div>
        ) : null}
        <div className="mt-4">
          <Button onClick={generateSnippet}>Generate install snippet</Button>
        </div>
      </SettingsCard>

      <SettingsCard
        title="In-app push · Mobile"
        description="A separate SDK and store credentials — the OS delivers these, so it sets the rules"
      >
        <SettingsStepper steps={MOBILE_STEPS} current={0} />
        <div className="mt-6 max-w-xl space-y-2">
          <Label htmlFor="bundle-id">Bundle identifier</Label>
          <Input
            id="bundle-id"
            value={bundleId}
            onChange={(e) => setBundleId(e.target.value)}
            placeholder="com.vault77.app"
          />
          <p className="text-xs text-muted-foreground">
            Must match the app you ship to the App Store and Play Store — the OS
            rejects a token signed for anything else.
          </p>
        </div>
        <div className="mt-4">
          <Button
            variant="secondary"
            onClick={() =>
              toast.info("Mobile in-app push is coming soon to your workspace.")
            }
          >
            Register app
          </Button>
        </div>
      </SettingsCard>

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
