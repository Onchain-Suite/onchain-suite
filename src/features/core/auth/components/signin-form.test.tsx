import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authClient } from "@/lib/auth-client";

import { SignInForm } from "./signin-form";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: { email: vi.fn() },
    twoFactor: {
      verifyTotp: vi.fn(),
      verifyBackupCode: vi.fn(),
    },
  },
  signInWithGoogle: vi.fn(),
}));

vi.mock("@/lib/passkey", () => ({
  isWebAuthnSupported: vi.fn(() => false),
  signInWithPasskey: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("framer-motion", () => import("@/test/mocks/framer-motion"));

const mockedSignIn = vi.mocked(authClient.signIn.email);
const mockedVerifyTotp = vi.mocked(authClient.twoFactor.verifyTotp);
const mockedVerifyBackupCode = vi.mocked(authClient.twoFactor.verifyBackupCode);

const renderForm = () =>
  render(
    <SignInForm onSwitchToSignUp={vi.fn()} onSwitchToForgotPassword={vi.fn()} />
  );

const signIn = (email = "user@example.com", password = "Hunter2!Strong") => {
  fireEvent.change(screen.getByPlaceholderText("Email"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));
};

/** Signs in against a 2FA-enabled account and lands on the challenge view. */
const reachTwoFactorChallenge = async () => {
  mockedSignIn.mockResolvedValue({
    data: { twoFactorRedirect: true },
    error: null,
  } as never);
  renderForm();
  signIn();
  await screen.findByText("Two-factor authentication");
};

describe("SignInForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects straight to the dashboard when 2FA is not enabled", async () => {
    mockedSignIn.mockResolvedValue({
      data: { user: { id: "u_1" } },
      error: null,
    } as never);

    renderForm();
    signIn();

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(PRIVATE_ROUTES.DASHBOARD);
    });
    expect(toast.success).toHaveBeenCalledWith("Successfully signed in!");
  });

  it("switches to the code-entry view on a twoFactorRedirect response", async () => {
    await reachTwoFactorChallenge();

    expect(
      screen.getByText("Enter the 6-digit code from your authenticator app")
    ).toBeTruthy();
    expect(screen.getByPlaceholderText("000000")).toBeTruthy();
    // No session yet - no redirect.
    expect(push).not.toHaveBeenCalled();
  });

  it("completes sign-in through verify-totp", async () => {
    await reachTwoFactorChallenge();
    mockedVerifyTotp.mockResolvedValue({
      data: { token: "session" },
      error: null,
    } as never);

    fireEvent.change(screen.getByPlaceholderText("000000"), {
      target: { value: "654321" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Verify/i }));

    await waitFor(() => {
      expect(mockedVerifyTotp).toHaveBeenCalledWith({ code: "654321" });
    });
    expect(push).toHaveBeenCalledWith(PRIVATE_ROUTES.DASHBOARD);
    expect(mockedVerifyBackupCode).not.toHaveBeenCalled();
  });

  it("keeps the challenge view and shows the backend error for a wrong code", async () => {
    await reachTwoFactorChallenge();
    mockedVerifyTotp.mockResolvedValue({
      data: null,
      error: { message: "Invalid two-factor code" },
    } as never);

    fireEvent.change(screen.getByPlaceholderText("000000"), {
      target: { value: "111111" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Verify/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Invalid two-factor code");
    });
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Verify/i })).toBeTruthy();
  });

  it("toggles to backup-code entry and verifies through verify-backup-code", async () => {
    await reachTwoFactorChallenge();
    mockedVerifyBackupCode.mockResolvedValue({
      data: { token: "session" },
      error: null,
    } as never);

    fireEvent.click(
      screen.getByRole("button", { name: /Use a backup code instead/i })
    );
    expect(screen.getByText("Enter one of your backup codes")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("Backup code"), {
      target: { value: "rescue-code-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Verify/i }));

    await waitFor(() => {
      expect(mockedVerifyBackupCode).toHaveBeenCalledWith({
        code: "rescue-code-1",
      });
    });
    expect(push).toHaveBeenCalledWith(PRIVATE_ROUTES.DASHBOARD);
    expect(mockedVerifyTotp).not.toHaveBeenCalled();

    // Toggling back is also available.
  });

  it("can toggle back from backup code to authenticator code", async () => {
    await reachTwoFactorChallenge();

    fireEvent.click(
      screen.getByRole("button", { name: /Use a backup code instead/i })
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Use authenticator code/i })
    );
    expect(screen.getByPlaceholderText("000000")).toBeTruthy();
  });

  it("returns to the sign-in form from the challenge view", async () => {
    await reachTwoFactorChallenge();

    fireEvent.click(screen.getByRole("button", { name: /Back to sign in/i }));

    expect(await screen.findByText("Welcome back")).toBeTruthy();
    expect(screen.getByPlaceholderText("Email")).toBeTruthy();
  });

  it("offers a sign-up affordance after an invalid-credentials error", async () => {
    mockedSignIn.mockResolvedValue({
      data: null,
      error: { message: "Invalid email or password" },
    } as never);

    renderForm();
    signIn("newcomer@example.com");

    expect(
      await screen.findByRole("button", {
        name: /Sign up with newcomer@example.com/i,
      })
    ).toBeTruthy();
    expect(toast.error).toHaveBeenCalledWith("Invalid email or password");
  });
});
