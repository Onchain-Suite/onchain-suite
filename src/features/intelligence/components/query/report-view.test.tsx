import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IntelligenceQueryReportDataResponse } from "../../intelligence.service";
import { ReportView } from "./report-view";

const mocks = vi.hoisted(() => ({
  intelligenceService: {
    getQueryReportData: vi.fn(),
    downloadQueryCsv: vi.fn(),
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  toPng: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: mocks.toast,
}));

vi.mock("../../intelligence.service", () => ({
  intelligenceService: mocks.intelligenceService,
}));

// Charts are recharts' concern - stub the primitives so jsdom only has to
// verify our composition (titles, actions, branding, table).
vi.mock("recharts", () => {
  const Stub = ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  );
  const Leaf = () => null;
  return {
    LineChart: Stub,
    BarChart: Stub,
    PieChart: Stub,
    Line: Leaf,
    Bar: Leaf,
    Pie: Stub,
    Cell: Leaf,
    XAxis: Leaf,
    YAxis: Leaf,
    CartesianGrid: Leaf,
  };
});

vi.mock("@/ui/chart", () => ({
  ChartContainer: ({ children }: { children?: ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

vi.mock("html-to-image", () => ({
  toPng: mocks.toPng,
}));

// jsdom measures the scroll element as 0×0, so the real virtualizer renders
// no rows; render every row instead (row counts here are tiny).
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        start: index * 41,
        end: (index + 1) * 41,
      })),
    getTotalSize: () => count * 41,
  }),
}));

const WALLET_A = "0x1234567890abcdef1234567890abcdef12345678";
const WALLET_B = "0xffffffffffffffffffffffffffffffffffffffff";

const reportFixture: IntelligenceQueryReportDataResponse = {
  queryId: "query_123",
  rowCount: 2,
  columns: [
    { key: "wallet", type: "wallet" },
    { key: "volume_usd", type: "number" },
    { key: "chain", type: "string" },
  ],
  table: {
    columns: ["wallet", "volume_usd", "chain"],
    rows: [
      { wallet: WALLET_A, volume_usd: 1200, chain: "base" },
      { wallet: WALLET_B, volume_usd: 300, chain: "eth" },
    ],
  },
  charts: [
    {
      type: "bar",
      title: "volume_usd by chain",
      xKey: "chain",
      yKey: "volume_usd",
      data: [
        { chain: "base", volume_usd: 1200 },
        { chain: "eth", volume_usd: 300 },
      ],
    },
    {
      type: "pie",
      title: "Share by chain",
      labelKey: "chain",
      valueKey: "count",
      data: [
        { chain: "base", count: 1 },
        { chain: "eth", count: 1 },
      ],
    },
  ],
  stats: [
    { key: "volume_usd", count: 2, sum: 1500, avg: 750, min: 300, max: 1200 },
  ],
};

const renderReportView = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ReportView queryId="query_123" />
    </QueryClientProvider>
  );
};

describe("ReportView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.intelligenceService.getQueryReportData.mockResolvedValue(
      reportFixture
    );
    mocks.intelligenceService.downloadQueryCsv.mockResolvedValue({
      blob: new Blob(["a,b\n1,2"], { type: "text/csv" }),
      filename: "onchainsuite-report-query_123.csv",
    });
    mocks.toPng.mockResolvedValue("data:image/png;base64,AAAA");
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  it("renders stat tiles, suggested charts, and branding from the report payload", async () => {
    renderReportView();

    expect(await screen.findByText("Report")).toBeInTheDocument();
    expect(mocks.intelligenceService.getQueryReportData).toHaveBeenCalledWith(
      "query_123"
    );
    expect(screen.getByText("2 rows")).toBeInTheDocument();

    // Stat tile for the numeric column (compact sum + avg/min/max). The label
    // also appears as a table header, so match on all occurrences.
    expect(screen.getAllByText("Volume Usd").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("1.5K")).toBeInTheDocument();
    expect(screen.getByText("Avg 750")).toBeInTheDocument();

    // One card per backend-suggested chart, each with the branding footer.
    expect(screen.getByText("Volume Usd By Chain")).toBeInTheDocument();
    expect(screen.getByText("Share By Chain")).toBeInTheDocument();
    expect(screen.getAllByTestId("chart-container")).toHaveLength(2);
    expect(screen.getAllByText("OnchainSuite")).toHaveLength(2);
  });

  it("shortens wallet cells and copies the full address on click", async () => {
    renderReportView();

    const walletButton = await screen.findByRole("button", {
      name: `Copy ${WALLET_A}`,
    });
    expect(walletButton).toHaveTextContent("0x123456…345678");

    fireEvent.click(walletButton);
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(WALLET_A);
    });
  });

  it("downloads the CSV export through the service", async () => {
    renderReportView();

    fireEvent.click(
      await screen.findByRole("button", { name: /download csv/i })
    );

    await waitFor(() => {
      expect(mocks.intelligenceService.downloadQueryCsv).toHaveBeenCalledWith(
        "query_123"
      );
    });
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("exports a chart card as a PNG image", async () => {
    renderReportView();

    const exportButtons = await screen.findAllByRole("button", {
      name: /export .* as image/i,
    });
    fireEvent.click(exportButtons[0]);

    await waitFor(() => {
      expect(mocks.toPng).toHaveBeenCalledTimes(1);
    });
  });

  it("surfaces a retry affordance when the report fails to build", async () => {
    mocks.intelligenceService.getQueryReportData.mockRejectedValue(
      new Error("boom")
    );
    renderReportView();

    expect(
      await screen.findByText(/couldn't build the report view/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i })
    ).toBeInTheDocument();
  });
});
