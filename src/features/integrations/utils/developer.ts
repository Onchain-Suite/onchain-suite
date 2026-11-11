import type { WebhookEndpoint } from "../contracts/developer";
import { API_ENDPOINTS, type ApiEndpoint } from "../data/api-reference";
import { TOPIC_DESCRIPTIONS, TOPIC_GROUPS } from "../data/webhook-topics";

/* Pure rules behind the Webhooks and API tabs. */

/** Query keys, scoped to the workspace so a switch never shows another's keys. */
export const developerKeys = {
  keys: (orgId: string | null) => ["developer", "keys", orgId] as const,
  webhooks: (orgId: string | null) => ["developer", "webhooks", orgId] as const,
  topics: (orgId: string | null) =>
    ["developer", "webhook-events", orgId] as const,
};

/** Events carry contact data, so an endpoint must be https with a real host. */
export const isHttpsUrl = (url: string): boolean =>
  /^https:\/\/[^\s/.]+\.[^\s/]+/i.test(url.trim());

export type HealthTone = "success" | "error" | "warning" | "neutral";

/**
 * An endpoint's health in a word, from what the backend keeps about it: its
 * status, its run of failures and its last delivery. Paused wins over
 * everything, since nothing is being sent to judge.
 */
export function webhookHealth(hook: WebhookEndpoint): {
  tone: HealthTone;
  text: string;
} {
  if (hook.status === "paused") return { tone: "neutral", text: "Paused" };
  if (hook.status === "failing") {
    return {
      tone: "error",
      text:
        hook.failureCount > 0
          ? `Failing, ${hook.failureCount} in a row`
          : "Failing",
    };
  }
  if (hook.failureCount > 0) {
    return {
      tone: "warning",
      text: `${hook.failureCount} failed, retrying`,
    };
  }
  if (!hook.lastDeliveryAt) {
    return { tone: "neutral", text: "No deliveries yet" };
  }
  return { tone: "success", text: "Healthy" };
}

/** "3 topics", with what else is true of the endpoint. */
export function webhookSummary(hook: WebhookEndpoint): string {
  const n = hook.events.length;
  const topics = `${n} ${n === 1 ? "topic" : "topics"}`;
  return hook.status === "paused" ? `${topics} · paused` : topics;
}

export interface TopicGroup {
  group: string;
  topics: { id: string; desc: string | null }[];
}

/**
 * The backend's flat topic list, grouped by what it is about, in the order the
 * backend gave. A prefix with no heading of its own goes under "Other".
 */
export function groupTopics(catalog: string[]): TopicGroup[] {
  const groups = new Map<string, TopicGroup>();
  for (const id of catalog) {
    const prefix = id.split(".")[0] ?? "";
    const group = TOPIC_GROUPS[prefix] ?? "Other";
    const entry = groups.get(group) ?? { group, topics: [] };
    entry.topics.push({ id, desc: TOPIC_DESCRIPTIONS[id] ?? null });
    groups.set(group, entry);
  }
  return [...groups.values()];
}

/** The same topics, either order. */
export const sameTopics = (a: string[], b: string[]): boolean =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

/**
 * A request as a curl command someone can paste. The key is never known here
 * (a secret is shown once, at creation), so it is a placeholder they fill in.
 */
export function curlFor(endpoint: ApiEndpoint, baseUrl: string): string {
  const url = `${baseUrl}${endpoint.path}${endpoint.query ? `?${endpoint.query}` : ""}`;
  const lines = [
    endpoint.method === "GET"
      ? `curl "${url}" \\`
      : `curl -X ${endpoint.method} "${url}" \\`,
    '  -H "Authorization: Bearer sk_live_…"',
  ];
  if (endpoint.body !== undefined) {
    lines[1] += " \\";
    lines.push('  -H "Content-Type: application/json" \\');
    lines.push(`  -d '${JSON.stringify(endpoint.body)}'`);
  }
  return lines.join("\n");
}

/** Endpoints matching a search over method, path, summary and group. */
export function searchEndpoints(q: string): ApiEndpoint[] {
  const t = q.trim().toLowerCase();
  if (!t) return API_ENDPOINTS;
  return API_ENDPOINTS.filter((e) =>
    `${e.method} ${e.path} ${e.summary} ${e.group}`.toLowerCase().includes(t)
  );
}

/** Endpoints under their group heading, in catalog order. */
export function groupEndpoints(
  endpoints: ApiEndpoint[]
): { group: string; items: ApiEndpoint[] }[] {
  const groups = new Map<string, ApiEndpoint[]>();
  for (const e of endpoints) {
    groups.set(e.group, [...(groups.get(e.group) ?? []), e]);
  }
  return [...groups.entries()].map(([group, items]) => ({ group, items }));
}
