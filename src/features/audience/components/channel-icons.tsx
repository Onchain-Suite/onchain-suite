import {
  AtSymbolIcon,
  ChatBubbleLeftRightIcon,
  HashtagIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";

import { cn } from "@/lib/utils";

import type { SocialHandles } from "../utils";

/**
 * Compact channel glyphs for an audience row: one small icon per social handle
 * the contact actually has (X, Telegram, Discord, Farcaster), with the handle
 * in the tooltip. Reuses the generic Heroicons the contact slide-over already
 * uses for these channels, so there is no brand-glyph dependency and the table
 * and the detail sheet read the same. Renders nothing when the contact has no
 * handles, so an email-only row stays clean.
 */
const CHANNELS: Array<{
  key: "twitter" | "telegram" | "discord" | "farcaster";
  label: string;
  Icon: typeof AtSymbolIcon;
}> = [
  { key: "twitter", label: "X", Icon: AtSymbolIcon },
  { key: "telegram", label: "Telegram", Icon: PaperAirplaneIcon },
  { key: "discord", label: "Discord", Icon: ChatBubbleLeftRightIcon },
  { key: "farcaster", label: "Farcaster", Icon: HashtagIcon },
];

export function ChannelIcons({
  socials,
  className,
}: {
  socials: SocialHandles;
  className?: string;
}) {
  const present = CHANNELS.filter((c) => Boolean(socials[c.key]));
  if (present.length === 0) return null;

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {present.map(({ key, label, Icon }) => {
        const handle = socials[key] as string;
        return (
          <span
            key={key}
            title={`${label}: ${handle}`}
            className="flex size-5 items-center justify-center rounded-md bg-muted/60 text-muted-foreground"
          >
            <Icon className="size-3" aria-hidden="true" />
            <span className="sr-only">{`${label}: ${handle}`}</span>
          </span>
        );
      })}
    </span>
  );
}
