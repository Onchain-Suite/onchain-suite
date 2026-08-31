import { isJsonObject } from "@/lib/utils";

/**
 * Backend error code returned by `PUT /automations/{id}/builder` and
 * `POST /automations/{id}/publish` when the graph can't be saved or published.
 * Its `message` is the useless "Automation builder graph is invalid" - the
 * actionable part is the `errors` / `warnings` arrays that ride along with it,
 * which is what this module digs out.
 */
export const AUTOMATION_BUILDER_INVALID = "AUTOMATION_BUILDER_INVALID";

export interface ApiErrorFields {
  code?: string;
  /** `error.details` from the response envelope. */
  details?: unknown;
  /** The whole response body, so issue arrays hung off any level are reachable. */
  body?: unknown;
}

/** An Error carrying the backend's structured error fields. */
export type ApiError = Error & ApiErrorFields;

/** Attach `code`/`details`/`body` to an Error so callers can branch on them. */
export const withApiErrorFields = (
  error: Error,
  fields: ApiErrorFields
): ApiError => Object.assign(error, fields);

export type BuilderIssueSeverity = "error" | "warning";

export interface BuilderIssue {
  /** Stable React key. */
  id: string;
  severity: BuilderIssueSeverity;
  /** Backend code, or a `local.*` code for a client-side pre-flight check. */
  code: string;
  /** The step this issue belongs to; absent for whole-flow issues. */
  nodeId?: string;
  /** What is wrong, in plain language. */
  message: string;
  /** How to fix it. */
  hint?: string;
  source: "local" | "server";
}

/** Minimal node shape the pre-flight checks need - keeps this module free of
 *  ReactFlow types so it stays unit-testable. */
export interface IssueGraphNode {
  id: string;
  /** ReactFlow renderer key or canonical backend type. */
  type?: string;
  label: string;
  isTrigger: boolean;
  /** Canonical trigger type (`onchain_event`, `swap_completed`, …) when this is
   *  a trigger - presets imply their own event, the generic one does not. */
  triggerType?: string;
  /** The node's config blob, inspected against the backend's own rules. */
  data?: unknown;
}

export interface IssueGraphEdge {
  source: string;
  target: string;
}

const asText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const normalize = (value: string) =>
  value.toLowerCase().replace(/[\s-]+/g, "_");

/**
 * "INVALID_EMAIL_CONFIG" → "Invalid email config". Only used when the backend
 * sent a code with no message.
 */
