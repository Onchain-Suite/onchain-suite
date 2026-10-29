import {
  AtSymbolIcon,
  ChatBubbleLeftRightIcon,
  ChatBubbleOvalLeftIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  MegaphoneIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";

/** Canonical campaign channel keys (as stored in `channelsUsed`). */
export type ChannelKey =
  "email" | "inapp" | "telegram" | "discord" | "whatsapp" | "x" | "farcaster";

/** Normalise a raw `channelsUsed` entry to a canonical key, or null if unknown. */
export function normalizeChannelKey(channel: string): ChannelKey | null {
  const v = channel.toLowerCase();
  if (v === "email") return "email";
  if (v === "inapp" || v === "in-app-push" || v === "push") return "inapp";
  if (v === "telegram") return "telegram";
  if (v === "discord") return "discord";
  if (v === "whatsapp") return "whatsapp";
  if (v === "x") return "x";
  if (v === "farcaster") return "farcaster";
  return null;
}

/** Display label + glyph per channel, for list rows and detail indicators. */
export const CHANNEL_DISPLAY: Record<
  ChannelKey,
  { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }
> = {
  email: { label: "Email", Icon: EnvelopeIcon },
  inapp: { label: "In-app push", Icon: DevicePhoneMobileIcon },
  telegram: { label: "Telegram", Icon: PaperAirplaneIcon },
  discord: { label: "Discord", Icon: ChatBubbleOvalLeftIcon },
  whatsapp: { label: "WhatsApp", Icon: ChatBubbleLeftRightIcon },
  x: { label: "X", Icon: AtSymbolIcon },
  farcaster: { label: "Farcaster", Icon: MegaphoneIcon },
};

const ORDER: ChannelKey[] = [
  "email",
  "inapp",
  "telegram",
  "discord",
  "whatsapp",
  "x",
  "farcaster",
];

/**
 * The canonical channel keys a campaign uses, de-duped and in a stable order.
 * Defaults to email when the API sends none.
 */
export function channelKeysFor(channelsUsed?: string[] | null): ChannelKey[] {
  const used =
    channelsUsed && channelsUsed.length > 0 ? channelsUsed : ["email"];
  const present = new Set<ChannelKey>();
  for (const c of used) {
    const k = normalizeChannelKey(c);
    if (k) present.add(k);
  }
  if (present.size === 0) present.add("email");
  return ORDER.filter((k) => present.has(k));
}
