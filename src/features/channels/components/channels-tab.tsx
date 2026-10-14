"use client";

import {
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  ChevronRightIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { useChannelReadiness } from "../hooks/use-channel-readiness";
import type {
  ChannelId,
  ChannelReadiness,
  ChannelReadinessStatus,
} from "../types/channel";
import { XConnect } from "./x-connect";
import { SenderVerificationCard } from "@/features/settings/components/account/sender-verification-card";
import InAppIntegration from "@/features/settings/components/integrations/inapp";
import { PushCredentialsCard } from "@/features/settings/components/integrations/push-credentials";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * Integrations -> Channels: where messages go out. Reads like the Sources
 * directory next door - the state of every channel first, one row each, with
 * what is blocking it in plain words; open a row for its setup. Web and mobile
 * push are one channel with two installs. Detail panels reuse the real settings
 * cards. The "send setup to someone" handoff and the X panel are later steps.
 */
const CHANNEL_META: Record<
  ChannelId,
  { icon: IconType; reaches: string; setup: string }
> = {
  email: {
    icon: EnvelopeIcon,
    reaches: "Anyone with an email address",
    setup:
      "Verify a sending domain so mail leaves as you rather than as us. Until it resolves, email cannot send.",
  },
  push: {
    icon: DevicePhoneMobileIcon,
    reaches: "Wallets connected to your dApp or app",
    setup:
      "Install the SDK. Push cannot send until it has reported a connected wallet or a registered device.",
  },
  x: {
    icon: ChatBubbleLeftRightIcon,
    reaches: "Followers who have linked a wallet",
    setup:
      "Authorise DM access. X only allows DMs to accounts that follow you, so reach grows with linked followers.",
  },
};

function StatusBadge({ status }: { status: ChannelReadinessStatus }) {
  if (status === "connected") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
      >
        Connected
      </Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/40 text-amber-600 dark:text-amber-400"
      >
        Waiting
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Not set up
    </Badge>
  );
}

export function ChannelsTab() {
  const { readiness, isLoading } = useChannelReadiness();
  const [open, setOpen] = useState<ChannelId | null>(null);

  const current = readiness.find((c) => c.id === open);
  if (current) {
    return <ChannelDetail channel={current} onBack={() => setOpen(null)} />;
  }

  const live = readiness.filter((c) => c.status === "connected").length;

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Channels</h2>
        <p className="text-xs text-muted-foreground">
          {isLoading
            ? "Checking which channels can send…"
            : `${live} of ${readiness.length} can send.`}{" "}
          Open a channel to set it up.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {readiness.map((c) => {
            const meta = CHANNEL_META[c.id];
            const Icon = meta.icon;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setOpen(c.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">
                      {c.label}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.blocker ?? meta.reaches}
                    </span>
                  </span>
                  <StatusBadge status={c.status} />
                  <span className="hidden shrink-0 items-center gap-0.5 text-xs text-muted-foreground sm:inline-flex">
                    {c.status === "connected" ? "Manage" : "Set up"}
                    <ChevronRightIcon aria-hidden="true" className="size-4" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ChannelDetail({
  channel,
  onBack,
}: {
  channel: ChannelReadiness;
  onBack: () => void;
}) {
  const meta = CHANNEL_META[channel.id];
  const Icon = meta.icon;
  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Channels
      </button>

      <header className="flex flex-wrap items-center gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {channel.label}
          </h2>
          <p className="text-sm text-muted-foreground">{meta.setup}</p>
        </div>
        <StatusBadge status={channel.status} />
      </header>

      {channel.blocker ? (
        <p className="flex items-start gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <InformationCircleIcon
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
          />
          {channel.blocker}
        </p>
      ) : null}

      {channel.id === "email" ? <SenderVerificationCard /> : null}
      {channel.id === "push" ? (
        <div className="space-y-6">
          <InAppIntegration />
          <PushCredentialsCard />
        </div>
      ) : null}
      {channel.id === "x" ? <XConnect /> : null}
    </div>
  );
}