export const humanizeIssueCode = (code: string): string => {
  const words = normalize(code).split("_").filter(Boolean);
  if (words.length === 0) return "";
  const sentence = words.join(" ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
};

/**
 * Fix-it copy per issue code. These are the EXACT codes the backend throws
 * (docs/backend.md, "Automation builder issue codes"): match on the code, never
 * on the message, since messages are prose and get reworded. An unknown code
 * falls through to the token rules below - and then to no hint, never a wrong
 * one.
 */
const ISSUE_HINTS: Record<string, string> = {
  // Node-scoped errors - each carries a nodeId, so the panel can jump to it.
  UNSUPPORTED_NODE_TYPE:
    "This step type is not in the trigger or action catalog. Delete it and add a current one from the left panel.",
  INVALID_EMAIL_CONFIG:
    "Open the step and pick an email template (or write an inline body).",
  INVALID_EMAIL_SUBJECT: "Open the step and write a subject line.",
  INVALID_EMAIL_RECIPIENTS:
    "This step sends to a wallet list but the list is empty. Add wallets, or switch it back to the triggering wallet.",
  INVALID_WAIT_CONFIG:
    "Open the step and set a duration - the runtime needs a positive number of seconds, minutes, or days.",
  INVALID_BRANCH_CONFIG:
    "A branch needs both paths wired up. Connect the Yes and the No handle to a step.",
  INVALID_WEBHOOK_CONFIG: "Open the step and add the URL to POST to.",
  INVALID_TAG_CONFIG: "Open the step and choose at least one tag.",
  INVALID_CAMPAIGN_DISPATCH_CONFIG:
    "Open the step and choose the campaign to dispatch.",
  INVALID_CAMPAIGN_RECIPIENTS:
    "This dispatch sends to a wallet list but the list is empty. Add wallets, or switch it back to the triggering wallet.",
  INVALID_INAPP_RECIPIENTS:
    "This push sends to a wallet list but the list is empty. Add wallets, or switch it back to the triggering wallet.",

  // Graph-scoped errors - no nodeId, deliberately: they are about the graph.
  EMPTY_FLOW: "Drag a trigger from the left panel onto the canvas to start.",
  MISSING_TRIGGER:
    "Every flow starts with one trigger. Add one from the left panel, then connect it to the first step.",
  INVALID_EDGE:
    "A connection points at a step that is no longer in the flow. Delete the line and draw it again.",

  // Warnings - these never block publishing.
  DISCONNECTED_NODES:
    "Nothing reaches these steps, so they will never run. Connect them to the flow, or delete them.",

  // Watch-registration skips (publish response). The graph published fine, but
  // this trigger is subscribed to nothing and will never fire.
  WATCH_NO_CHAIN: "Open the trigger and choose the chain to watch.",
  WATCH_NO_ADDRESS:
    "Open the trigger and choose (or paste) the contract address to watch.",
  WATCH_NO_EVENT:
    "Open the trigger and pick the event to watch, or paste the contract ABI.",
  WATCH_EVENT_NOT_IN_ABI:
    "The chosen event is not in this contract's ABI. Pick one of its real events.",
  WATCH_EVENT_AMBIGUOUS:
    "This ABI has several events. Open the trigger and pick the one to watch.",
  WATCH_EVENT_UNREADABLE:
    "The ABI or event signature would not parse. Paste the contract ABI again.",
  WATCH_ACTOR_REQUIRED:
    "This event names no wallet, so an email or push has nobody to go to. Paste the ABI so the recipient can be decoded, or use a webhook step instead.",

  WATCH_NOT_REGISTERED:
    "This automation was published before watch registration existed. Publish it again to subscribe the trigger.",
  WATCH_FAILED:
    "The subscription could not be established. Check the chain and contract, then publish again.",
  WATCH_DRAINING:
    "Nothing binds this watch any more - it is being released. Publish again to re-subscribe.",

  // Local pre-flight codes with no backend equivalent.
  MULTIPLE_TRIGGERS:
    "An automation has a single entry point. Delete the extra triggers.",
  NO_ACTIONS: "Add at least one action under the trigger.",
  INVALID_INAPP_CONFIG: "Open the step and write the push title and body.",
  INVALID_LIST_CONFIG: "Open the step and choose the list to add contacts to.",
  SENDER_NOT_VERIFIED:
    "Verify a sending domain in Settings - Gmail and Outlook reject unauthenticated senders.",
};

/**
 * Last-resort matching for a code we have never seen (the backend can add one
 * before this table catches up). Matches on tokens in the code, and gives up
 * rather than guessing when nothing fits.
 */
const FALLBACK_HINT_RULES: {
  when: (tokens: string) => boolean;
  hint: string;
}[] = [
  {
    when: (t) => t.includes("trigger") && t.includes("missing"),
    hint: ISSUE_HINTS.MISSING_TRIGGER,
  },
  { when: (t) => t.includes("empty"), hint: ISSUE_HINTS.EMPTY_FLOW },
  {
    when: (t) => t.includes("subject"),
    hint: ISSUE_HINTS.INVALID_EMAIL_SUBJECT,
  },
  { when: (t) => t.includes("email"), hint: ISSUE_HINTS.INVALID_EMAIL_CONFIG },
  {
    when: (t) => t.includes("wait") || t.includes("delay"),
    hint: ISSUE_HINTS.INVALID_WAIT_CONFIG,
  },
  {
    when: (t) => t.includes("branch"),
    hint: ISSUE_HINTS.INVALID_BRANCH_CONFIG,
  },
  {
    when: (t) => t.includes("webhook"),
    hint: ISSUE_HINTS.INVALID_WEBHOOK_CONFIG,
  },
  { when: (t) => t.includes("tag"), hint: ISSUE_HINTS.INVALID_TAG_CONFIG },
  {
    when: (t) => t.includes("campaign") || t.includes("dispatch"),
    hint: ISSUE_HINTS.INVALID_CAMPAIGN_DISPATCH_CONFIG,
  },
  {
    when: (t) => t.includes("disconnect") || t.includes("unreachable"),
    hint: ISSUE_HINTS.DISCONNECTED_NODES,
  },
  { when: (t) => t.includes("edge"), hint: ISSUE_HINTS.INVALID_EDGE },
  {
    when: (t) =>
      t.includes("watch") || t.includes("contract") || t.includes("event"),
    hint: ISSUE_HINTS.WATCH_NO_EVENT,
  },
];

/** The fix-it hint for an issue code, or "" when we have nothing useful. */
export const hintForIssue = (...codes: (string | undefined)[]): string => {
  for (const code of codes) {
    if (!code) continue;
    const exact = ISSUE_HINTS[code.trim().toUpperCase()];
    if (exact) return exact;
  }
  const tokens = normalize(codes.filter(Boolean).join("_"));
  if (tokens.length === 0) return "";
  return FALLBACK_HINT_RULES.find((rule) => rule.when(tokens))?.hint ?? "";
};

const readNodeId = (entry: Record<string, unknown>): string =>
  asText(entry.nodeId) ||
  asText(entry.node_id) ||
  asText(entry.stepId) ||
  asText(entry.step_id) ||
  asText(entry.node) ||
  asText(entry.id);

/** One raw `errors[]` / `warnings[]` entry (object or bare string) → an issue. */
const toIssue = (
  entry: unknown,
  severity: BuilderIssueSeverity,
  index: number
): BuilderIssue | null => {
  if (typeof entry === "string") {
    const message = entry.trim();
    if (message.length === 0) return null;
    return {
      id: `server-${severity}-${index}`,
      severity,
      code: "",
      message,
      hint: hintForIssue(message),
      source: "server",
    };
  }
  if (!isJsonObject(entry)) return null;

  const code = asText(entry.code);
  const message = asText(entry.message) || asText(entry.reason);
  const nodeId = readNodeId(entry);
  const resolved = message || humanizeIssueCode(code);
  if (resolved.length === 0 && nodeId.length === 0) return null;

  return {
    id: `server-${severity}-${nodeId || code || index}-${index}`,
    severity,
    code,
    ...(nodeId ? { nodeId } : {}),
    message: resolved || "This step needs setup",
    // Code first: a message like "The No path is empty" would otherwise match
    // the empty-flow rule instead of its own branch rule.
    hint: hintForIssue(code) || hintForIssue(message),
    source: "server",
  };
};

/** Containers an `errors[]` array could be hiding in, innermost first. */
const issueContainers = (source: unknown): unknown[] => {
  const out: unknown[] = [];
  const visit = (value: unknown, depth: number) => {
    if (depth > 3 || !isJsonObject(value)) return;
    out.push(value);
    visit(value.details, depth + 1);
    visit(value.error, depth + 1);
    visit(value.data, depth + 1);
  };
  visit(source, 0);
  return out;
};

const readIssueArray = (
  source: unknown,
  key: "errors" | "warnings"
): unknown[] => {
  for (const container of issueContainers(source)) {
    const value = (container as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

/**
 * Normalize a `POST /builder/validate` response (or anything else carrying
 * `errors` / `warnings`) into a flat issue list.
 */
export const parseValidationIssues = (payload: unknown): BuilderIssue[] => [
  ...readIssueArray(payload, "errors")
    .map((entry, i) => toIssue(entry, "error", i))
    .filter((issue): issue is BuilderIssue => issue !== null),
  ...readIssueArray(payload, "warnings")
    .map((entry, i) => toIssue(entry, "warning", i))
    .filter((issue): issue is BuilderIssue => issue !== null),
];

/**
 * Pull the per-step issues out of a thrown `AUTOMATION_BUILDER_INVALID` (or any
 * API error that carried `errors` / `warnings`). Returns [] when the error has
 * no structured payload, so callers fall back to their generic handling.
 */
export const parseBuilderErrorIssues = (error: unknown): BuilderIssue[] => {
  if (!(error instanceof Error)) return [];
  const { details, body } = error as ApiError;
  const fromDetails = parseValidationIssues(details);
  if (fromDetails.length > 0) return fromDetails;
  return parseValidationIssues(body);
};

/** True when the failure is the builder's own graph rejection. */
export const isBuilderInvalidError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const { code } = error as ApiError;
  if (code === AUTOMATION_BUILDER_INVALID) return true;
  return /builder graph is invalid/i.test(error.message);
};

/**
 * A trigger type whose event is baked into the preset server-side
 * (`swap_completed` → `Swap`/`TokenExchange`, `holder_acquired` → `Transfer`
 * from the zero address, …). These must NOT ask the user to choose an event -
 * only the generic `onchain_event` does.
 */
const GENERIC_ONCHAIN_TRIGGERS = new Set([
  "onchain",
  "trigger",
  "onchain_event",
]);

/** Triggers that watch nothing on-chain, so they need no contract at all. */
const OFFCHAIN_TRIGGERS = new Set([
  "segment_entered",
  "segment_exited",
  "list_joined",
  "form_submitted",
  "email_opened",
  "email_clicked",
  "tag_added",
  "campaign_completed",
  "health_threshold",
]);

/** Placeholder labels older graphs stored in place of a real selection. */
const PLACEHOLDERS = new Set([
  "select contract",
  "select event",
  "select a contract",
  "select an event",
]);

const field = (data: Record<string, unknown>, key: string): string => {
  const value = asText(data[key]);
  return PLACEHOLDERS.has(value.toLowerCase()) ? "" : value;
};

/**
 * "2 days" / "45m" / "1 hour" → seconds. The wait step stores prose, the
 * runtime needs a positive number (`INVALID_WAIT_CONFIG`), so the builder
 * converts rather than letting publish fail on it. Returns 0 when unparseable.
 */
export const parseDurationToSeconds = (input: unknown): number => {
  if (typeof input === "number")
    return Number.isFinite(input) && input > 0 ? Math.round(input) : 0;
  const text = asText(input).toLowerCase();
  if (text.length === 0) return 0;
  const units: [RegExp, number][] = [
    [/(\d+(?:\.\d+)?)\s*(?:w|week|weeks)\b/, 604800],
    [/(\d+(?:\.\d+)?)\s*(?:d|day|days)\b/, 86400],
    [/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/, 3600],
    [/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)\b/, 60],
    [/(\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds)\b/, 1],
  ];
  let total = 0;
  for (const [pattern, multiplier] of units) {
    const match = text.match(pattern);
    if (match) total += Number(match[1]) * multiplier;
  }
  if (total > 0) return Math.round(total);
  // A bare number is read as minutes, matching the placeholder copy.
  const bare = text.match(/^(\d+(?:\.\d+)?)$/);
  return bare ? Math.round(Number(bare[1]) * 60) : 0;
};

export interface NodeSetupIssue {
  /** The code the backend would raise for this, so copy is shared. */
  code: string;
  /** What is missing, phrased for the step's own subtitle. */
  message: string;
}

/**
 * The single source of truth for "this step is not fully set up": it drives the
 * orange dot on the node, the issues list, and the go-live gate, so all three
 * can never disagree. Mirrors the backend's per-node rules exactly (see
 * docs/backend.md "Automation builder issue codes").
 */
export const nodeSetupIssue = (
  node: Pick<IssueGraphNode, "type" | "isTrigger" | "triggerType" | "data">,
  context: { outgoingEdgeCount?: number } = {}
): NodeSetupIssue | null => {
  const data = isJsonObject(node.data) ? node.data : {};
  const type = asText(node.type);
  const triggerType =
    asText(node.triggerType) || asText(data.triggerType) || type;

  if (node.isTrigger) {
    if (OFFCHAIN_TRIGGERS.has(triggerType)) return null;
    if (!field(data, "contractAddress") && !field(data, "contract")) {
      return {
        code: "WATCH_NO_ADDRESS",
        message: "Needs a contract to watch",
      };
    }
    // Presets carry their own event names - only the generic trigger asks.
    if (GENERIC_ONCHAIN_TRIGGERS.has(triggerType) && !field(data, "event")) {
      return { code: "WATCH_NO_EVENT", message: "Needs an event to watch" };
    }
    return null;
  }

  switch (type) {
    case "email":
    case "send_email": {
      if (
        !field(data, "templateId") &&
        !field(data, "templateName") &&
        !field(data, "template") &&
        !field(data, "body") &&
        !field(data, "campaignId")
      ) {
        return { code: "INVALID_EMAIL_CONFIG", message: "Needs a template" };
      }
      if (!field(data, "subject")) {
        return {
          code: "INVALID_EMAIL_SUBJECT",
          message: "Needs a subject line",
        };
      }
      return null;
    }
    case "inapp":
    case "send_inapp":
      return field(data, "title") || field(data, "body")
        ? null
        : { code: "INVALID_INAPP_CONFIG", message: "Needs a title or body" };
    case "wait":
      return parseDurationToSeconds(
        data.seconds ?? data.delaySeconds ?? data.duration ?? data.minutes
      ) > 0
        ? null
        : { code: "INVALID_WAIT_CONFIG", message: "Needs a duration" };
    case "branch":
      // The runtime needs somewhere to send both outcomes.
      return (context.outgoingEdgeCount ?? 0) >= 2
        ? null
        : {
            code: "INVALID_BRANCH_CONFIG",
            message: "Needs both paths connected",
          };
    case "tag":
    case "add_tag":
    case "remove_tag":
      return (Array.isArray(data.tags) && data.tags.length > 0) ||
        field(data, "tag")
        ? null
        : { code: "INVALID_TAG_CONFIG", message: "Needs a tag" };
    case "list":
    case "add_to_list":
      return field(data, "listId") || field(data, "listName")
        ? null
        : { code: "INVALID_LIST_CONFIG", message: "Needs a list" };
    case "webhook":
      return field(data, "url")
        ? null
        : { code: "INVALID_WEBHOOK_CONFIG", message: "Needs a URL" };
    case "dispatch":
    case "dispatch_campaign":
      return field(data, "campaignId")
        ? null
        : {
            code: "INVALID_CAMPAIGN_DISPATCH_CONFIG",
            message: "Needs a campaign",
          };
    default:
      return null;
  }
};

/**
 * Client-side pre-flight. Runs on every graph change so the user sees *where*
 * the problem is while editing, instead of finding out on save. Deliberately
 * mirrors the backend's documented checks and reuses its codes; the backend
 * stays the authority.
 */
export const buildLocalIssues = (input: {
  nodes: IssueGraphNode[];
  edges: IssueGraphEdge[];
  /** The flow sends email but the org has no verified sender identity. */
  emailNeedsSender?: boolean;
}): BuilderIssue[] => {
  const { nodes, edges, emailNeedsSender = false } = input;
  const issues: BuilderIssue[] = [];
  const local = (
    code: string,
    message: string,
    extra: { nodeId?: string; severity?: BuilderIssueSeverity } = {}
  ): BuilderIssue => ({
    id: `local.${code}.${extra.nodeId ?? "graph"}`,
    severity: extra.severity ?? "error",
    code,
    ...(extra.nodeId ? { nodeId: extra.nodeId } : {}),
    message,
    hint: hintForIssue(code),
    source: "local",
  });

  if (nodes.length === 0) {
    return [local("EMPTY_FLOW", "This flow is empty")];
  }

  const triggers = nodes.filter((node) => node.isTrigger);
  if (triggers.length === 0) {
    issues.push(local("MISSING_TRIGGER", "This flow has no trigger"));
  }
  for (const extra of triggers.slice(1)) {
    issues.push(
      local("MULTIPLE_TRIGGERS", `${extra.label} is a second trigger`, {
        nodeId: extra.id,
      })
    );
  }
  if (triggers.length > 0 && nodes.length === triggers.length) {
    issues.push(local("NO_ACTIONS", "The trigger has no steps after it"));
  }

  const outgoingCount = new Map<string, number>();
  for (const edge of edges) {
    outgoingCount.set(edge.source, (outgoingCount.get(edge.source) ?? 0) + 1);
  }
  for (const node of nodes) {
    const setup = nodeSetupIssue(node, {
      outgoingEdgeCount: outgoingCount.get(node.id) ?? 0,
    });
    if (!setup) continue;
    issues.push(
      local(setup.code, `${node.label} - ${setup.message.toLowerCase()}`, {
        nodeId: node.id,
      })
    );
  }

  // Anything the trigger can't reach never runs. A warning, matching the
  // backend's own DISCONNECTED_NODES, which never blocks publish.
  const reachable = new Set(triggers.map((node) => node.id));
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    const list = outgoing.get(edge.source);
    if (list) list.push(edge.target);
    else outgoing.set(edge.source, [edge.target]);
  }
  const queue = [...reachable];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const next of outgoing.get(current) ?? []) {
      if (reachable.has(next)) continue;
      reachable.add(next);
      queue.push(next);
    }
  }
  if (triggers.length > 0) {
    for (const node of nodes) {
      if (reachable.has(node.id)) continue;
      issues.push(
        local(
          "DISCONNECTED_NODES",
          `${node.label} isn't connected to the trigger`,
          { nodeId: node.id, severity: "warning" }
        )
      );
    }
  }

  if (emailNeedsSender) {
    issues.push(
      local(
        "SENDER_NOT_VERIFIED",
        "No verified sending domain for the email step"
      )
    );
  }

  return issues;
};

