import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ExportRequestsPanel } from "./export-requests-panel";

const list = vi.fn();
const approve = vi.fn();
const reject = vi.fn();
vi.mock("../../export-requests.service", () => ({
  exportRequestsService: {
    list: (...a: unknown[]) => list(...a),
    approve: (...a: unknown[]) => approve(...a),
    reject: (...a: unknown[]) => reject(...a),
  },
}));
vi.mock("@/shared/hooks/client/use-my-org-role", () => ({
  useMyOrgRole: () => ({ role: "ADMIN", loading: false }),
}));
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (m: string) => toastError(m), success: vi.fn() },
}));

const pending = {
  threshold: 10000,
  requests: [
    {
      id: "cm1",
      status: "pending_approval",
      format: "csv",
      estimatedRows: 48210,
      createdAt: "2026-11-22T10:00:00Z",
      decisionReason: null,
      ip: null,
    },
  ],
};

const renderIt = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ExportRequestsPanel />
    </QueryClientProvider>
  );

describe("ExportRequestsPanel", () => {
  beforeEach(() => {
    list.mockReset();
    approve.mockReset();
    reject.mockReset();
    toastError.mockReset();
  });

  it("lists waiting exports and approves one", async () => {
    list.mockResolvedValue(pending);
    approve.mockResolvedValue({
      approvalId: "cm1",
      status: "approved",
      jobId: "j",
      state: "queued",
    });
    renderIt();
    expect(await screen.findByText(/48,210 contacts/)).toBeInTheDocument();
    expect(list).toHaveBeenCalledWith("pending");
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(approve).toHaveBeenCalledWith("cm1"));
  });

  it("says you can't approve your own export", async () => {
    list.mockResolvedValue(pending);
    approve.mockRejectedValue(
      Object.assign(new Error("x"), {
        status: 403,
        code: "EXPORT_SELF_APPROVAL",
      })
    );
    renderIt();
    fireEvent.click(await screen.findByRole("button", { name: "Approve" }));
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "You can't approve your own export. Another owner or admin has to."
      )
    );
  });

  it("rejects with a reason", async () => {
    list.mockResolvedValue(pending);
    reject.mockResolvedValue({ approvalId: "cm1", status: "rejected" });
    renderIt();
    fireEvent.click(await screen.findByRole("button", { name: "Reject" }));
    fireEvent.change(screen.getByLabelText(/Reason for rejecting/), {
      target: { value: "Not needed" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reject export" }));
    await waitFor(() =>
      expect(reject).toHaveBeenCalledWith("cm1", "Not needed")
    );
  });

  it("shows an empty state", async () => {
    list.mockResolvedValue({ threshold: 10000, requests: [] });
    renderIt();
    expect(
      await screen.findByText("No exports are waiting for approval.")
    ).toBeInTheDocument();
  });
});
