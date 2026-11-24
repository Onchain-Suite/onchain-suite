import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EmailDetail } from "../../contracts/emails";
import { DeveloperApiError } from "../../developer.service";
import { toLocalInputValue } from "../../utils/email-log";
import { EmailDetailSheet } from "./email-detail-sheet";

type Callbacks = { onSuccess?: () => void; onError?: (e: unknown) => void };

const state = vi.hoisted(() => ({
  detail: {} as Record<string, unknown>,
  reschedule: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock("../../hooks/use-email-log", () => ({
  useEmailDetail: () => state.detail,
  useEmailActions: () => ({
    reschedule: { mutate: state.reschedule, isPending: false },
    cancel: { mutate: state.cancel, isPending: false },
  }),
}));

const SCHEDULED: EmailDetail = {
  id: "em_1",
  environment: "live",
  from: "receipts@acme.xyz",
  subject: "Your receipt",
  created_at: "2026-11-24T10:00:00.000Z",
  status: "scheduled",
  scheduled_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  tags: [],
  recipients: [
    {
      id: "r1",
      kind: "to",
      address: "0x00000000000000000000000000000000000000aa",
      type: "wallet",
      status: "queued",
      last_event_at: null,
    },
  ],
  events: [],
};

const loaded = (data: EmailDetail) => ({
  data,
  isPending: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
});

const notScheduled = new DeveloperApiError("no longer scheduled", {
  status: 409,
  code: "EMAIL_NOT_SCHEDULED",
  details: { status: "queued" },
});

describe("EmailDetailSheet", () => {
  beforeEach(() => {
    state.reschedule.mockReset();
    state.cancel.mockReset();
  });

  it("shows a wallet recipient as the wallet", () => {
    state.detail = loaded(SCHEDULED);
    render(<EmailDetailSheet emailId="em_1" onClose={() => {}} />);
    expect(
      screen.getByText("0x00000000000000000000000000000000000000aa")
    ).toBeInTheDocument();
    expect(screen.getByText("Wallet")).toBeInTheDocument();
  });

  it("offers no actions once an email has left the schedule", () => {
    state.detail = loaded({ ...SCHEDULED, status: "delivered" });
    render(<EmailDetailSheet emailId="em_1" onClose={() => {}} />);
    expect(screen.queryByRole("button", { name: "Reschedule" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("cancels only after confirming", () => {
    state.detail = loaded(SCHEDULED);
    render(<EmailDetailSheet emailId="em_1" onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(state.cancel).not.toHaveBeenCalled();

    const dialog = screen.getByRole("dialog", {
      name: "Cancel this scheduled email?",
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Cancel email" })
    );
    expect(state.cancel).toHaveBeenCalledWith("em_1", expect.any(Object));
  });

  it("closes the cancel dialog when the email was released a moment ago (409)", () => {
    state.detail = loaded(SCHEDULED);
    state.cancel.mockImplementation((_id: string, cb: Callbacks) =>
      cb.onError?.(notScheduled)
    );
    render(<EmailDetailSheet emailId="em_1" onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel email" }));
    expect(
      screen.queryByRole("dialog", { name: "Cancel this scheduled email?" })
    ).toBeNull();
  });

  it("refuses a time past the 72-hour window without calling the API", () => {
    state.detail = loaded(SCHEDULED);
    render(<EmailDetailSheet emailId="em_1" onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Reschedule" }));
    const tooFar = new Date(Date.now() + 80 * 60 * 60 * 1000);
    fireEvent.change(screen.getByLabelText("Send at"), {
      target: { value: toLocalInputValue(tooFar) },
    });
    const dialog = screen.getByRole("dialog", { name: "Reschedule email" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reschedule" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/72 hours/);
    expect(state.reschedule).not.toHaveBeenCalled();
  });

  it("reschedules to the picked time as an ISO instant", () => {
    state.detail = loaded(SCHEDULED);
    state.reschedule.mockImplementation((_input: unknown, cb: Callbacks) =>
      cb.onSuccess?.()
    );
    render(<EmailDetailSheet emailId="em_1" onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Reschedule" }));
    const at = new Date(Date.now() + 5 * 60 * 60 * 1000);
    at.setSeconds(0, 0);
    fireEvent.change(screen.getByLabelText("Send at"), {
      target: { value: toLocalInputValue(at) },
    });
    const dialog = screen.getByRole("dialog", { name: "Reschedule email" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reschedule" }));

    expect(state.reschedule).toHaveBeenCalledWith(
      { id: "em_1", scheduledAt: at.toISOString() },
      expect.any(Object)
    );
    expect(
      screen.queryByRole("dialog", { name: "Reschedule email" })
    ).toBeNull();
  });

  it("explains a missing email instead of a blank drawer", () => {
    state.detail = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new DeveloperApiError("nope", { status: 404, code: "NOT_FOUND" }),
      refetch: vi.fn(),
    };
    render(<EmailDetailSheet emailId="em_x" onClose={() => {}} />);
    expect(screen.getByText("Email not found")).toBeInTheDocument();
  });
});
