/**
 * Cross-tab signal that an email design was just saved in the editor tab, so a
 * Send Email node in an automation builder open in another tab can reflect it
 * instantly instead of waiting for the tab to regain focus.
 *
 * The editor (campaigns) publishes; the automation builder subscribes. Both
 * tabs are same-origin, so a `BroadcastChannel` is the lightest reliable pipe.
 * Everything degrades to a no-op where `BroadcastChannel` is unavailable (older
 * browsers, SSR), and the builder keeps its focus/visibility poll as the
 * fallback, so a missed broadcast never means a missed sync.
 */

const CHANNEL_NAME = "onchain:email-design";
const MESSAGE_TYPE = "email-design-saved";

/** A saved-email signal. Carries a `campaignId` (campaign editor) OR a
 *  `designId` + `nodeId` (a Send Email node's standalone design); at least one
 *  id is required. The rest ride along when the editor has them so the node can
 *  update before any re-read lands. */
export interface EmailDesignSavedMessage {
  type: typeof MESSAGE_TYPE;
  campaignId?: string;
  designId?: string;
  nodeId?: string;
  templateId?: string;
  subject?: string;
  previewText?: string;
  /** The rendered email HTML - stored as the node's inline `body` so it sends. */
  html?: string;
}

const str = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;

/**
 * Validate a raw `BroadcastChannel` payload into a typed message, or null. Pure
 * so the guard is unit-tested without a live channel.
 */
export function parseEmailDesignMessage(
  data: unknown
): EmailDesignSavedMessage | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  if (record.type !== MESSAGE_TYPE) return null;
  const campaignId = str(record.campaignId);
  const designId = str(record.designId);
  // At least one resource id, or the message cannot be routed to a node.
  if (!campaignId && !designId) return null;
  return {
    type: MESSAGE_TYPE,
    campaignId,
    designId,
    nodeId: str(record.nodeId),
    templateId: str(record.templateId),
    subject: str(record.subject),
    previewText: str(record.previewText),
    html: typeof record.html === "string" ? record.html : undefined,
  };
}

const canBroadcast = (): boolean =>
  typeof window !== "undefined" && typeof BroadcastChannel !== "undefined";

/** Announce that a campaign's email design was saved. Best-effort, never throws. */
export function publishEmailDesignSaved(
  message: Omit<EmailDesignSavedMessage, "type">
): void {
  if (!canBroadcast() || (!str(message.campaignId) && !str(message.designId)))
    return;
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({ type: MESSAGE_TYPE, ...message });
    // Close on the next tick so the message is flushed before teardown.
    setTimeout(() => {
      try {
        channel.close();
      } catch {
        // already closed
      }
    }, 0);
  } catch {
    // No channel available: the subscriber's focus/visibility poll still syncs.
  }
}

/**
 * Subscribe to saved-email signals. Returns an unsubscribe function; safe to
 * call in a browser-only effect. A no-op (returns a no-op cleanup) on SSR or
 * where `BroadcastChannel` is unavailable.
 */
export function subscribeEmailDesignSaved(
  handler: (message: EmailDesignSavedMessage) => void
): () => void {
  if (!canBroadcast()) return () => {};
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent) => {
      const parsed = parseEmailDesignMessage(event.data);
      if (parsed) handler(parsed);
    };
  } catch {
    channel = null;
  }
  return () => {
    try {
      channel?.close();
    } catch {
      // already closed
    }
  };
}
