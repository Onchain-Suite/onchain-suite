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

  it("shows the summary and the exact args that will run", () => {
    render(<ProposedActionCard action={action} />);
    expect(screen.getByText(action.summary)).toBeInTheDocument();
    expect(screen.getByText("play_winback")).toBeInTheDocument();
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
