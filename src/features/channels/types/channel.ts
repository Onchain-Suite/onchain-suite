/**
 * Channel domain types (v2.7). The sending channels, and whether each can send
 * right now. Email and in-app push are real today; X is modelled but not built
 * until the X connector lands (migration/channels.md step 3). Discord, Telegram,
 * Farcaster and WhatsApp are driven by the backend campaign-types contract, not
 * ported from the reference (which only built email, push and X).
 */

export type ChannelId = "email" | "push" | "x";

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
