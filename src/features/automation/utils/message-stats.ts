import { isJsonObject } from "@/lib/utils";

import {
  type HumanStats,
  readHumanStats,
} from "@/features/campaigns/utils/human-engagement";

/** The builder node fields the table reads. */
export interface MessageNodeLike {
  id: string;
  type?: string;
  data?: unknown;
}

export interface MessageCounts {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  /** Human-first block; all null on an older backend. */
  human: HumanStats;
}

export interface MessageRow {
  id: string;
  title: string;
  channel: "Email" | "Campaign" | "In-app push";
  counts: MessageCounts | null;
}

const SEND_TYPES = new Set([
  "send_email",
  "email",
  "send_inapp",
  "inapp",
  "dispatch_campaign",
]);

const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const s = (v: unknown) => (typeof v === "string" ? v : "");

/**
 * "Messages in this flow": the flow's send steps in order, each joined to its
 * counts from `GET /automations/:id/stats/messages` by node id. A step with
 * no counts yet carries null, which the table shows as "-".
 */
export function buildMessageRows(
  nodes: MessageNodeLike[],
  payload: unknown
): MessageRow[] {
  const counts = new Map<string, MessageCounts>();
  const raw = isJsonObject(payload) ? payload.messages : undefined;
  if (Array.isArray(raw)) {
    for (const m of raw) {
      if (!isJsonObject(m)) continue;
      const nodeId = s(m.nodeId);
      if (!nodeId) continue;
      counts.set(nodeId, {
        sent: n(m.sent),
        delivered: n(m.delivered),
        opened: n(m.opened),
        clicked: n(m.clicked),
        human: readHumanStats(m),
      });
    }
  }
  return nodes
    .filter(
      (node) => typeof node.type === "string" && SEND_TYPES.has(node.type)
    )
    .map((node) => {
      const data = isJsonObject(node.data) ? node.data : {};
      const channel: MessageRow["channel"] =
        node.type === "send_email" || node.type === "email"
          ? "Email"
          : node.type === "dispatch_campaign"
            ? "Campaign"
            : "In-app push";
      const title =
        s(data.subject) || s(data.title) || s(data.label) || channel;
      return {
        id: node.id,
        title,
        channel,
        counts: counts.get(node.id) ?? null,
      };
    });
}
