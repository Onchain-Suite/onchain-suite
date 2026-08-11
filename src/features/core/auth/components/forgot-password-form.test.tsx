import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authClient } from "@/lib/auth-client";

import { ForgotPasswordForm } from "./forgot-password-form";

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    requestPasswordReset: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("framer-motion", () => import("@/test/mocks/framer-motion"));

const mockedRequestReset = vi.mocked(authClient.requestPasswordReset);

const fillAndSubmit = (email: string) => {
  fireEvent.change(screen.getByPlaceholderText("Email"), {
    target: { value: email },
  });
  fireEvent.click(screen.getByRole("button", { name: /Send Reset Link/i }));
};

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests a reset link pointed at the reset page and shows the success view", async () => {
    mockedRequestReset.mockResolvedValue({
      data: { status: true },
      error: null,
    } as never);

    render(<ForgotPasswordForm onSwitchToSignIn={vi.fn()} />);
    fillAndSubmit("user@example.com");

    expect(await screen.findByText("Check your email")).toBeTruthy();
    expect(mockedRequestReset).toHaveBeenCalledWith({
      email: "user@example.com",
      redirectTo: "/auth/reset-password",
    });
    expect(screen.getByText("user@example.com")).toBeTruthy();
    // Backend sends no message for unknown emails (anti-enumeration) -
    // the fallback copy is used instead of toasting `undefined`.
    expect(toast.success).toHaveBeenCalledWith(
      "Password reset link sent - check your email"
    );
  });

  it("shows the success view even for unknown emails (anti-enumeration)", async () => {
    // better-auth responds with a generic success whether or not the
    // account exists; the UI must not leak the difference.
    mockedRequestReset.mockResolvedValue({
      data: { status: true },
      error: null,
    } as never);

    render(<ForgotPasswordForm onSwitchToSignIn={vi.fn()} />);
    fillAndSubmit("nobody-here@example.com");

    expect(await screen.findByText("Check your email")).toBeTruthy();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("starts the resend countdown after a successful request", async () => {
    mockedRequestReset.mockResolvedValue({
      data: { status: true },
      error: null,
    } as never);

    render(<ForgotPasswordForm onSwitchToSignIn={vi.fn()} />);
    fillAndSubmit("user@example.com");

    const resendButton = (await screen.findByRole("button", {
      name: /Resend in 60s/i,
    })) as HTMLButtonElement;
    expect(resendButton.disabled).toBe(true);
  });

  it("surfaces a backend error and stays on the form", async () => {
    mockedRequestReset.mockResolvedValue({
      data: null,
      error: { message: "Too many requests" },
    } as never);

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
    // Passes the native `type="email"` constraint (so the submit event
    // fires) but fails the stricter zod schema - the schema message must
    // render and no request may go out.
    fillAndSubmit("user@nodot");

    expect(
      await screen.findByText("Please enter a valid email address")
    ).toBeTruthy();
    expect(mockedRequestReset).not.toHaveBeenCalled();
  });

  it("navigates back to sign in", () => {
    const onSwitchToSignIn = vi.fn();
    render(<ForgotPasswordForm onSwitchToSignIn={onSwitchToSignIn} />);

    fireEvent.click(screen.getByRole("button", { name: /Back to sign in/i }));
    expect(onSwitchToSignIn).toHaveBeenCalled();
  });
});
