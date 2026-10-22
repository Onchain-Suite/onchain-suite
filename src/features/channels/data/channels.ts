import type { ChannelId, ChannelKind } from "../types/channel";

/**
 * The channel catalog: label, sending model, who each reaches, and the one setup
 * step. Static data, React-free (the tab maps each id to a Heroicon). Email and
 * push are set up in their own cards; the social channels connect your own
 * account through `/organization/connections`.
 */
export interface ChannelMeta {
  label: string;
  kind: ChannelKind;
  /** Who it reaches, in one line, shown when nothing is blocking. */
  reaches: string;
  /** The one thing to do to turn it on. */
  setup: string;
}

export const CHANNEL_META: Record<ChannelId, ChannelMeta> = {
  email: {
    label: "Email",
    kind: "email",
    reaches: "Anyone with an email address",
    setup:
      "Verify a sending domain so mail leaves as you rather than as us. Until it resolves, email cannot send.",
  },
  push: {
    label: "In-app push",
    kind: "inapp",
    reaches: "Wallets connected to your dApp or app",
    setup:
      "Install the SDK. Push cannot send until it has reported a connected wallet or a registered device.",
  },
  x: {
    label: "X",
    kind: "post",
    reaches: "Followers who have linked a wallet",
    setup:
      "Paste an OAuth 2.0 user token with DM access from your X app. X only allows DMs to accounts that follow you, so reach grows with linked followers.",
  },
  whatsapp: {
    label: "WhatsApp",
    kind: "dm",
    reaches: "Contacts who gave a phone number and opted in",
    setup:
      "Connect a WhatsApp Business account and get message templates approved. WhatsApp is a per-recipient DM with its own opt-in and template rules.",
  },
  telegram: {
    label: "Telegram",
    kind: "post",
    reaches: "People who started your bot, or a channel's subscribers",
    setup:
      "Connect a bot token. Telegram cannot cold-DM, so a person must start your bot first, or you post to a channel.",
  },
  discord: {
    label: "Discord",
    kind: "post",
    reaches: "Members of your server",
    setup:
      "Connect a bot or a channel webhook and post to a channel, optionally targeting a role. Discord does not allow reliable cold DMs.",
  },
  farcaster: {
    label: "Farcaster",
    kind: "post",
    reaches: "Your followers and casts' audiences",
    setup:
      "Connect a Farcaster account to publish casts. A broadcast channel, not a per-recipient DM.",
  },
};

/** Display order in the Channels tab: the live channels first, then social. */
export const CHANNEL_ORDER: ChannelId[] = [
  "email",
  "push",
  "x",
  "whatsapp",
  "telegram",
  "discord",
  "farcaster",
];
