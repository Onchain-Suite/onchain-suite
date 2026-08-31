import { beforeEach, describe, expect, it, vi } from "vitest";

import { automationService } from "./automation.service";

const mocks = vi.hoisted(() => ({
  apiClient: {
    request: vi.fn(),
  },
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: mocks.apiClient,
}));

vi.mock("@/lib/utils", async () => {
  const actual = await vi.importActual("@/lib/utils");
  return {
    ...actual,
    getSelectedOrganizationId: () => "org_test_123",
  };
});

describe("automationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.apiClient.request.mockResolvedValue({ data: {} });
  });

  it("requests org-scoped automation CRUD and builder endpoints", async () => {
    await automationService.listAutomations({
      status: "active",
      search: "welcome",
      page: 1,
      limit: 20,
    });
    await automationService.getAutomation("auto_123");
    await automationService.updateAutomationStatus("auto_123", {
      status: "paused",
    });
    await automationService.getBuilder("auto_123");
    await automationService.validateBuilder("auto_123", {
      nodes: [{ id: "trigger_1", type: "segment_entered" }],
      edges: [],
    });
    await automationService.resetBuilder("auto_123");

    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: "GET",
        url: "/automations",
        headers: expect.objectContaining({
          "x-org-id": "org_test_123",
          "x-onchain-silent-error": "1",
        }),
      })
    );
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: "GET",
        url: "/automations/auto_123",
      })
    );
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        method: "PUT",
        url: "/automations/auto_123/status",
        data: { status: "paused" },
      })
    );
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        method: "GET",
        url: "/automations/auto_123/builder",
      })
    );
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({
        method: "POST",
        url: "/automations/auto_123/builder/validate",
      })
    );
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      6,
      expect.objectContaining({
        method: "POST",
        url: "/automations/auto_123/builder/reset",
      })
    );
  });

  it("supports builder email templates and runtime trigger ingestion endpoints", async () => {
    await automationService.listBuilderEmailTemplates();
    await automationService.triggerSegmentEntered({
      segmentId: "segment_123",
      email: "holder@example.com",
      payload: { source: "segment-sync" },
    });
    await automationService.triggerOnchainEvent({
      chain: "base-mainnet",
      event: "swap.executed",
      walletAddress: "0xabc",
      contractAddress: "0xdef",
    });
    await automationService.triggerEmailOpened({
      campaignId: "campaign_123",
      email: "holder@example.com",
    });
    await automationService.triggerHealthThreshold({
      score: 42,
      walletAddress: "0xabc",
      payload: { band: "cooling" },
    });

    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: "GET",
        url: "/automations/builder/email-templates",
      })
    );
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: "POST",
        url: "/automations/runtime/triggers/segment-entered",
      })
    );
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        method: "POST",
        url: "/automations/runtime/triggers/onchain-event",
      })
    );
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        method: "POST",
        url: "/automations/runtime/triggers/email-opened",
      })
    );
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({
        method: "POST",
        url: "/automations/runtime/triggers/health-threshold",
      })
    );
  });

  it("supports template, preview, and stats endpoints", async () => {
    await automationService.listTemplates();
    await automationService.getTemplate("template_123");
    await automationService.applyTemplate("template_123");
    await automationService.previewAutomation("auto_123", {
      triggerSpec: { type: "segment_entered" },
    });
    await automationService.getStatsOverview("auto_123");
    await automationService.getStatsPreview("auto_123");
    await automationService.getStatsTimeSeries("auto_123", {
      period: "30days",
    });
    await automationService.getStatsPaths("auto_123");
    await automationService.listStatsEntries("auto_123", {
      page: 1,
      limit: 25,
    });
    await automationService.getStatsEntryDetails("auto_123", "entry_123");
    await automationService.getStatsRevenue("auto_123");
    await automationService.getPerformance("auto_123");

    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: "GET",
        url: "/automations/templates",
      })
    );
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: "GET",
        url: "/automations/templates/template_123",
      })
    );
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        method: "POST",
        url: "/automations/templates/template_123/apply",
      })
    );
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        method: "POST",
        url: "/automations/auto_123/preview",
      })
    );
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      12,
      expect.objectContaining({
        method: "GET",
        url: "/automations/auto_123/performance",
      })
    );
  });

  it("runs a Health Factor trigger on demand and returns both counts", async () => {
    mocks.apiClient.request.mockResolvedValueOnce({
      data: { automationId: "auto_123", positionsRead: 12, crossings: 2 },
    });

    const res = await automationService.runHealthFactorNow("auto_123");

    expect(mocks.apiClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        url: "/automations/auto_123/defi/health-factor/run",
        headers: expect.objectContaining({ "x-org-id": "org_test_123" }),
      })
    );
    expect(res).toMatchObject({ positionsRead: 12, crossings: 2 });
  });
});
