/**
 * Channel domain types (v2.7). The sending channels, and whether each can send
 * right now.
 *
 * Email and in-app push are built end to end. The social channels differ in
 * shape (see `kind`): WhatsApp is a per-recipient DM (phone + opt-in +
 * templates), while X, Telegram, Discord and Farcaster are broadcast/"post"
 * channels. Each connects the customer's own account via
 * `/organization/connections/:connector` (staging, 2026-10-22).
 */

export type ChannelId =
  "email" | "push" | "x" | "whatsapp" | "telegram" | "discord" | "farcaster";

/** How a channel reaches people, which drives its analytics and compliance. */
export type ChannelKind = "email" | "inapp" | "dm" | "post";

/** The social channels (everything except email and push). */
export type SocialChannelId = Exclude<ChannelId, "email" | "push">;

export type ChannelReadinessStatus = "connected" | "pending" | "none";

/**
 * A channel's setup state, flattened to the one question an operator cares
 * about: can I send on this right now, and if not, what is missing?
 */
export interface ChannelReadiness {
  id: ChannelId;
  label: string;
  status: ChannelReadinessStatus;
  /** What is blocking, in the operator's words. Null when connected. */
  blocker: string | null;
}
