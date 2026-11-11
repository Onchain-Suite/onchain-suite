import { describe, expect, it } from "vitest";

import type { WebhookEndpoint } from "../contracts/developer";
import { API_BASE_URL, API_ENDPOINTS } from "../data/api-reference";
import {
  curlFor,
  developerKeys,
  groupEndpoints,
  groupTopics,
  isHttpsUrl,
  sameTopics,
  searchEndpoints,
  webhookHealth,
  webhookSummary,
} from "./developer";

const hook = (over: Partial<WebhookEndpoint> = {}): WebhookEndpoint => ({
  id: "wh_1",
  url: "https://api.example.com/hooks",
  events: ["contact.created", "message.delivered"],
  status: "active",
  secretHint: "whsec_••••1234",
  lastDeliveryAt: null,
  lastDeliveryStatus: null,
  failureCount: 0,
  createdAt: null,
  ...over,
});

const endpoint = (id: string) => {
  const found = API_ENDPOINTS.find((e) => e.id === id);
  if (!found) throw new Error(`no endpoint ${id}`);
  return found;
};

describe("developerKeys", () => {
  it("keeps one workspace's keys apart from another's", () => {
    expect(developerKeys.keys("org_a")).not.toEqual(
      developerKeys.keys("org_b")
    );
    expect(developerKeys.webhooks("org_a")).not.toEqual(
      developerKeys.webhooks("org_b")
    );
  });
});

describe("isHttpsUrl", () => {
  it("accepts an https address with a host", () => {
    expect(isHttpsUrl("https://api.yourdapp.com/hooks/onchainsuite")).toBe(
      true
    );
    expect(isHttpsUrl("  https://a.co  ")).toBe(true);
  });

  it("rejects plain http, a bare scheme and a host with no dot", () => {
    expect(isHttpsUrl("http://api.yourdapp.com/hooks")).toBe(false);
    expect(isHttpsUrl("https://")).toBe(false);
    expect(isHttpsUrl("https://localhost")).toBe(false);
    expect(isHttpsUrl("api.yourdapp.com")).toBe(false);
  });
});

describe("webhookHealth", () => {
  it("has nothing to say before the first delivery", () => {
    expect(webhookHealth(hook())).toEqual({
      tone: "neutral",
      text: "No deliveries yet",
    });
  });

  it("is healthy once something was delivered and nothing is failing", () => {
    expect(
      webhookHealth(hook({ lastDeliveryAt: "2026-11-10T10:00:00Z" }))
    ).toEqual({ tone: "success", text: "Healthy" });
  });

  it("warns while failures are still being retried", () => {
    expect(
      webhookHealth(
        hook({ lastDeliveryAt: "2026-11-10T10:00:00Z", failureCount: 2 })
      )
    ).toEqual({ tone: "warning", text: "2 failed, retrying" });
  });

  it("says failing once the backend has marked it so", () => {
    expect(webhookHealth(hook({ status: "failing", failureCount: 8 }))).toEqual(
      {
        tone: "error",
        text: "Failing, 8 in a row",
      }
    );
    expect(webhookHealth(hook({ status: "failing" })).text).toBe("Failing");
  });

  it("reads paused whatever came before", () => {
    expect(
      webhookHealth(hook({ status: "paused", failureCount: 4 })).text
    ).toBe("Paused");
  });
});

describe("webhookSummary", () => {
  it("counts topics and says when the endpoint is paused", () => {
    expect(webhookSummary(hook())).toBe("2 topics");
    expect(webhookSummary(hook({ events: ["contact.created"] }))).toBe(
      "1 topic"
    );
    expect(webhookSummary(hook({ status: "paused" }))).toBe(
      "2 topics · paused"
    );
  });
});

describe("groupTopics", () => {
  it("groups by what the topic is about, keeping the backend's order", () => {
    const groups = groupTopics([
      "message.delivered",
      "contact.created",
      "message.clicked",
      "automation.completed",
    ]);
    expect(groups.map((g) => g.group)).toEqual([
      "Messages",
      "Contacts",
      "Loops",
    ]);
    expect(groups[0].topics.map((t) => t.id)).toEqual([
      "message.delivered",
      "message.clicked",
    ]);
    expect(groups[0].topics[0].desc).toBeTruthy();
  });

  it("still lists a topic the backend added before it was described", () => {
    const groups = groupTopics(["wallet.linked"]);
    expect(groups).toEqual([
      { group: "Other", topics: [{ id: "wallet.linked", desc: null }] },
    ]);
  });
});

describe("sameTopics", () => {
  it("ignores order", () => {
    expect(sameTopics(["a", "b"], ["b", "a"])).toBe(true);
    expect(sameTopics(["a", "b"], ["a"])).toBe(false);
    expect(sameTopics(["a", "b"], ["a", "c"])).toBe(false);
  });
});

describe("curlFor", () => {
  it("writes a GET with its query and no body", () => {
    expect(curlFor(endpoint("contacts"), API_BASE_URL)).toBe(
      [
        `curl "${API_BASE_URL}/contacts?page=1&limit=20" \\`,
        '  -H "Authorization: Bearer sk_live_…"',
      ].join("\n")
    );
  });

  it("writes a POST with a JSON body", () => {
    const out = curlFor(endpoint("identify"), API_BASE_URL);
    expect(out).toContain(`curl -X POST "${API_BASE_URL}/identify" \\`);
    expect(out).toContain('-H "Content-Type: application/json" \\');
    expect(out.endsWith(`-d '{"walletAddress":"0x…"}'`)).toBe(true);
  });

  it("leaves the body off a POST that takes none", () => {
    const out = curlFor(endpoint("campaign-send"), API_BASE_URL);
    expect(out).not.toContain("Content-Type");
    expect(out.endsWith('-H "Authorization: Bearer sk_live_…"')).toBe(true);
  });

  it("never prints a real key", () => {
    for (const e of API_ENDPOINTS) {
      expect(curlFor(e, API_BASE_URL)).toContain("sk_live_…");
    }
  });
});

describe("the endpoint catalog", () => {
  it("has unique ids", () => {
    const ids = API_ENDPOINTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marks every POST as needing a read and write key", () => {
    for (const e of API_ENDPOINTS) {
      expect(e.scope, e.path).toBe(e.method === "POST" ? "write" : "read");
    }
  });

  it("finds endpoints by path, method, group or summary", () => {
    expect(searchEndpoints("").length).toBe(API_ENDPOINTS.length);
    expect(searchEndpoints("batch").map((e) => e.id)).toEqual(["events-batch"]);
    expect(searchEndpoints("GET").every((e) => e.method === "GET")).toBe(true);
    expect(searchEndpoints("nothing-like-this")).toEqual([]);
  });

  it("groups them under headings in catalog order", () => {
    expect(groupEndpoints(API_ENDPOINTS).map((g) => g.group)).toEqual([
      "Contacts",
      "Events",
      "Messages",
      "Campaigns",
    ]);
  });
});
