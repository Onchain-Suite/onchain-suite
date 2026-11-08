import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DmConsentDialog, humanDuration } from "./dm-consent-dialog";
import { type DmPreflight, dmSendService } from "./dm-send.service";

vi.mock("./dm-send.service", () => ({
  dmSendService: { preflight: vi.fn(), launch: vi.fn() },
}));

const preflight = vi.mocked(dmSendService.preflight);
const launch = vi.mocked(dmSendService.launch);

const STATEMENTS = [
  "All 1,000 people in this send sent our X account a direct message before this one.",
  "I understand that sending to anyone who did not can get us banned: x can suspend your x developer app.",
  "I understand X limits how fast this goes out, so it will take about 17 hours. X bills our own account about $15.00 for it.",
  "We are responsible for who receives this send.",
];

const xPreflight = (
  over: Partial<DmPreflight["consent"]> = {},
  reachable = 1000
): DmPreflight => ({
  channel: "x",
  reachable,
  estimatedDurationSeconds: 60_000,
  cost: {
    provider: "X API",
    usdPerMessage: 0.015,
    estimatedUsd: 15,
    billedTo: "client",
  },
  consent: {
    version: "x-dm-2026-11-07",
    platform: "X",
    rule: "X's Developer Guidelines allow automated DMs only to people who sent your account a DM first.",
    risk: "X can suspend your X developer app and your X account.",
    policyUrl: "https://docs.x.com/developer-guidelines",
    statements: STATEMENTS,
    accepted: false,
    ...over,
  },
});

const renderDialog = (onQueued = vi.fn()) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <DmConsentDialog
        open
        campaignId="c1"
        channel="x"
        onOpenChange={vi.fn()}
        onQueued={onQueued}
      />
    </QueryClientProvider>
  );
  return { onQueued };
};

describe("DmConsentDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the rule, the ban risk and this send's reach, time and cost", async () => {
    preflight.mockResolvedValue(xPreflight());
    renderDialog();
    expect(
      await screen.findByText("Send X DMs to 1,000 people?")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /allow automated DMs only to people who sent your account a DM first/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText("X can suspend your X developer app and your X account.")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Read X's rule" })).toHaveAttribute(
      "href",
      "https://docs.x.com/developer-guidelines"
    );
    expect(screen.getByText("about 17 hours")).toBeInTheDocument();
    expect(screen.getByText("$15.00 to your X account")).toBeInTheDocument();
  });

  it("keeps Send disabled until every statement is ticked, then sends the version", async () => {
    preflight.mockResolvedValue(xPreflight());
    launch.mockResolvedValue({ status: "queued" });
    const { onQueued } = renderDialog();
    await screen.findByText("Send X DMs to 1,000 people?");
    const send = screen.getByRole("button", { name: "Send DMs" });
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(4);
    for (const box of boxes.slice(0, 3)) fireEvent.click(box);
    expect(send).toBeDisabled();
    fireEvent.click(boxes[3]);
    expect(send).toBeEnabled();
    fireEvent.click(send);
    await waitFor(() =>
      expect(launch).toHaveBeenCalledWith("c1", "x", "x-dm-2026-11-07")
    );
    await waitFor(() => expect(onQueued).toHaveBeenCalled());
  });

  it("won't send to an audience nobody in which can be reached", async () => {
    preflight.mockResolvedValue(xPreflight({}, 0));
    renderDialog();
    expect(
      await screen.findByText(/Nobody in this audience can be reached on X yet/)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send DMs" })).toBeDisabled();
  });

  it("resumes an already-accepted send without asking again", async () => {
    preflight.mockResolvedValue(xPreflight({ accepted: true }));
    renderDialog();
    expect(
      await screen.findByRole("button", { name: "Resume send" })
    ).toBeEnabled();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("says why when the rules can't be loaded, and stays blocked", async () => {
    preflight.mockRejectedValue(
      new Error("Bulk DM sending isn't available on this server yet.")
    );
    renderDialog();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "isn't available on this server yet"
    );
    expect(screen.getByRole("button", { name: "Send DMs" })).toBeDisabled();
  });
});

describe("humanDuration", () => {
  it("rounds to the unit a person plans around", () => {
    expect(humanDuration(60)).toBe("about a minute");
    expect(humanDuration(4000)).toBe("about 67 minutes");
    expect(humanDuration(71 * 86_400)).toBe("about 71 days");
    expect(humanDuration(Number.NaN)).toBe("about a minute");
  });
});