/**
 * `watchesSkipped` from a publish response → warning issues. The graph was
 * valid and the automation now reads ACTIVE, but these triggers are subscribed
 * to nothing and will never fire - the exact silent failure the builder has to
 * surface rather than showing a green "published".
 */
export const parseWatchesSkipped = (payload: unknown): BuilderIssue[] => {
  const list =
    isJsonObject(payload) && Array.isArray(payload.watchesSkipped)
      ? payload.watchesSkipped
      : [];
  return list
    .map((entry, index): BuilderIssue | null => {
      if (!isJsonObject(entry)) return null;
      const code = asText(entry.code) || "WATCH_SKIPPED";
      const nodeId = readNodeId(entry);
      const reason =
        asText(entry.reason) ||
        WATCH_STATE_REASONS[code] ||
        humanizeIssueCode(code).toLowerCase();
      return {
        id: `watch-${nodeId || code}-${index}`,
        severity: "warning",
        code,
        ...(nodeId ? { nodeId } : {}),
        message: `This trigger is not live - ${reason}`,
        hint: hintForIssue(code),
        source: "server",
      };
    })
    .filter((issue): issue is BuilderIssue => issue !== null);
};

/**
 * Server issues win over local guesses for the same step: the backend knows
 * exactly what it rejected, and showing both reads as two separate problems.
 */
