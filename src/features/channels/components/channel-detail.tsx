"use client";

import { Alert02Icon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";

import { CHANNEL_META } from "../data/channels";
import type { ChannelReadiness } from "../types/channel";
import type { ReadinessInputs } from "../utils/readiness";
import { emailFlow, socialFlow } from "../utils/setup-flow";
import { CHANNEL_ICON } from "./channel-icons";
import { ChannelStatusBadge } from "./channel-status-badge";
import { SenderDomains } from "./email/sender-domains";
import { PushSetup } from "./push/push-setup";
import { HandoffInline } from "./setup/handoff-inline";
import { StepFlow } from "./setup/step-flow";
import { ChannelConnect } from "./social/channel-connect";
import { Icon } from "@/shared/components/common/hugeicon";

/**
 * One channel's setup, start to live. Every channel opens the same way: what
 * it is and whether it can send, a way to hand it to someone else, what is
 * blocking it, then a three-node progress line and the steps themselves. Only
 * the steps differ: DNS records for email, an SDK for push, a credential the
 * platform accepts for the social channels.
 */
export function ChannelDetail({
  channel,
  inputs,
  onBack,
}: {
  channel: ChannelReadiness;
  inputs: ReadinessInputs;
  onBack: () => void;
}) {
  const meta = CHANNEL_META[channel.id];
  const connected = channel.status === "connected";
  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Icon icon={ArrowLeft01Icon} className="size-4" />
        Channels
      </button>

      <header className="flex flex-wrap items-start gap-4 border-b border-border pb-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
          <Icon icon={CHANNEL_ICON[channel.id]} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {channel.label}
          </h2>
          {/* The setup line says what is missing, so it goes once nothing is. */}
          <p className="max-w-2xl text-sm text-muted-foreground">
            {connected ? meta.reaches : meta.setup}
          </p>
          {connected ? null : <HandoffInline channel={channel.id} />}
        </div>
        <ChannelStatusBadge status={channel.status} />
      </header>

      {/* Email's panel counts its own records, so a banner would say it twice. */}
      {channel.blocker && channel.id !== "email" ? (
        <p className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5 text-sm text-foreground">
          <Icon
            icon={Alert02Icon}
            className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
          />
          {channel.blocker}
        </p>
      ) : null}

      {channel.id === "email" ? (
        <div className="space-y-5">
          <StepFlow
            steps={emailFlow(inputs.domainStatuses)}
            label="Email setup"
          />
          <SenderDomains />
        </div>
      ) : channel.id === "push" ? (
        <PushSetup inputs={inputs} />
      ) : (
        <div className="space-y-5">
          <StepFlow
            steps={socialFlow(channel.id, inputs.social?.[channel.id])}
            label={`${channel.label} setup`}
          />
          <ChannelConnect channel={channel.id} connected={connected} />
        </div>
      )}
    </div>
  );
}
