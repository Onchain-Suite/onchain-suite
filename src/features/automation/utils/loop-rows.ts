import { isJsonObject } from "@/lib/utils";

/* Loops list rows from the list/search endpoints, kept pure so the mapping
 * and the formatting are tested without rendering the page. */

export type LoopStatus = "active" | "paused" | "draft";

export interface LoopRow {
  id: string;
  name: string;
  triggerLabel: string;
  status: LoopStatus;
  entries: number;
  /** Double-opt-in confirmation emails sent for this flow's form(s). */
  optInEmailsSent: number;
  /** Enrolments that reached the end of the flow. */
  completionRate: number;
  conversions: number;
  lastTriggered: string;
}

const asString = (v: unknown) => (typeof v === "string" ? v : "");
const asNumber = (v: unknown) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

export const pickLoops = (res: unknown): unknown[] => {
  if (Array.isArray(res)) return res;
  if (isJsonObject(res)) {
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res.data)) return res.data;
  }
  return [];
};

/** Read the backend's total-item count from a paginated response's `meta`.
 *  Undefined when the endpoint returns a bare array / omits meta - the UI then
 *  falls back to page-relative controls. */
export const readTotal = (res: unknown): number | undefined => {
  if (isJsonObject(res) && isJsonObject(res.meta)) {
    const m = res.meta as Record<string, unknown>;
    const t = m.totalItems ?? m.total;
    if (typeof t === "number" && Number.isFinite(t)) return t;
  }
  return undefined;
};

export const humanizeTrigger = (type: string) => {
  if (!type || type === "onchain") return "On-chain event";
  return type.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());
};

export const toLoopRow = (input: unknown): LoopRow | null => {
  if (!isJsonObject(input)) return null;
  const id =
    asString(input.id) ||
    asString(input.automationId) ||
    asString(input.automation_id);
  if (!id) return null;
  const trigger = isJsonObject(input.trigger) ? input.trigger : {};
  const type =
    asString(trigger.type) || asString(input.triggerType) || "onchain";
  const event = asString(trigger.event) || asString(input.triggerEvent);
  let triggerLabel = humanizeTrigger(type);
  if (event && event !== "-" && event.toLowerCase() !== "any event") {
    triggerLabel += ` · ${event}`;
  }
  const rawStatus = asString(input.status);
  const status: LoopStatus =
    rawStatus === "active"
      ? "active"
      : rawStatus === "paused"
        ? "paused"
        : "draft";
  return {
    id,
    name: asString(input.name) || "Untitled Loop",
    triggerLabel,
    status,
    entries: asNumber(input.entries ?? input.entryCount),
    optInEmailsSent: asNumber(input.optInEmailsSent),
    completionRate: asNumber(input.completionRate),
    conversions: asNumber(input.conversions ?? input.conversionCount),
    lastTriggered: asString(
      input.lastTriggered ?? input.last_triggered ?? input.updatedAt
    ),
  };
};

/** Format an ISO/relative timestamp into a compact "12 min ago" label. */
export const relativeTime = (value: string): string => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const diffMs = Date.now() - parsed.getTime();
  if (diffMs < 0) return "just now";
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return parsed.toLocaleDateString();
};

/** "Live" is what the product calls an active Loop. */
export const LOOP_STATUS_LABEL: Record<LoopStatus, string> = {
  active: "Live",
  paused: "Paused",
  draft: "Draft",
};

/**
 * The Loops page's one sentence (2.7), from the org-wide metrics: what is
 * live, how many people went in and reached the goal, and what is stopped.
 */
export function loopsAnswer(input: {
  live: number;
  entries: number;
  conversions: number;
  paused: number;
}): { lead: string; detail: string; conversions: string; stopped: string } {
  const { live, entries, conversions, paused } = input;
  return {
    lead: `${live} ${live === 1 ? "Loop is" : "Loops are"} live`,
    detail: `${entries.toLocaleString("en-US")} ${entries === 1 ? "person" : "people"} entered one in the last 30 days, and`,
    conversions: conversions.toLocaleString("en-US"),
    stopped:
      paused > 0
        ? `${paused} ${paused === 1 ? "is" : "are"} paused, so nobody new hears from ${paused === 1 ? "it" : "them"}.`
        : "",
  };
}
