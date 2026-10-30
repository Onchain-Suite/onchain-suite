"use client";

import {
  ArrowTopRightOnSquareIcon,
  AtSymbolIcon,
  ChatBubbleLeftRightIcon,
  ChatBubbleOvalLeftIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  MegaphoneIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

import { cn } from "@/lib/utils";

import type { CampaignChannel } from "../../validations";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

interface ChannelOption {
  key: CampaignChannel;
  title: string;
  sub: string;
  icon: IconType;
  /** Gated on a verified connection (email + in-app push are never gated). */
  gated: boolean;
  /** Posts once to the connected account; the audience below doesn't limit it. */
  broadcast: boolean;
}

/**
 * The channels a campaign can go out on, in reach order. X / Discord / Farcaster
 * are broadcast posts in this product (not per-recipient DMs), so their reach
 * isn't the selected audience - the notice below says so rather than implying a
 * per-follower send.
 */
const CHANNELS: ChannelOption[] = [
  {
    key: "email",
    title: "Email",
    sub: "Contacts with an email",
    icon: EnvelopeIcon,
    gated: false,
    broadcast: false,
  },
  {
    key: "in-app-push",
    title: "In-app push",
    sub: "Connected wallets",
    icon: DevicePhoneMobileIcon,
    gated: false,
    broadcast: false,
  },
  {
    key: "telegram",
    title: "Telegram",
    sub: "Opted-in via your bot",
    icon: PaperAirplaneIcon,
    gated: true,
    broadcast: false,
  },
  {
    key: "discord",
    title: "Discord",
    sub: "Broadcast to a channel",
    icon: ChatBubbleOvalLeftIcon,
    gated: true,
    broadcast: true,
  },
  {
    key: "whatsapp",
    title: "WhatsApp",
    sub: "Approved template",
    icon: ChatBubbleLeftRightIcon,
    gated: true,
    broadcast: false,
  },
  {
    key: "x",
    title: "X",
    sub: "A broadcast post",
    icon: AtSymbolIcon,
    gated: true,
    broadcast: true,
  },
  {
    key: "farcaster",
    title: "Farcaster",
    sub: "A public cast",
    icon: MegaphoneIcon,
    gated: true,
    broadcast: true,
  },
];

/** Deep-link to the channel's setup in Settings -> Integrations. */
const setupHref = (channel: CampaignChannel) =>
  `/integrations?tab=channels&channel=${channel}`;

interface SendAsSelectorProps {
  channel: CampaignChannel;
  onChange: (next: CampaignChannel) => void;
  /** Verified-connection check from `useChannelConnections`. */
  isConnected: (channel: CampaignChannel) => boolean;
  /** While connections load, pills stay enabled (optimistic) and no gate shows. */
  loading?: boolean;
}

/**
 * The 2.7 "Send as" row: an inline channel picker at the top of the audience
 * step. A gated channel with no verified connection is dimmed and un-selectable,
 * and the selected channel gets a one-line notice - a setup prompt when it isn't
 * connected, a broadcast caveat when the audience below won't scope it, or the
 * plain delivery line otherwise.
 */
export function SendAsSelector({
  channel,
  onChange,
  isConnected,
  loading = false,
}: SendAsSelectorProps) {
  const selected = CHANNELS.find((c) => c.key === channel) ?? CHANNELS[0];
  const selectedConnected = isConnected(channel);
  const needsSetup = selected.gated && !loading && !selectedConnected;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Send as</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {CHANNELS.map((opt) => {
          const Icon = opt.icon;
          const active = channel === opt.key;
          const connected = loading || !opt.gated || isConnected(opt.key);
          const disabled = !connected;
          return (
            <button
              key={opt.key}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onChange(opt.key)}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                active
                  ? "border-primary bg-primary/[0.06]"
                  : "border-border bg-card hover:border-primary/40",
                disabled && "cursor-not-allowed opacity-50 hover:border-border"
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                  active
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  {opt.title}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {disabled ? "Connect in Settings" : opt.sub}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {needsSetup ? (
        <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
          <ExclamationTriangleIcon
            aria-hidden="true"
            className="h-5 w-5 shrink-0"
          />
          <p>
            Connect {selected.title} first.{" "}
            <Link
              href={setupHref(selected.key)}
              className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
            >
              Set it up in Integrations
              <ArrowTopRightOnSquareIcon
                aria-hidden="true"
                className="h-3.5 w-3.5"
              />
            </Link>{" "}
            before you send.
          </p>
        </div>
      ) : selected.broadcast ? (
        <p className="text-xs text-muted-foreground">
          {selected.title} posts once to your connected account. The audience
          below sets who you track, but a public post reaches everyone who sees
          it - not just the wallets you pick.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {channel === "telegram"
            ? "Delivered on Telegram to wallets that opted in via your bot."
            : channel === "whatsapp"
              ? "Delivered to linked WhatsApp numbers using your approved template."
              : channel === "in-app-push"
                ? "Delivered in-app to connected wallets."
                : "Delivered by email - contacts need an email address."}
        </p>
      )}
    </div>
  );
}
