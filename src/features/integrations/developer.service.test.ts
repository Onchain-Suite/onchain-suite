import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/lib/api-client";

import { developerService } from "./developer.service";

vi.mock("@/lib/api-client", () => ({
  apiClient: { request: vi.fn() },
}));

const request = vi.mocked(apiClient.request);

const respond = (data: unknown) =>
  request.mockResolvedValueOnce({ data: { success: true, data } } as never);

const WEBHOOK = {
  id: "wh_1",
  url: "https://api.example.com/hooks",
  events: ["contact.created"],
  status: "active",
  secretHint: "whsec_••••1234",
  lastDeliveryAt: "2026-11-10T10:00:00.000Z",
  lastDeliveryStatus: 200,
  failureCount: 0,
  createdAt: "2026-11-01T10:00:00.000Z",
};

describe("developerService webhooks", () => {
  beforeEach(() => request.mockReset());

  it("keeps the last delivery's HTTP status, which arrives as a number", async () => {
    respond([WEBHOOK]);
    const [hook] = await developerService.listWebhooks("org_1");
    expect(hook.lastDeliveryStatus).toBe(200);
  });

  it("reads no status before the first delivery or when nothing answered", async () => {
    respond([{ ...WEBHOOK, lastDeliveryAt: null, lastDeliveryStatus: null }]);
    const [hook] = await developerService.listWebhooks("org_1");
    expect(hook.lastDeliveryStatus).toBeNull();
  });

  it("sends the workspace with every call", async () => {
    respond([]);
    await developerService.listWebhooks("org_1");
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        url: "/developer/webhooks",
        headers: expect.objectContaining({ "x-org-id": "org_1" }),
      })
    );
  });

  it("returns how the endpoint answered a test ping", async () => {
    respond({ ok: true, status: 204 });
    await expect(
      developerService.testWebhook("wh_1", "org_1")
    ).resolves.toEqual({ ok: true, status: 204 });
  });

  it("rejects a failed test with the backend's reason", async () => {
    request.mockRejectedValueOnce({
      message: "Request failed",
      response: {
        status: 500,
        data: { message: "Webhook delivery failed with status 500" },
      },
    });
    await expect(
      developerService.testWebhook("wh_1", "org_1")
    ).rejects.toMatchObject({
      name: "DeveloperApiError",
      message: "Webhook delivery failed with status 500",
      status: 500,
    });
  });

  it("returns the signing secret from create, once", async () => {
    respond({ ...WEBHOOK, secret: "whsec_full_value" });
    const created = await developerService.createWebhook(
      { url: WEBHOOK.url, events: WEBHOOK.events },
      "org_1"
    );
    expect(created.secret).toBe("whsec_full_value");
    expect(created.lastDeliveryStatus).toBe(200);
  });
});

describe("developerService keys", () => {
  beforeEach(() => request.mockReset());

  it("trusts status over revokedAt: a rolled key is expiring, not dead", async () => {
    respond([
      {
        id: "key_1",
        name: "production",
        prefix: "sk_live_a1b2",
        environment: "live",
        scope: "read_write",
        status: "expiring",
        lastUsedAt: null,
        revokedAt: "2099-01-01T00:00:00.000Z",
        createdAt: null,
      },
    ]);
    const [key] = await developerService.listKeys("org_1");
    expect(key.status).toBe("expiring");
  });
});
