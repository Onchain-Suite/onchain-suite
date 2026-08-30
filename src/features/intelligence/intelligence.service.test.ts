import { beforeEach, describe, expect, it, vi } from "vitest";

import { intelligenceService } from "./intelligence.service";

const mocks = vi.hoisted(() => ({
  apiClient: {
    request: vi.fn(),
  },
  fetch: vi.fn(),
  eventSourceInstances: [] as Array<{
    url: string;
    options?: EventSourceInit;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    onerror: ((event: Event) => void) | null;
    emit: (type: string, payload: unknown) => void;
  }>,
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

vi.stubGlobal("fetch", mocks.fetch);
vi.stubGlobal(
  "EventSource",
  vi.fn(function EventSourceMock(url: string, options?: EventSourceInit) {
    const listeners = new Map<
      string,
      Set<(event: MessageEvent<string>) => void>
    >();
    const instance = {
      url,
      options,
      addEventListener: vi.fn((type: string, handler: EventListener) => {
        const bucket =
          listeners.get(type) ??
          new Set<(event: MessageEvent<string>) => void>();
        bucket.add(handler as (event: MessageEvent<string>) => void);
        listeners.set(type, bucket);
      }),
      removeEventListener: vi.fn((type: string, handler: EventListener) => {
        listeners
          .get(type)
          ?.delete(handler as (event: MessageEvent<string>) => void);
      }),
      close: vi.fn(),
      onerror: null as ((event: Event) => void) | null,
      emit: (type: string, payload: unknown) => {
        const message =
          typeof payload === "string" ? payload : JSON.stringify(payload);
        const event = { data: message } as MessageEvent<string>;
        listeners.get(type)?.forEach((handler) => handler(event));
      },
    };
    mocks.eventSourceInstances.push(instance);
    return instance;
  })
);

describe("intelligenceService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.apiClient.request.mockResolvedValue({ data: {} });
    mocks.fetch.mockReset();
    mocks.eventSourceInstances.length = 0;
  });

  it("requests query starters with org-scoped headers", async () => {
    await intelligenceService.getQueryStarters();

    expect(mocks.apiClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        url: "/intelligence/query/starters",
        headers: expect.objectContaining({
          "x-org-id": "org_test_123",
          "x-onchain-silent-error": "1",
        }),
      })
    );
  });

  it("posts query suggestions using the documented payload shape", async () => {
    const body = {
      prompt: "Find high-value dormant users",
      protocol: "Pudgy Penguins",
      sector: "nft" as const,
      chain: "eth-mainnet",
      contractAddresses: ["0xabc"],
      goal: "winback",
      limit: 3,
      includeSql: true,
      mode: "best" as const,
    };

    await intelligenceService.getQuerySuggestions(body);

    expect(mocks.apiClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        url: "/intelligence/query/suggestions",
        data: body,
      })
    );
  });

  it("supports protocol registry list and upsert endpoints", async () => {
    await intelligenceService.listQueryProtocols({
      search: "pudgy",
      sector: "nft",
      chain: "base-mainnet",
    });

    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: "GET",
        url: "/intelligence/query/protocols",
        params: {
          search: "pudgy",
          sector: "nft",
          chain: "base-mainnet",
        },
      })
    );

    await intelligenceService.upsertQueryProtocol({
      name: "Pudgy Penguins",
      sector: "nft",
      chain: "eth-mainnet",
      contractAddresses: ["0xabc"],
      aliases: ["Pudgies"],
      metadata: { source: "manual" },
    });

    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: "POST",
        url: "/intelligence/query/protocols",
      })
    );
  });

  it("supports suggestion tracking, analytics, and SQL generation", async () => {
    await intelligenceService.trackQuerySuggestion("log_123", {
      selected: true,
      executed: true,
      metadata: { source: "editor" },
    });
    await intelligenceService.getQuerySuggestionsAnalytics();
    await intelligenceService.generateSql({
      prompt: "Find inactive whales",
      mode: "fast",
    });

    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: "POST",
        url: "/intelligence/query/suggestions/log_123/track",
      })
    );
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: "GET",
        url: "/intelligence/query/suggestions/analytics",
      })
    );
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        method: "POST",
        url: "/intelligence/query/generate-sql",
      })
    );
  });

  it("supports query cache inspection and invalidation", async () => {
    await intelligenceService.listQueryCache({
      chain: "base-mainnet",
      resourceType: "balances",
      subjectAddress: "0xabc",
      page: 1,
      limit: 20,
    });
    await intelligenceService.getQueryCacheEntry("cache_123");
    await intelligenceService.deleteQueryCacheEntry("cache_123");

    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: "GET",
        url: "/intelligence/query/cache",
      })
    );
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: "GET",
        url: "/intelligence/query/cache/cache_123",
      })
    );
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        method: "DELETE",
        url: "/intelligence/query/cache/cache_123",
      })
    );
  });

  it("supports wallet and contact enrichment endpoints", async () => {
    await intelligenceService.enqueueWalletEnrichment({
      walletAddress: "0xabc",
      chain: "base-mainnet",
      forceRefresh: true,
    });
    await intelligenceService.enqueueContactsEnrichment({
      chain: "eth-mainnet",
      limit: 25,
    });
    await intelligenceService.getWalletEnrichmentMetrics("0xabc");

    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: "POST",
        url: "/intelligence/query/enrichment/wallets/enqueue",
      })
    );
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: "POST",
        url: "/intelligence/query/enrichment/contacts/enqueue",
      })
    );
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        method: "GET",
        url: "/intelligence/query/enrichment/wallets/0xabc",
      })
    );
  });

  it("supports the agent catalog, tools, resources, planning, direct runs, and multichain queries", async () => {
    await intelligenceService.getAgentCatalog();
    await intelligenceService.getAgentTools();
    await intelligenceService.getAgentResources();
    await intelligenceService.readAgentResource({
      uri: "config://supported-chains",
    });
    await intelligenceService.planAgent({
      prompt: "Find active wallets across EVM and Solana",
      chains: ["eth-mainnet", "base-mainnet", "solana-mainnet"],
      protocol: "Jupiter",
      useProjectSettings: true,
      useProtocolRegistry: true,
    });
    await intelligenceService.runAgentTool({
      toolName: "multichain_balances",
      arguments: {
        walletAddress: "0xabc",
        chains: ["eth-mainnet", "base-mainnet"],
      },
    });
    await intelligenceService.queryAgent({
      prompt: "Compare protocol activity across Ethereum, Base, and Solana",
      chains: ["eth-mainnet", "base-mainnet", "solana-mainnet"],
      mode: "best",
    });

    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: "GET",
        url: "/intelligence/query/agent/catalog",
      })
    );
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: "GET",
        url: "/intelligence/query/agent/tools",
      })
    );
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        method: "GET",
        url: "/intelligence/query/agent/resources",
      })
    );
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        method: "POST",
        url: "/intelligence/query/agent/resources/read",
      })
    );
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({
        method: "POST",
        url: "/intelligence/query/agent/plan",
      })
    );
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      6,
      expect.objectContaining({
        method: "POST",
        url: "/intelligence/query/agent/tools/run",
      })
    );
    expect(mocks.apiClient.request).toHaveBeenNthCalledWith(
      7,
      expect.objectContaining({
        method: "POST",
        url: "/intelligence/query/agent/query",
        data: expect.objectContaining({
          chains: ["eth-mainnet", "base-mainnet", "solana-mainnet"],
        }),
      })
    );
  });

  it("streams agent progress through the dedicated frontend stream route", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'event: started\ndata: {"type":"started","message":"boot"}\n\n'
          )
        );
        controller.enqueue(
          encoder.encode(
            'event: final\ndata: {"type":"final","answer":"done"}\n\n'
          )
        );
        controller.close();
      },
    });

    mocks.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      body: stream,
      text: vi.fn().mockResolvedValue(""),
    });

    const events: Array<{ type?: string; data?: unknown }> = [];
    await intelligenceService.streamAgentQuery(
      {
        prompt: "Find cross-chain holders",
        chains: ["eth-mainnet", "solana-mainnet"],
        useProjectSettings: true,
      },
      {
        onEvent: (event) => {
          events.push(event);
        },
      }
    );

    expect(mocks.fetch).toHaveBeenCalledWith(
      "/api/v1/intelligence/query/agent/query/stream?prompt=Find+cross-chain+holders&useProjectSettings=true&chains=eth-mainnet&chains=solana-mainnet&orgId=org_test_123",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        headers: expect.objectContaining({
          "x-org-id": "org_test_123",
        }),
      })
    );
    expect(events).toEqual([
      {
        type: "started",
        data: { type: "started", message: "boot" },
      },
      {
        type: "final",
        data: { type: "final", answer: "done" },
      },
    ]);
  });

  it("uses native EventSource for simple GET SSE requests when preferred", async () => {
    const events: Array<{ type?: string; data?: unknown }> = [];

    const streamPromise = intelligenceService.streamAgentQuery(
      {
        prompt: "Show balances on Base",
        chain: "base-mainnet",
        useProjectSettings: true,
      },
      {
        preferNativeEventSource: true,
        onEvent: (event) => {
          events.push(event);
        },
      }
    );

    expect(mocks.eventSourceInstances).toHaveLength(1);
    expect(mocks.eventSourceInstances[0]?.url).toBe(
      "/api/v1/intelligence/query/agent/query/stream?prompt=Show+balances+on+Base&chain=base-mainnet&useProjectSettings=true&orgId=org_test_123"
    );
    expect(mocks.eventSourceInstances[0]?.options).toEqual({
      withCredentials: true,
    });

    mocks.eventSourceInstances[0]?.emit("started", {
      type: "started",
      message: "boot",
    });
    mocks.eventSourceInstances[0]?.emit("final", {
      type: "final",
      answer: "done",
    });

    await streamPromise;

    expect(events).toEqual([
      {
        type: "started",
        data: { type: "started", message: "boot" },
      },
      {
        type: "final",
        data: { type: "final", answer: "done" },
      },
    ]);
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.eventSourceInstances[0]?.close).toHaveBeenCalled();
  });

  it("uses POST SSE for rich agent stream bodies", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'event: final\ndata: {"type":"final","answer":"done"}\n\n'
          )
        );
        controller.close();
      },
    });

    mocks.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      body: stream,
      text: vi.fn().mockResolvedValue(""),
    });

    await intelligenceService.streamAgentQuery({
      prompt:
        "Compare contracts across chains with a long prompt payload that should prefer POST SSE because it carries structured data.",
      chains: [
        "eth-mainnet",
        "base-mainnet",
        "arbitrum-mainnet",
        "optimism-mainnet",
        "polygon-mainnet",
      ],
      contracts: [
        {
          chain: "base-mainnet",
          address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          label: "Base contract",
        },
      ],
    });

    expect(mocks.fetch).toHaveBeenCalledWith(
      "/api/v1/intelligence/query/agent/query/stream",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "x-org-id": "org_test_123",
        }),
        body: expect.stringContaining('"contracts":[{"chain":"base-mainnet"'),
      })
    );
  });
});
