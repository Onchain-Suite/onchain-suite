import { isJsonObject } from "@/lib/utils";

/**
 * How a step reads on its card: what kind of step it is, and one line of what
 * it does with the settings it has ("Wait · 2 days", "Send email · Welcome").
 * Pure, so the canvas card and the settings panel title say the same thing.
 */

/** Human name for a step, keyed by its renderer or canonical type. */
const STEP_KIND_LABELS: Record<string, string> = {
  trigger: "Trigger",
  email: "Send an email",
  send_email: "Send an email",
  inapp: "Send in-app push",
  send_inapp: "Send in-app push",
  telegram: "Send Telegram",
  send_telegram: "Send Telegram",
  wait: "Wait",
  branch: "If / else",
  tag: "Add tag",
  add_tag: "Add tag",
  remove_tag: "Remove tag",
  list: "Add to list",
  add_to_list: "Add to list",
  remove_from_list: "Remove from list",
  webhook: "Webhook",
  dispatch: "Dispatch campaign",
  dispatch_campaign: "Dispatch campaign",
};

export const stepKindLabel = (type?: string): string => {
  if (!type) return "Step";
  return (
    STEP_KIND_LABELS[type] ??
    type.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
};

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

const PLACEHOLDERS = new Set(["Select Contract", "Select Event"]);
const real = (v: unknown) => {
  const t = text(v);
  return PLACEHOLDERS.has(t) ? "" : t;
};

const host = (url: string) => {
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
};

/** The step's own type: what the backend calls it, else its card type. */
export const stepType = (type: string | undefined, data: unknown): string => {
  const d = isJsonObject(data) ? data : {};
  return (
    text(d.actionType) ||
    text(d.nodeType) ||
    text(d.triggerType) ||
    (type ?? "")
  );
};

/**
 * One line of what a step does, or "" when it has nothing set yet (the card
 * then shows what is missing instead).
 */
export function stepSummary(type: string | undefined, data: unknown): string {
  const d = isJsonObject(data) ? data : {};
  const kind = stepType(type, d);
  switch (kind) {
    case "send_email":
    case "email":
      return text(d.subject) || text(d.templateName) || text(d.template);
    case "send_inapp":
    case "inapp":
      return text(d.title) || text(d.body);
    case "send_telegram":
    case "telegram":
      return text(d.text) || text(d.body);
    case "wait": {
      if (d.mode === "until_event" && text(d.waitFor)) {
        return `Until ${text(d.waitFor).replace(/_/g, " ")}`;
      }
      if (text(d.duration)) return text(d.duration);
      const s = typeof d.seconds === "number" ? d.seconds : 0;
      if (s <= 0) return "";
      if (s % 86400 === 0) return `${s / 86400} day${s === 86400 ? "" : "s"}`;
      if (s % 3600 === 0) return `${s / 3600} hour${s === 3600 ? "" : "s"}`;
      if (s % 60 === 0) return `${s / 60} minute${s === 60 ? "" : "s"}`;
      return `${s} seconds`;
    }
    case "add_tag":
    case "remove_tag":
    case "tag": {
      const tags = Array.isArray(d.tags)
        ? d.tags.map(text).filter(Boolean)
        : [];
      const all = tags.length ? tags : [text(d.tag)].filter(Boolean);
      return all.join(", ");
    }
    case "add_to_list":
    case "remove_from_list":
    case "list":
      return text(d.listName) || text(d.listId);
    case "webhook":
      return text(d.url)
        ? `${text(d.method) || "POST"} ${host(text(d.url))}`
        : "";
    case "dispatch_campaign":
    case "dispatch":
      return (
        text(d.campaignName) || (text(d.campaignId) ? "Campaign selected" : "")
      );
    case "branch": {
      const rules = Array.isArray(d.branches)
        ? d.branches
        : Array.isArray(d.rules)
          ? d.rules
          : [];
      const first = rules.find(isJsonObject);
      if (!first) return text(d.condition);
      const field = text(first.field);
      if (!field) return "";
      const more = rules.length > 1 ? ` (+${rules.length - 1})` : "";
      return (
        `${field} ${text(first.operator) || "="} ${text(first.value)}`.trim() +
        more
      );
    }
    default:
      // Triggers: the contract and event they watch, else their preview line.
      return (
        [
          real(d.contract) || real(d.contractAddress),
          real(d.event),
          real(d.chain),
        ]
          .filter(Boolean)
          .join(" · ") || text(d.preview)
      );
  }
}
