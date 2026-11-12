"use client";

import { SETUP_GUIDES } from "../../data/setup-guides";
import type { ReadinessInputs } from "../../utils/readiness";
import { mobilePushFlow, webPushFlow } from "../../utils/setup-flow";
import { StepFlow } from "../setup/step-flow";
import InAppIntegration from "@/features/settings/components/integrations/inapp";
import { PushCredentialsCard } from "@/features/settings/components/integrations/push-credentials";

const PART =
  "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

/**
 * In-app push is one channel with two installs, because both reach the same
 * people by the same mechanism. Web needs the SDK on your dApp and a wallet it
 * has seen; mobile needs a store credential, because there the OS delivers.
 * Either one being live is enough for the channel to send.
 */
export function PushSetup({ inputs }: { inputs: ReadinessInputs }) {
  const web = webPushFlow(inputs.webPush);
  const webLive = web.every((s) => s.done);
  return (
    <div className="space-y-8">
      <section aria-labelledby="push-web" className="space-y-3">
        <h3 id="push-web" className={PART}>
          Web
        </h3>
        <StepFlow steps={web} label="Web push setup" />
        {webLive ? null : (
          <>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Add the snippet to your dApp and identify the wallet when one
              connects. In-app push stays blocked until we see both: a campaign
              sent to wallets no SDK asks about is delivered to nobody.
            </p>
            <ol className="max-w-2xl list-decimal space-y-1 pl-5 text-sm leading-6 text-muted-foreground marker:text-foreground">
              {SETUP_GUIDES.push.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </>
        )}
        <InAppIntegration />
      </section>

      <section
        aria-labelledby="push-mobile"
        className="space-y-3 border-t border-border pt-6"
      >
        <h3 id="push-mobile" className={PART}>
          Mobile
        </h3>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          A separate SDK and store credentials. The OS delivers these, so it
          sets the rules. One credential is enough to ship that platform.
        </p>
        <StepFlow
          steps={mobilePushFlow(inputs.mobilePush)}
          label="Mobile push setup"
        />
        <PushCredentialsCard />
      </section>
    </div>
  );
}
