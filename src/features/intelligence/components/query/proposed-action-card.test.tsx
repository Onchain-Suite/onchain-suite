import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProposedActionCard } from "./proposed-action-card";

const mocks = vi.hoisted(() => ({
  intelligenceService: { runIntelligenceTool: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/features/intelligence/intelligence.service", () => ({
  intelligenceService: mocks.intelligenceService,
}));

vi.mock("sonner", () => ({ toast: mocks.toast }));

const action = {
  proposed: true as const,
  tool: "apply_play",
  summary: 'Would fork Play "Win-back" into a new draft automation.',
  args: { templateId: "play_winback", name: "Win-back" },
};

describe("ProposedActionCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("humanizes internal template/segment ids in the args and the summary", () => {
    const campaignAction = {
      proposed: true as const,
      tool: "create_campaign_from_segment",
      summary:
        'Would create a campaign using template "sys_tpl_product_update" for the chosen segment.',
      args: {
        emailTemplateId: "sys_tpl_product_update",
        segmentQuery: "retention-engaged-but-inactive",
        name: "MindNest Launch",
      },
    };
    render(<ProposedActionCard action={campaignAction} />);

    // No raw internal ids anywhere.
    expect(
      screen.queryByText(/sys_tpl_product_update/)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/retention-engaged-but-inactive/)
    ).not.toBeInTheDocument();
    // Friendly labels + values instead.
    expect(screen.getByText("Template")).toBeInTheDocument();
    expect(screen.getByText("Product Update")).toBeInTheDocument();
    expect(screen.getByText("Audience")).toBeInTheDocument();
    expect(screen.getByText("Engaged But Inactive")).toBeInTheDocument();
    // The summary reads naturally too.
    expect(screen.getByText(/"Product Update"/)).toBeInTheDocument();
  });

  it("shows the summary and the exact args that will run", () => {
    render(<ProposedActionCard action={action} />);
    expect(screen.getByText(action.summary)).toBeInTheDocument();
    // The internal template id is humanized, never shown raw.
    expect(screen.getByText("Play Winback")).toBeInTheDocument();
    expect(screen.queryByText("play_winback")).not.toBeInTheDocument();
    expect(screen.getByText("Win-back")).toBeInTheDocument();
    // Nothing has run yet.
    expect(
      mocks.intelligenceService.runIntelligenceTool
    ).not.toHaveBeenCalled();
  });

  it("executes the approved tool with confirm:true on approve", async () => {
    mocks.intelligenceService.runIntelligenceTool.mockResolvedValueOnce({
      automation: { id: "auto_1", name: "Win-back" },
    });
    render(<ProposedActionCard action={action} />);

    fireEvent.click(screen.getByRole("button", { name: /approve & run/i }));

    await waitFor(() =>
      expect(
        mocks.intelligenceService.runIntelligenceTool
      ).toHaveBeenCalledWith({
        tool: "apply_play",
        args: { templateId: "play_winback", name: "Win-back", confirm: true },
      })
    );
    expect(await screen.findByText(/Created "Win-back"/)).toBeInTheDocument();
    expect(mocks.toast.success).toHaveBeenCalled();
  });

  it("shows an 'Open in campaign builder' link after a campaign is created", async () => {
    const campaignAction = {
      proposed: true as const,
      tool: "create_campaign_from_segment",
      summary: "Would create a campaign for the chosen segment.",
      args: {
        emailTemplateId: "sys_tpl_product_update",
        segmentQuery: "retention-engaged-but-inactive",
        name: "MindNest Launch",
      },
    };
    mocks.intelligenceService.runIntelligenceTool.mockResolvedValueOnce({
      campaign: { id: "camp_1", name: "MindNest Launch" },
      url: "/campaigns/camp_1",
    });
    render(<ProposedActionCard action={campaignAction} />);

    fireEvent.click(screen.getByRole("button", { name: /approve & run/i }));

    const link = await screen.findByRole("link", {
      name: /open in campaign builder/i,
    });
    expect(link).toHaveAttribute("href", "/campaigns/camp_1");
    expect(screen.getByText(/Created "MindNest Launch"/)).toBeInTheDocument();
  });

  it("does not execute anything on decline", () => {
    render(<ProposedActionCard action={action} />);
    fireEvent.click(screen.getByRole("button", { name: /decline/i }));
    expect(
      mocks.intelligenceService.runIntelligenceTool
    ).not.toHaveBeenCalled();
    expect(screen.getByText(/Declined/)).toBeInTheDocument();
  });

  it("surfaces an error and allows a retry when the tool fails", async () => {
    mocks.intelligenceService.runIntelligenceTool.mockRejectedValueOnce(
      new Error("template not found")
    );
    render(<ProposedActionCard action={action} />);

    fireEvent.click(screen.getByRole("button", { name: /approve & run/i }));

    expect(await screen.findByText("template not found")).toBeInTheDocument();
    expect(mocks.toast.error).toHaveBeenCalled();
    // The gate is still open: a retry control is offered.
    expect(
      screen.getByRole("button", { name: /try again/i })
    ).toBeInTheDocument();
  });

  it("treats a still-proposed response as a failed confirm", async () => {
    mocks.intelligenceService.runIntelligenceTool.mockResolvedValueOnce({
      proposed: true,
      tool: "apply_play",
    });
    render(<ProposedActionCard action={action} />);

    fireEvent.click(screen.getByRole("button", { name: /approve & run/i }));

    expect(await screen.findByText(/was not confirmed/i)).toBeInTheDocument();
  });
});
