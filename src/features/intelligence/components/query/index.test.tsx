import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { QueryTab } from "./index";

const mocks = vi.hoisted(() => ({
  intelligenceService: {
    getSchema: vi.fn(),
    getQueryHistory: vi.fn(),
    getQueryStarters: vi.fn(),
    listQueryProtocols: vi.fn(),
    getAgentCatalog: vi.fn(),
    getAgentTools: vi.fn(),
    getAgentResources: vi.fn(),
    readAgentResource: vi.fn(),
    planAgent: vi.fn(),
    streamAgentQuery: vi.fn(),
    getQuerySuggestionsAnalytics: vi.fn(),
    validateQuery: vi.fn(),
    runQuery: vi.fn(),
    queryAgent: vi.fn(),
    getQuerySuggestions: vi.fn(),
    generateSql: vi.fn(),
    getQueryStatus: vi.fn(),
    getQueryResults: vi.fn(),
    getQuerySummary: vi.fn(),
    saveQuery: vi.fn(),
    createSegmentFromQuery: vi.fn(),
    createCampaignFromQuery: vi.fn(),
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  routerPush: vi.fn(),
}));

// The SQL results table is virtualized. jsdom gives the scroll container zero
// height, so @tanstack/react-virtual computes an empty range and renders no
// rows at all - every assertion about row content would fail for reasons that
// have nothing to do with the component. Render the full set instead.
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({
    count,
    estimateSize,
  }: {
    count: number;
    estimateSize?: () => number;
  }) => {
    const size = estimateSize?.() ?? 48;
    const items = Array.from({ length: count }, (_, index) => ({
      index,
      key: index,
      start: index * size,
      end: (index + 1) * size,
      size,
      lane: 0,
    }));
    return {
      getVirtualItems: () => items,
      getTotalSize: () => count * size,
      measureElement: () => undefined,
      scrollToIndex: () => undefined,
    };
  },
}));

vi.mock("sonner", () => ({
  toast: mocks.toast,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.routerPush,
    replace: vi.fn(),
  }),
  usePathname: () => "/intelligence",
  useSearchParams: () => new URLSearchParams(""),
}));

