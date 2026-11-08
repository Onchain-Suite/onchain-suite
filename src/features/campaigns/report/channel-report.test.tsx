import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  channelReportService,
  toChannelReport,
  toRealAccounts,
} from "./channel-report.service";
import { ChannelReportSection, rowLabel } from "./channel-report-section";

vi.mock("./channel-report.service", async (orig) => {
  const mod = await orig<Record<string, unknown>>();
  return {
    ...mod,
    channelReportService: { report: vi.fn(), realAccounts: vi.fn() },
  };
});

const report = vi.mocked(channelReportService.report);
const real = vi.mocked(channelReportService.realAccounts);

const telegramRow = toChannelReport({
  channels: [
    {
      channel: "telegram",
      delivery: "dm",
      sent: 4000,
      delivered: {
        value: null,
        note: "Telegram doesn't report delivery. Sent means Telegram accepted the message.",
      },
      failed: 30,
      bounced: { value: null },
      unsubscribed: { value: 22 },
      opened: {
        value: null,
        note: "Telegram doesn't report whether a message was read.",
      },
      clicked: { value: 310 },
      reach: { value: null },
      rates: { delivery: null, open: null, click: 7.8, unsubscribe: 0.6 },
    },
  ],
});

const renderSection = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <ChannelReportSection
        campaignId="c1"
        analytics={undefined}
        channels={{ email: false, inapp: false }}
        loading={false}
        error={false}
        onRetry={vi.fn()}
      />
    </QueryClientProvider>
  );
};

describe("ChannelReportSection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows what Telegram reports and a dash with the reason for what it doesn't", async () => {
    report.mockResolvedValue(telegramRow);
    real.mockResolvedValue(
      toRealAccounts({
        channels: [
          {
            channel: "telegram",
            total: 4000,
            scored: 4000,
            likelyReal: 2610,
            unclear: 1105,
            likelyFake: 285,
            fakeReasons: [
              { reason: "Wallet first active under 30 days ago", count: 240 },
            ],
          },
        ],
      })
    );
    renderSection();
    expect(await screen.findByText("Telegram DMs")).toBeInTheDocument();
    expect(screen.getByText("4,000")).toBeInTheDocument();
    expect(screen.getByText("310")).toBeInTheDocument();
    expect(screen.getByText("7.8%")).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        "Not available: Telegram doesn't report whether a message was read."
      )
    ).toBeInTheDocument();
    expect(await screen.findByText("2,610 real")).toBeInTheDocument();
    expect(screen.queryByText("0.0%")).not.toBeInTheDocument();
  });

  it("falls back to the email / in-app table on a server without the report", async () => {
    report.mockRejectedValue(new Error("not deployed"));
    real.mockRejectedValue(new Error("not deployed"));
    renderSection();
    expect(
      await screen.findByText("No channel analytics yet.")
    ).toBeInTheDocument();
  });
});

describe("report normalisers", () => {
  it("drops junk rows and keeps notes", () => {
    expect(
      toChannelReport({ channels: [{ channel: "sms" }, telegramRow[0], 5] })
    ).toHaveLength(1);
    expect(telegramRow[0].opened.note).toMatch(/whether a message was read/);
  });

  it("labels each delivery type", () => {
    expect(rowLabel({ channel: "x", delivery: "post" })).toBe("X posts");
    expect(rowLabel({ channel: "telegram", delivery: "channel_post" })).toBe(
      "Telegram channel"
    );
    expect(rowLabel({ channel: "farcaster", delivery: "notification" })).toBe(
      "Farcaster notifications"
    );
    expect(rowLabel({ channel: "sms", delivery: "message" })).toBe("SMS");
  });
});