export const mergeIssues = (
  local: BuilderIssue[],
  server: BuilderIssue[]
): BuilderIssue[] => {
  const serverNodeIds = new Set(
    server.map((issue) => issue.nodeId).filter(Boolean) as string[]
  );
  const hasServerGraphIssue = server.some((issue) => !issue.nodeId);
  const kept = local.filter((issue) =>
    issue.nodeId
      ? !serverNodeIds.has(issue.nodeId)
      : !(hasServerGraphIssue && issue.severity === "error")
  );
  const all = [...server, ...kept];
  // Errors first, then warnings; stable within each group.
  return [
    ...all.filter((issue) => issue.severity === "error"),
    ...all.filter((issue) => issue.severity === "warning"),
  ];
};

/** A one-line summary for the toast, e.g. "Send email - needs a subject". */
export const summarizeIssues = (issues: BuilderIssue[], max = 2): string => {
  const errors = issues.filter((issue) => issue.severity === "error");
  const shown = errors.slice(0, max).map((issue) => issue.message);
  const more = errors.length - shown.length;
  return `${shown.join("; ")}${more > 0 ? ` (+${more} more)` : ""}`;
};

/**
 * `GET /automations/{id}/watches` → issues. This answers "is my trigger
 * actually receiving events?", which `watchesSkipped` cannot: a watch can bind
 * cleanly at publish and be marked `failed` by the reconciler days later.
 *
 * `subscriptions: "unavailable"` means the READ failed, not that nothing is
 * subscribed - it deliberately produces no issues, because telling someone
 * their working automation is dead is worse than saying nothing.
 */