// The report layer has its own suite (report-view.test.tsx); stub it here so
// QueryTab tests don't pull recharts/html-to-image into jsdom.
vi.mock("./report-view", () => ({
  ReportView: ({ queryId }: { queryId: string }) => (
    <div data-testid="report-view" data-query-id={queryId} />
  ),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children?: ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock("@/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock("@/ui/popover", () => ({
  Popover: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({
    children,
  }: {
    children?: ReactNode;
    asChild?: boolean;
  }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/ui/tooltip", () => ({
  Tooltip: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({
    children,
  }: {
    children?: ReactNode;
    asChild?: boolean;
  }) => <div>{children}</div>,
  TooltipContent: ({
    children,
  }: {
    children?: ReactNode;
    sideOffset?: number;
  }) => <div>{children}</div>,
}));

vi.mock("@/ui/dialog", () => ({
  Dialog: ({
    open,
    children,
  }: {
    open?: boolean;
    children?: ReactNode;
    onOpenChange?: (open: boolean) => void;
  }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("../../intelligence.service", () => ({
  intelligenceService: mocks.intelligenceService,
}));

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

const renderQueryTab = (
  props?: Partial<React.ComponentProps<typeof QueryTab>>
) => {
  const queryClient = createQueryClient();
  const openEmailComposer = vi.fn();
  const setActiveTab = vi.fn();

  render(
    <QueryClientProvider client={queryClient}>
      <QueryTab
        activeSurface={props?.activeSurface ?? "sql"}
        openEmailComposer={props?.openEmailComposer ?? openEmailComposer}
        setActiveTab={props?.setActiveTab ?? setActiveTab}
      />
    </QueryClientProvider>
  );

  return {
    queryClient,
    openEmailComposer,
    setActiveTab,
  };
};

describe("QueryTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.intelligenceService.getSchema.mockResolvedValue({
      tables: [{ name: "users" }],
    });
    mocks.intelligenceService.getQueryHistory.mockResolvedValue([]);
    mocks.intelligenceService.getQueryStarters.mockResolvedValue({
      items: [
        {
          id: "starter_1",
          title: "Dormant users",
          description: "Find users inactive for 30 days",
          category: "Lifecycle",
          tags: ["winback"],
          query:
            "SELECT wallet, email FROM users WHERE last_active_days_ago > 30;",
        },
      ],
    });
    mocks.intelligenceService.listQueryProtocols.mockResolvedValue({
      items: [],
    });
    mocks.intelligenceService.getAgentCatalog.mockResolvedValue({
      tools: [{ name: "multichain_balances" }],
      resources: [{ uri: "config://supported-chains" }],
    });
    mocks.intelligenceService.getAgentTools.mockResolvedValue({
      items: [{ name: "multichain_balances", title: "Multichain balances" }],
    });
    mocks.intelligenceService.getAgentResources.mockResolvedValue({
      items: [
        { uri: "config://supported-chains", title: "Supported Chains" },
        { uri: "registry://protocols", title: "Protocol Registry" },
      ],
    });
    mocks.intelligenceService.readAgentResource.mockResolvedValue({
      parsedText: {
        chains: ["eth-mainnet", "solana-mainnet"],
      },
    });
    mocks.intelligenceService.planAgent.mockResolvedValue({
      requestedChains: ["eth-mainnet", "base-mainnet", "solana-mainnet"],
      execution: { mode: "dynamic_agent" },
    });
    mocks.intelligenceService.streamAgentQuery.mockResolvedValue(undefined);
    mocks.intelligenceService.getQuerySuggestionsAnalytics.mockResolvedValue({
      totals: {},
      topProtocols: [],
    });
    mocks.intelligenceService.validateQuery.mockResolvedValue({
      valid: true,
      suggestions: ["Looks good"],
    });
    mocks.intelligenceService.runQuery.mockResolvedValue({
      queryId: "query_123",
      status: "running",
      columns: [
        { name: "wallet" },
        { name: "email" },
        { name: "engagement_score" },
      ],
    });
    mocks.intelligenceService.getQueryStatus.mockResolvedValue({
      queryId: "query_123",
      status: "completed",
    });
    mocks.intelligenceService.getQueryResults.mockResolvedValue({
      rows: [
        {
          wallet: "0xabc",
          email: "holder@example.com",
          engagement_score: 97,
        },
      ],
      total: 1,
    });
    mocks.intelligenceService.getQuerySummary.mockResolvedValue({
      summary: "1 high-value row",
      winbackPotential: "High",
      score: 92,
    });
    mocks.intelligenceService.getQuerySuggestions.mockResolvedValue({
      suggestions: [
        {
          id: "idea_1",
          title: "Whales at risk",
          reason: "Targets high-value inactive users",
          tags: ["vip", "winback"],
          sqlDraft: "SELECT wallet FROM users WHERE engagement_score > 80;",
        },
      ],
    });
    mocks.intelligenceService.queryAgent.mockResolvedValue({
      status: "answered",
      answer: "No agent response needed for this SQL test.",
    });
    mocks.intelligenceService.generateSql.mockResolvedValue({
      sql: "SELECT wallet, email FROM users WHERE engagement_score > 80;",
      explanation: "Targets users with strong engagement.",
      warnings: ["Review the threshold before running."],
    });
    mocks.intelligenceService.saveQuery.mockResolvedValue({ success: true });
    mocks.intelligenceService.createSegmentFromQuery.mockResolvedValue({
      segmentId: "segment_123",
      profileCount: 42,
      contactsCreated: 7,
    });
    mocks.intelligenceService.createCampaignFromQuery.mockResolvedValue({
      campaignId: "campaign_123",
    });
  });

  it("runs a query, renders backend results, and forwards email actions", async () => {
    const { openEmailComposer } = renderQueryTab();

    fireEvent.change(screen.getByLabelText("SQL query editor"), {
      target: { value: "SELECT wallet, email FROM users LIMIT 1;" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run/i }));

    await waitFor(() => {
      expect(mocks.intelligenceService.runQuery).toHaveBeenCalledTimes(1);
    });

    await screen.findByText("1 results");
    expect(screen.getByText("holder@example.com")).toBeInTheDocument();
    expect(screen.getByText("0xabc")).toBeInTheDocument();
    expect(screen.getByText(/Win-back potential:/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /email/i }));

    expect(openEmailComposer).toHaveBeenCalledWith({
      email: "holder@example.com",
    });
  });

  it("saves a report from query results through the backend service", async () => {
    const { setActiveTab } = renderQueryTab();

    fireEvent.change(screen.getByLabelText("SQL query editor"), {
      target: { value: "SELECT wallet, email FROM users LIMIT 1;" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run/i }));
    await screen.findByRole("button", { name: /save report/i });

    fireEvent.click(screen.getByRole("button", { name: /save report/i }));
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "Whales To Re-engage" },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(mocks.intelligenceService.saveQuery).toHaveBeenCalledWith(
        "query_123",
        { name: "Whales To Re-engage" }
      );
    });

    expect(mocks.toast.success).toHaveBeenCalledWith("Report saved");
    expect(setActiveTab).toHaveBeenCalledWith("reports");
  });

  it("does not render the report view inline - reports live in the Reports tab", async () => {
    renderQueryTab();

    fireEvent.change(screen.getByLabelText("SQL query editor"), {
      target: { value: "SELECT wallet, email FROM users LIMIT 1;" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run/i }));

    await screen.findByRole("button", { name: /create segment/i });
    expect(screen.queryByTestId("report-view")).not.toBeInTheDocument();
  });

  it("creates a segment and shows the confirmation with counts and links", async () => {
    const { setActiveTab } = renderQueryTab();

    fireEvent.change(screen.getByLabelText("SQL query editor"), {
      target: { value: "SELECT wallet, email FROM users LIMIT 1;" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run/i }));
    await screen.findByRole("button", { name: /create segment/i });

    fireEvent.click(screen.getByRole("button", { name: /create segment/i }));
    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "Whale Wallets" },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(
        mocks.intelligenceService.createSegmentFromQuery
      ).toHaveBeenCalledWith({ queryId: "query_123", name: "Whale Wallets" });
    });

    // Confirmation dialog with real counts from the backend response.
    await screen.findByText("Segment created");
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /view segment/i }));
    expect(setActiveTab).toHaveBeenCalledWith("segments");
    expect(mocks.routerPush).toHaveBeenCalledWith(
      "/intelligence/segments/detail/segment_123"
    );

    // No auto-redirect before the user picks a destination.
    expect(mocks.routerPush).toHaveBeenCalledTimes(1);
  });

  it("loads starter queries into the editor via the AI assistant", async () => {
    renderQueryTab();

    fireEvent.click(screen.getByRole("button", { name: /AI SQL assistant/i }));
    fireEvent.click(
      await screen.findByRole("button", { name: /Dormant users/i })
    );

    expect(screen.getByLabelText("SQL query editor")).toHaveValue(
      "SELECT wallet, email FROM users WHERE last_active_days_ago > 30;"
    );
  });

  it("generates SQL from a prompt and applies it to the editor", async () => {
    renderQueryTab();

    fireEvent.click(screen.getByRole("button", { name: /AI SQL assistant/i }));
    fireEvent.change(
      await screen.findByPlaceholderText(/Find dormant high-value wallets/i),
      {
        target: { value: "Find high-value inactive users" },
      }
    );
    fireEvent.click(screen.getByRole("button", { name: /^Generate SQL$/i }));

    await screen.findByRole("button", { name: /use this sql/i });
    expect(mocks.intelligenceService.generateSql).toHaveBeenCalledWith({
      prompt: "Find high-value inactive users",
      mode: "best",
    });

    fireEvent.click(screen.getByRole("button", { name: /use this sql/i }));

    expect(screen.getByLabelText("SQL query editor")).toHaveValue(
      "SELECT wallet, email FROM users WHERE engagement_score > 80;"
    );
  });

  it("surfaces generate input and starter queries together in the AI assistant", async () => {
    renderQueryTab();

    fireEvent.click(screen.getByRole("button", { name: /AI SQL assistant/i }));

    expect(
      await screen.findByPlaceholderText(/Find dormant high-value wallets/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Generate SQL$/i })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /Dormant users/i })
    ).toBeInTheDocument();
  });

  it("opens the default chat workspace without eagerly loading agent metadata", async () => {
    renderQueryTab({ activeSurface: "chat" });

    expect(
      await screen.findByLabelText("Ask the on-chain agent")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Send$/i })).toBeInTheDocument();
    expect(screen.queryByText(/Live agent activity/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Live tools/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Live resources/i)).not.toBeInTheDocument();
    // The chain picker was removed - chat is fixed to DEFAULT_MCP_CHAINS - so
    // neither the picker nor its coverage summary should render.
    expect(screen.queryByText(/Supported chains/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText("Ethereum, Base, Arbitrum +3")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        /Find the most active wallets interacting across Ethereum, Base, and Solana this week/i
      )
    ).not.toBeInTheDocument();
    expect(mocks.intelligenceService.getAgentCatalog).not.toHaveBeenCalled();
    expect(mocks.intelligenceService.getAgentTools).not.toHaveBeenCalled();
    expect(mocks.intelligenceService.getAgentResources).not.toHaveBeenCalled();
    expect(mocks.intelligenceService.readAgentResource).not.toHaveBeenCalled();
  });

  it("submits the current prompt and falls back to the durable agent query when streaming times out", async () => {
    mocks.intelligenceService.streamAgentQuery.mockImplementationOnce(
      async (
        _body: { prompt?: string },
        options?: {
          onEvent?: (event: { type?: string; data?: unknown }) => void;
        }
      ) => {
        options?.onEvent?.({
          type: "started",
          data: {
            conversationId: "conv_123",
            message: "Alchemy agent started",
          },
        });
        throw new Error(
          "Alchemy agent session startup timed out after 15000ms"
        );
      }
    );
    mocks.intelligenceService.queryAgent.mockResolvedValueOnce({
      conversationId: "conv_123",
      status: "answered",
      answer: "Answer for Find the top wallets on this token",
      rationale:
        "Used the durable agent conversation endpoint after stream recovery.",
    });

    renderQueryTab({ activeSurface: "chat" });

    fireEvent.change(screen.getByLabelText("Ask the on-chain agent"), {
      target: { value: "Find the top wallets on this token" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Send$/i }));

    await waitFor(() => {
      expect(mocks.intelligenceService.streamAgentQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Find the top wallets on this token",
          prompt: "Find the top wallets on this token",
        }),
        expect.any(Object)
      );
    });

    // Assert the request payload rather than the full call signature -
    // queryAgent takes (body, orgId?, options?), and the extra args
    // (abort signal, timeout) are not what this test is about.
    await waitFor(() => {
      expect(mocks.intelligenceService.queryAgent).toHaveBeenCalled();
      expect(mocks.intelligenceService.queryAgent.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          conversationId: undefined,
          message: "Find the top wallets on this token",
          prompt: "Find the top wallets on this token",
        })
      );
    });

    expect(
      (
        await screen.findAllByText(
          "Answer for Find the top wallets on this token"
        )
      ).length
    ).toBeGreaterThan(0);
    expect(
      screen.queryByText(
        /Alchemy agent session startup timed out after 15000ms/i
      )
    ).not.toBeInTheDocument();
  });

  it("shows a copyable bug report when the agent query fails", async () => {
    mocks.intelligenceService.streamAgentQuery.mockImplementationOnce(
      async (
        _body: { prompt?: string },
        options?: {
          onEvent?: (event: { type?: string; data?: unknown }) => void;
        }
      ) => {
        options?.onEvent?.({
          type: "started",
          data: {
            conversationId: "conv_bug_123",
            message: "Alchemy agent started",
          },
        });
        throw new Error(
          "Alchemy agent session startup timed out after 15000ms"
        );
      }
    );
    mocks.intelligenceService.queryAgent.mockRejectedValueOnce({
      message: "Upstream Alchemy query failed",
      response: {
        status: 502,
        data: {
          requestId: "req_bug_123",
          message: "Upstream Alchemy query failed",
        },
      },
    });

    renderQueryTab({ activeSurface: "chat" });

    fireEvent.change(screen.getByLabelText("Ask the on-chain agent"), {
      target: { value: "Find the top wallets on this token" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Send$/i }));

    expect(
      await screen.findByText(
        /I couldn't complete that request\. Please try again or refine the prompt\./i
      )
    ).toBeInTheDocument();
    expect(await screen.findByText(/Bug report/i)).toBeInTheDocument();
    expect(screen.getByText("502")).toBeInTheDocument();
    expect(screen.getByText("req_bug_123")).toBeInTheDocument();
    expect(
      screen.getAllByText(/Upstream Alchemy query failed/i).length
    ).toBeGreaterThan(0);
  });

  it("surfaces actionable guidance (not a raw bug dump) when the agent isn't configured", async () => {
    mocks.intelligenceService.queryAgent.mockRejectedValueOnce({
      message: "GoldRush MCP is not configured",
      response: {
        status: 400,
        data: { message: "GoldRush MCP is not configured" },
      },
    });

    renderQueryTab({ activeSurface: "chat" });

    fireEvent.change(screen.getByLabelText("Ask the on-chain agent"), {
      target: { value: "Top holders of this token" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Send$/i }));

    // The main answer leads with the actionable guidance...
    expect(
      await screen.findByText(
        /on-chain agent isn't enabled on this backend environment yet/i
      )
    ).toBeInTheDocument();
    // ...not the generic fallback line.
    expect(
      screen.queryByText(
        /I couldn't complete that request\. Please try again or refine the prompt\./i
      )
    ).not.toBeInTheDocument();
    // The raw backend text is still available in the collapsible bug report.
    expect(
      screen.getAllByText(/GoldRush MCP is not configured/i).length
    ).toBeGreaterThan(0);
  });

  it("streams the answer into the thinking bubble while the durable query is in flight", async () => {
    let resolveQuery: (value: unknown) => void = () => {};
    mocks.intelligenceService.queryAgent.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveQuery = resolve;
      })
    );
    mocks.intelligenceService.streamAgentQuery.mockImplementationOnce(
      async (
        _body: { prompt?: string },
        options?: {
          onEvent?: (event: { type?: string; data?: unknown }) => void;
        }
      ) => {
        options?.onEvent?.({ type: "answer_token", data: { token: "Top " } });
        options?.onEvent?.({
          type: "answer_token",
          data: { token: "holders." },
        });
      }
    );

    renderQueryTab({ activeSurface: "chat" });
    fireEvent.change(screen.getByLabelText("Ask the on-chain agent"), {
      target: { value: "Top holders of this token" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Send$/i }));

    // The answer types out in the thinking bubble before the durable query
    // resolves, and answer tokens never appear as raw "answer_token" steps.
    expect(await screen.findByText(/Top holders\./i)).toBeInTheDocument();
    expect(screen.queryByText(/answer[_ ]?token/i)).not.toBeInTheDocument();

    await act(async () => {
      resolveQuery({
        status: "answered",
        answer: "Top holders.",
        conversationId: "conv_stream",
      });
    });
  });

  it("renders token holder structured results with the deterministic agent renderer", async () => {
    mocks.intelligenceService.queryAgent.mockResolvedValueOnce({
      conversationId: "conv_holders",
      status: "answered",
      answer: "Here are the biggest holders right now.",
      structuredResult: {
        kind: "token_holders",
        title: "Top token holders",
        rows: [
          {
            holder: "Treasury Alpha",
            balance: 1250000,
            share: 0.52,
            chain: "Base",
          },
          {
            holder: "Whale Beta",
            balance: 760000,
            share: 0.21,
            chain: "Ethereum",
          },
        ],
      },
    });

    renderQueryTab({ activeSurface: "chat" });

    fireEvent.change(screen.getByLabelText("Ask the on-chain agent"), {
      target: { value: "Show me the biggest holders" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Send$/i }));

    expect(await screen.findByText("Top token holders")).toBeInTheDocument();
    expect(screen.getByText("Ranked holders")).toBeInTheDocument();
    expect(screen.getAllByText("Treasury Alpha").length).toBeGreaterThan(0);
    expect(screen.getByText("52.0%")).toBeInTheDocument();
  });

  it("renders wallet balance structured results as balance cards", async () => {
    mocks.intelligenceService.queryAgent.mockResolvedValueOnce({
      conversationId: "conv_balances",
      status: "answered",
      structuredResult: {
        kind: "wallet_balances",
        title: "Wallet balances",
        rows: [
          {
            symbol: "ETH",
            balance: "12.45",
            value_usd: 31250,
            chain: "Ethereum",
          },
          { symbol: "USDC", balance: "40000", value_usd: 40000, chain: "Base" },
        ],
      },
    });

    renderQueryTab({ activeSurface: "chat" });

    fireEvent.change(screen.getByLabelText("Ask the on-chain agent"), {
      target: { value: "Show wallet balances" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Send$/i }));

    expect(await screen.findByText("Wallet balances")).toBeInTheDocument();
    expect(screen.getAllByText("Balance").length).toBeGreaterThan(0);
    expect(screen.getAllByText("USDC").length).toBeGreaterThan(0);
    expect(screen.getByText("$40,000")).toBeInTheDocument();
  });

  it("renders transaction structured results as a transaction list", async () => {
    mocks.intelligenceService.queryAgent.mockResolvedValueOnce({
      conversationId: "conv_transactions",
      status: "answered",
      structuredResult: {
        kind: "transactions",
        title: "Recent transactions",
        rows: [
          {
            method: "Swap",
            hash: "0x12345678",
            from: "Treasury Alpha",
            to: "Pool 42",
            value_usd: 18250,
            chain: "Base",
            timestamp: "2026-06-20T12:00:00.000Z",
          },
        ],
      },
    });

    renderQueryTab({ activeSurface: "chat" });

    fireEvent.change(screen.getByLabelText("Ask the on-chain agent"), {
      target: { value: "Show me recent transactions" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Send$/i }));

    expect(await screen.findByText("Recent transactions")).toBeInTheDocument();
    expect(screen.getAllByText("Swap").length).toBeGreaterThan(0);
    expect(screen.getByText("Treasury Alpha")).toBeInTheDocument();
    expect(screen.getByText("Pool 42")).toBeInTheDocument();
  });

  it("renders gas price structured results as fee cards", async () => {
    mocks.intelligenceService.queryAgent.mockResolvedValueOnce({
      conversationId: "conv_gas",
      status: "answered",
      structuredResult: {
        kind: "gas_prices",
        title: "Network gas prices",
        rows: [
          {
            chain: "Ethereum",
            slow: "12 gwei",
            standard: "16 gwei",
            fast: "21 gwei",
            base_fee: "14 gwei",
          },
        ],
      },
    });

    renderQueryTab({ activeSurface: "chat" });

    fireEvent.change(screen.getByLabelText("Ask the on-chain agent"), {
      target: { value: "Show gas prices" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Send$/i }));

    expect(await screen.findByText("Network gas prices")).toBeInTheDocument();
    expect(screen.getAllByText("Ethereum").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Fast").length).toBeGreaterThan(0);
    expect(screen.getByText("21 gwei")).toBeInTheDocument();
  });

  it("renders clarification questions and keeps the same conversation for follow-up replies", async () => {
    mocks.intelligenceService.queryAgent
      .mockResolvedValueOnce({
        conversationId: "conv_clarify",
        status: "needs_clarification",
        question: "Which chain should I check?",
      })
      .mockResolvedValueOnce({
        conversationId: "conv_clarify",
        status: "answered",
        answer: "I'll use Base for this thread.",
      });

    renderQueryTab({ activeSurface: "chat" });

    fireEvent.change(screen.getByLabelText("Ask the on-chain agent"), {
      target: { value: "Find the top holders" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Send$/i }));

    expect(
      await screen.findByText("Which chain should I check?")
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Ask the on-chain agent"), {
      target: { value: "Base" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Send$/i }));

    await waitFor(() => {
      const { calls } = mocks.intelligenceService.queryAgent.mock;
      expect(calls.length).toBeGreaterThan(0);
      // Payload only - the (body, orgId?, options?) tail is incidental here.
      expect(calls[calls.length - 1][0]).toEqual(
        expect.objectContaining({
          conversationId: "conv_clarify",
          message: "Base",
          prompt: "Base",
        })
      );
    });

    expect(
      await screen.findByText("I'll use Base for this thread.")
    ).toBeInTheDocument();
  });
});
