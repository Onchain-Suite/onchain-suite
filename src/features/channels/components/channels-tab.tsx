"use client";

import {
  ArrowLeftIcon,
  ChatBubbleBottomCenterTextIcon,
  ChevronRightIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  HashtagIcon,
  InformationCircleIcon,
  MegaphoneIcon,
  PaperAirplaneIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { CHANNEL_META } from "../data/channels";
import { useChannelReadiness } from "../hooks/use-channel-readiness";
import type {
  ChannelId,
  ChannelReadiness,
  ChannelReadinessStatus,
} from "../types/channel";
import { SocialConnect } from "./social-connect";
import { XConnect } from "./x-connect";
import { SenderVerificationCard } from "@/features/settings/components/account/sender-verification-card";
import InAppIntegration from "@/features/settings/components/integrations/inapp";
import { PushCredentialsCard } from "@/features/settings/components/integrations/push-credentials";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * Integrations -> Channels: where messages go out. The state of every channel
 * first, one row each, with what is blocking it in plain words; open a row for
 * its setup. Email and push reuse the real settings cards, X has its own panel,
 * and the remaining social channels show a connect panel backed by a pending
 * backend. Channel copy lives in the catalog (../data/channels).
 */
const CHANNEL_ICON: Record<ChannelId, IconType> = {
  email: EnvelopeIcon,
  push: DevicePhoneMobileIcon,
  x: HashtagIcon,
  whatsapp: ChatBubbleBottomCenterTextIcon,
  telegram: PaperAirplaneIcon,
  discord: UserGroupIcon,
  farcaster: MegaphoneIcon,
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
            const Icon = CHANNEL_ICON[c.id];
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
  const Icon = CHANNEL_ICON[channel.id];
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

      {channel.id === "email" ? (
        <SenderVerificationCard />
      ) : channel.id === "push" ? (
        <div className="space-y-6">
          <InAppIntegration />
          <PushCredentialsCard />
        </div>
      ) : channel.id === "x" ? (
        <XConnect />
      ) : (
        <SocialConnect channel={channel.id} />
      )}
    </div>
  );
}
