import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { VerifyAccountView } from "./verify-account-view";

const searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => searchParams,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("framer-motion", () => import("@/test/mocks/framer-motion"));

// Restore fetch after — the suite runs single-worker.
const originalFetch = global.fetch;
const mockedFetch = vi.fn<typeof fetch>();
global.fetch = mockedFetch as unknown as typeof fetch;

const jsonResponse = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as unknown as Response;

describe("VerifyAccountView — self-serve resend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetch.mockReset();
    // No token in the URL -> the page renders the "check your inbox" state
    // with the resend controls, and never auto-verifies.
    for (const key of [...searchParams.keys()]) searchParams.delete(key);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("lets a user with no ?email= in the URL type one and resend", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, {}));
    render(<VerifyAccountView />);

    // Reachable even though the URL carries no email.
    const input = (await screen.findByLabelText(
      "Email address"
    )) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "stuck@example.com" } });
    fireEvent.click(
      screen.getByRole("button", { name: /Resend Verification Email/i })
    );

    await waitFor(() => {
      expect(mockedFetch).toHaveBeenCalledWith(
        "/api/v1/auth/resend-verification",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "stuck@example.com" }),
        })
      );
    });
    // Confirmation is generic (enumeration-safe).
    expect(toast.success).toHaveBeenCalled();
  });

  it("refuses to send without a valid email and never calls the API", async () => {
    render(<VerifyAccountView />);

    fireEvent.click(
      await screen.findByRole("button", { name: /Resend Verification Email/i })
    );

    expect(toast.error).toHaveBeenCalledWith(
      "Enter your email address to resend the link."
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });
});
