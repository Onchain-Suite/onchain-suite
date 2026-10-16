import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ResetPasswordForm } from "./reset-password-form";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("framer-motion", () => import("@/test/mocks/framer-motion"));

// The form posts to our own /auth/reset-password (better-auth's native reset is
// disabled server-side). Mock fetch and restore it after — the suite runs
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

const VALID_PASSWORD = "Str0ng!Passw0rd";

const fillPasswords = (password: string, confirm: string) => {
  fireEvent.change(screen.getByPlaceholderText("Create a new password"), {
    target: { value: password },
  });
  fireEvent.change(screen.getByPlaceholderText("Confirm your new password"), {
    target: { value: confirm },
  });
};

const submit = () =>
  fireEvent.click(screen.getByRole("button", { name: /Reset Password/i }));

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetch.mockReset();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("shows an invalid-link state when the URL has no token", () => {
    render(<ResetPasswordForm token={undefined} onPasswordReset={vi.fn()} />);

    expect(screen.getByText("This reset link isn't valid")).toBeTruthy();
    const requestLink = screen.getByRole("link", {
      name: /Request a new reset link/i,
    });
    expect(requestLink.getAttribute("href")).toBe("/auth/forgot-password");
    // No form is rendered, so the reset call can never fire without a token.
    expect(screen.queryByPlaceholderText("Create a new password")).toBeNull();
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords before calling the backend", async () => {
    render(<ResetPasswordForm token="tok_123" onPasswordReset={vi.fn()} />);

    fillPasswords(VALID_PASSWORD, "Different1!Pass");
    submit();

    expect(await screen.findByText("Passwords don't match")).toBeTruthy();
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("rejects weak passwords with the schema message", async () => {
    render(<ResetPasswordForm token="tok_123" onPasswordReset={vi.fn()} />);

    fillPasswords("weak", "weak");
    submit();

    expect(
      await screen.findByText("Password must be at least 8 characters")
    ).toBeTruthy();
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("resets the password with the URL token and offers the sign-in redirect", async () => {
    mockedFetch.mockResolvedValue(
      jsonResponse(200, { message: "Password reset successfully", user: {} })
    );
    const onPasswordReset = vi.fn();

    render(
      <ResetPasswordForm token="tok_123" onPasswordReset={onPasswordReset} />
    );

    fillPasswords(VALID_PASSWORD, VALID_PASSWORD);
    submit();

    expect(await screen.findByText("Password reset successful!")).toBeTruthy();
    expect(mockedFetch).toHaveBeenCalledWith(
      "/api/v1/auth/reset-password",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ token: "tok_123", newPassword: VALID_PASSWORD }),
      })
    );
    expect(toast.success).toHaveBeenCalledWith("Password reset successfully!");

    fireEvent.click(
      screen.getByRole("button", { name: /Continue to Sign In/i })
    );
    expect(onPasswordReset).toHaveBeenCalled();
  });

  it("renders an expired/invalid token error inline (not just a toast)", async () => {
    mockedFetch.mockResolvedValue(
      jsonResponse(400, {
        message: "Failed to reset password",
        error: "Invalid or expired reset token",
      })
    );

    render(<ResetPasswordForm token="tok_expired" onPasswordReset={vi.fn()} />);

    fillPasswords(VALID_PASSWORD, VALID_PASSWORD);
    submit();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Invalid or expired reset token");
    expect(toast.error).toHaveBeenCalledWith("Invalid or expired reset token");
    // The form is still there so the user can request a new link / retry.
    expect(screen.getByPlaceholderText("Create a new password")).toBeTruthy();
    expect(screen.queryByText("Password reset successful!")).toBeNull();
  });

  it("clears the inline error on a subsequent successful attempt", async () => {
    mockedFetch
      .mockResolvedValueOnce(
        jsonResponse(400, {
          message: "Failed to reset password",
          error: "Invalid or expired reset token",
        })
      )
      .mockResolvedValueOnce(
        jsonResponse(200, { message: "Password reset successfully", user: {} })
      );

    render(<ResetPasswordForm token="tok_123" onPasswordReset={vi.fn()} />);

    fillPasswords(VALID_PASSWORD, VALID_PASSWORD);
    submit();
    await screen.findByRole("alert");

    submit();
    await waitFor(() => {
      expect(screen.queryByRole("alert")).toBeNull();
    });
    expect(await screen.findByText("Password reset successful!")).toBeTruthy();
  });
});
