import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ForgotPasswordForm } from "./forgot-password-form";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("framer-motion", () => import("@/test/mocks/framer-motion"));

// The form posts to our own /auth/forgot-password (better-auth's native reset
// is disabled server-side). Mock fetch and restore it after — the suite runs
// single-worker, so a mutated global would bleed into later files.
const originalFetch = global.fetch;
const mockedFetch = vi.fn<typeof fetch>();
global.fetch = mockedFetch as unknown as typeof fetch;

const jsonResponse = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as unknown as Response;

const fillAndSubmit = (email: string) => {
  fireEvent.change(screen.getByPlaceholderText("Email"), {
    target: { value: email },
  });
  fireEvent.click(screen.getByRole("button", { name: /Send Reset Link/i }));
};

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetch.mockReset();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("posts to the custom forgot-password endpoint and shows the success view", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, {}));

    render(<ForgotPasswordForm onSwitchToSignIn={vi.fn()} />);
    fillAndSubmit("user@example.com");

    expect(await screen.findByText("Check your email")).toBeTruthy();
    expect(mockedFetch).toHaveBeenCalledWith(
      "/api/v1/auth/forgot-password",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      })
    );
    expect(screen.getByText("user@example.com")).toBeTruthy();
    // The endpoint returns no message for unknown emails (anti-enumeration) -
    // the fallback copy is used instead of toasting `undefined`.
    expect(toast.success).toHaveBeenCalledWith(
      "Password reset link sent - check your email"
    );
  });

  it("shows the success view even for unknown emails (anti-enumeration)", async () => {
    // The endpoint responds 200 whether or not the account exists; the UI must
    // not leak the difference.
    mockedFetch.mockResolvedValue(jsonResponse(200, {}));

    render(<ForgotPasswordForm onSwitchToSignIn={vi.fn()} />);
    fillAndSubmit("nobody-here@example.com");

    expect(await screen.findByText("Check your email")).toBeTruthy();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("starts the resend countdown after a successful request", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, {}));

    render(<ForgotPasswordForm onSwitchToSignIn={vi.fn()} />);
    fillAndSubmit("user@example.com");

    const resendButton = (await screen.findByRole("button", {
      name: /Resend in 60s/i,
    })) as HTMLButtonElement;
    expect(resendButton.disabled).toBe(true);
  });

  it("surfaces a backend error and stays on the form", async () => {
    mockedFetch.mockResolvedValue(
      jsonResponse(429, { message: "Too many requests" })
    );

    render(<ForgotPasswordForm onSwitchToSignIn={vi.fn()} />);
    fillAndSubmit("user@example.com");

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Too many requests");
    });
    expect(screen.queryByText("Check your email")).toBeNull();
    expect(
      screen.getByRole("button", { name: /Send Reset Link/i })
    ).toBeTruthy();
  });

  it("validates the email before making any request", async () => {
    render(<ForgotPasswordForm onSwitchToSignIn={vi.fn()} />);
    // Passes the native `type="email"` constraint (so the submit event fires)
    // but fails the stricter zod schema - the schema message must render and no
    // request may go out.
    fillAndSubmit("user@nodot");

    expect(
      await screen.findByText("Please enter a valid email address")
    ).toBeTruthy();
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("navigates back to sign in", () => {
    const onSwitchToSignIn = vi.fn();
    render(<ForgotPasswordForm onSwitchToSignIn={onSwitchToSignIn} />);

    fireEvent.click(screen.getByRole("button", { name: /Back to sign in/i }));
    expect(onSwitchToSignIn).toHaveBeenCalled();
  });
});