export const parseWatchState = (payload: unknown): BuilderIssue[] => {
  if (!isJsonObject(payload)) return [];
  const subscriptionsKnown = asText(payload.subscriptions) !== "unavailable";
  const triggers = Array.isArray(payload.triggers) ? payload.triggers : [];

  return triggers
    .map((entry, index): BuilderIssue | null => {
      if (!isJsonObject(entry)) return null;
      if (entry.live === true) {
        // Live, but the reconciler recorded an error on the last attempt.
        const lastError = asText(entry.lastError);
        if (lastError.length === 0) return null;
        const nodeId = readNodeId(entry);
        return {
          id: `watch-error-${nodeId || index}`,
          severity: "warning",
          code: "WATCH_FAILED",
          ...(nodeId ? { nodeId } : {}),
          message: `This trigger reported an error - ${lastError}`,
          hint: hintForIssue("WATCH_FAILED"),
          source: "server",
        };
      }

      const code =
        asText(entry.code) || watchStatusCode(asText(entry.watchStatus));
      // A missing binding proves nothing while the subscription read is down.
      if (!subscriptionsKnown && code === "WATCH_NOT_REGISTERED") return null;
      const nodeId = readNodeId(entry);
      const reason =
        asText(entry.reason) ||
        WATCH_STATE_REASONS[code] ||
        humanizeIssueCode(code).toLowerCase();
      return {
        id: `watch-${nodeId || code}-${index}`,
        severity: "warning",
        code,
        ...(nodeId ? { nodeId } : {}),
        message: `This trigger is not live - ${reason}`,
        hint: hintForIssue(code),
        source: "server",
      };
    })
    .filter((issue): issue is BuilderIssue => issue !== null);
};

/** Prose for a state the backend reports without a `reason` of its own. */
const WATCH_STATE_REASONS: Record<string, string> = {
  WATCH_FAILED: "the subscription could not be established",
  WATCH_DRAINING: "its subscription is being released",
  WATCH_NOT_REGISTERED: "it was never registered",
};

/** `draining` and `failed` are both "not receiving events", for different
 *  reasons - neither is `active`, and the copy differs. */
const watchStatusCode = (watchStatus: string): string => {
  if (watchStatus === "failed") return "WATCH_FAILED";
  if (watchStatus === "draining") return "WATCH_DRAINING";
  return "WATCH_NOT_REGISTERED";
};
