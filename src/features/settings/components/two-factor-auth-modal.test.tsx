import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authClient } from "@/lib/auth-client";

import TwoFactorAuthModal from "./two-factor-auth-modal";

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: vi.fn(),
    twoFactor: {
      enable: vi.fn(),
      verifyTotp: vi.fn(),
      disable: vi.fn(),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("framer-motion", () => import("@/test/mocks/framer-motion"));

vi.mock("react-qr-code", () => ({
  default: ({ value }: { value: string }) => (
    <div data-testid="qr-code" data-value={value} />
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children?: ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children?: ReactNode }) => (
    <p>{children}</p>
  ),
}));

const mockedUseSession = vi.mocked(authClient.useSession);
const mockedEnable = vi.mocked(authClient.twoFactor.enable);
const mockedVerifyTotp = vi.mocked(authClient.twoFactor.verifyTotp);
const mockedDisable = vi.mocked(authClient.twoFactor.disable);

const setSession = (twoFactorEnabled: boolean) => {
  mockedUseSession.mockReturnValue({
    data: { user: { twoFactorEnabled } },
  } as never);
};

const TOTP_URI =
  "otpauth://totp/OnchainSuite:user%40example.com?secret=ABC123SECRET&issuer=OnchainSuite";
const BACKUP_CODES = ["aaaa-bbbb", "cccc-dddd", "eeee-ffff"];

const enableSuccess = () => {
  mockedEnable.mockResolvedValue({
    data: { totpURI: TOTP_URI, backupCodes: BACKUP_CODES },
    error: null,
  } as never);
};

/** Walks the enable flow up to the QR / manual-key step. */
const goToQrStep = async (password = "Hunter2!Strong") => {
  fireEvent.click(screen.getByRole("button", { name: "Setup 2FA" }));
  fireEvent.change(screen.getByPlaceholderText("Enter your current password"), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByTestId("qr-code");
};

describe("TwoFactorAuthModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("enable flow", () => {
    it("reaches the QR step with the otpauth secret and a copy affordance", async () => {
      setSession(false);
      enableSuccess();

      render(<TwoFactorAuthModal open onOpenChange={vi.fn()} />);
      await goToQrStep("Hunter2!Strong");

      expect(mockedEnable).toHaveBeenCalledWith({
        password: "Hunter2!Strong",
      });
      expect(screen.getByTestId("qr-code").getAttribute("data-value")).toBe(
        TOTP_URI
      );
      // Manual-entry secret extracted from the otpauth URI + CopyButton.
      expect(screen.getByText("ABC123SECRET")).toBeTruthy();
      expect(
        screen.getByRole("button", { name: "Copy setup key" })
      ).toBeTruthy();
    });

    it("surfaces a wrong-password error from the backend", async () => {
      setSession(false);
      mockedEnable.mockResolvedValue({
        data: null,
        error: { message: "Invalid password" },
      } as never);

      render(<TwoFactorAuthModal open onOpenChange={vi.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: "Setup 2FA" }));
      fireEvent.change(
        screen.getByPlaceholderText("Enter your current password"),
        { target: { value: "wrong-pass" } }
      );
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));

      expect(await screen.findByText("Invalid password")).toBeTruthy();
      expect(screen.queryByTestId("qr-code")).toBeNull();
      expect(toast.error).toHaveBeenCalledWith("Invalid password");
    });

    it("verifies a 6-digit code and shows the backup codes", async () => {
      setSession(false);
      enableSuccess();
      mockedVerifyTotp.mockResolvedValue({
        data: { status: true },
        error: null,
      } as never);

      render(<TwoFactorAuthModal open onOpenChange={vi.fn()} />);
      await goToQrStep();

      fireEvent.change(screen.getByPlaceholderText("000000"), {
        target: { value: "123456" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Verify/ }));

      expect(await screen.findByText("Save your backup codes")).toBeTruthy();
      expect(mockedVerifyTotp).toHaveBeenCalledWith({ code: "123456" });
      for (const code of BACKUP_CODES) {
        expect(screen.getByText(code)).toBeTruthy();
      }
      expect(
        screen.getByRole("button", { name: "Copy backup codes" })
      ).toBeTruthy();
      expect(toast.success).toHaveBeenCalledWith("2FA enabled successfully");
    });

    it("shows the backend error for a wrong code and stays on the QR step", async () => {
      setSession(false);
      enableSuccess();
      mockedVerifyTotp.mockResolvedValue({
        data: null,
        error: { message: "Invalid TOTP code" },
      } as never);

      render(<TwoFactorAuthModal open onOpenChange={vi.fn()} />);
      await goToQrStep();

      fireEvent.change(screen.getByPlaceholderText("000000"), {
        target: { value: "000001" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Verify/ }));

      expect(await screen.findByText("Invalid TOTP code")).toBeTruthy();
      expect(screen.getByTestId("qr-code")).toBeTruthy();
      expect(screen.queryByText("Save your backup codes")).toBeNull();
    });

    it("rejects codes shorter than 6 digits before hitting the network", async () => {
      setSession(false);
      enableSuccess();

      render(<TwoFactorAuthModal open onOpenChange={vi.fn()} />);
      await goToQrStep();

      fireEvent.change(screen.getByPlaceholderText("000000"), {
        target: { value: "123" },
      });
      // Button is disabled for short codes - the guard never lets a short
      // code reach the backend.
      expect(
        (screen.getByRole("button", { name: /Verify/ }) as HTMLButtonElement)
          .disabled
      ).toBe(true);
      expect(mockedVerifyTotp).not.toHaveBeenCalled();
    });
  });

  describe("state reset between opens", () => {
    it("shows backup codes only once - reopening starts back at the first step", async () => {
      setSession(false);
      enableSuccess();
      mockedVerifyTotp.mockResolvedValue({
        data: { status: true },
        error: null,
      } as never);

      const { rerender } = render(
        <TwoFactorAuthModal open onOpenChange={vi.fn()} />
      );
      await goToQrStep();
      fireEvent.change(screen.getByPlaceholderText("000000"), {
        target: { value: "123456" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Verify/ }));
      await screen.findByText("Save your backup codes");

      // Close and reopen.
      rerender(<TwoFactorAuthModal open={false} onOpenChange={vi.fn()} />);
      rerender(<TwoFactorAuthModal open onOpenChange={vi.fn()} />);

      expect(
        await screen.findByRole("button", { name: "Setup 2FA" })
      ).toBeTruthy();
      expect(screen.queryByText("Save your backup codes")).toBeNull();
      for (const code of BACKUP_CODES) {
        expect(screen.queryByText(code)).toBeNull();
      }
    });

    it("clears a stale error when the modal is reopened", async () => {
      setSession(false);
      mockedEnable.mockResolvedValue({
        data: null,
        error: { message: "Invalid password" },
      } as never);

      const { rerender } = render(
        <TwoFactorAuthModal open onOpenChange={vi.fn()} />
      );
      fireEvent.click(screen.getByRole("button", { name: "Setup 2FA" }));
      fireEvent.change(
        screen.getByPlaceholderText("Enter your current password"),
        { target: { value: "wrong" } }
      );
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
      await screen.findByText("Invalid password");

      rerender(<TwoFactorAuthModal open={false} onOpenChange={vi.fn()} />);
      rerender(<TwoFactorAuthModal open onOpenChange={vi.fn()} />);

      expect(screen.queryByText("Invalid password")).toBeNull();
      // Password field is also cleared on the next visit.
      fireEvent.click(screen.getByRole("button", { name: "Setup 2FA" }));
      expect(
        (
          screen.getByPlaceholderText(
            "Enter your current password"
          ) as HTMLInputElement
        ).value
      ).toBe("");
    });
  });

  describe("when 2FA is already enabled", () => {
    it("requires the password to disable and calls twoFactor.disable", async () => {
      setSession(true);
      mockedDisable.mockResolvedValue({
        data: { status: true },
        error: null,
      } as never);
      const onOpenChange = vi.fn();

      render(<TwoFactorAuthModal open onOpenChange={onOpenChange} />);
      expect(screen.getByText("2FA is currently enabled")).toBeTruthy();

      fireEvent.click(screen.getByRole("button", { name: /Disable 2FA/ }));

      // Submit is gated on the password being entered.
      const submit = screen.getByRole("button", {
        name: /Disable 2FA/,
      }) as HTMLButtonElement;
      expect(submit.disabled).toBe(true);

      fireEvent.change(
        screen.getByPlaceholderText("Enter your current password"),
        { target: { value: "Hunter2!Strong" } }
      );
      fireEvent.click(screen.getByRole("button", { name: /Disable 2FA/ }));

      await waitFor(() => {
        expect(mockedDisable).toHaveBeenCalledWith({
          password: "Hunter2!Strong",
        });
      });
      expect(toast.success).toHaveBeenCalledWith("2FA disabled");
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(mockedEnable).not.toHaveBeenCalled();
    });

    it("Reconfigure 2FA re-enrolls (calls enable, not disable)", async () => {
      setSession(true);
      enableSuccess();

      render(<TwoFactorAuthModal open onOpenChange={vi.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: /Reconfigure 2FA/ }));

      // The password step reflects the enable intent, not disable.
      expect(screen.queryByRole("button", { name: /Disable 2FA/ })).toBeNull();
      fireEvent.change(
        screen.getByPlaceholderText("Enter your current password"),
        { target: { value: "Hunter2!Strong" } }
      );
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));

      expect(await screen.findByTestId("qr-code")).toBeTruthy();
      expect(mockedEnable).toHaveBeenCalledWith({
        password: "Hunter2!Strong",
      });
      expect(mockedDisable).not.toHaveBeenCalled();
    });

    it("surfaces a wrong-password error on disable", async () => {
      setSession(true);
      mockedDisable.mockResolvedValue({
        data: null,
        error: { message: "Incorrect password" },
      } as never);
      const onOpenChange = vi.fn();

      render(<TwoFactorAuthModal open onOpenChange={onOpenChange} />);
      fireEvent.click(screen.getByRole("button", { name: /Disable 2FA/ }));
      fireEvent.change(
        screen.getByPlaceholderText("Enter your current password"),
        { target: { value: "wrong" } }
      );
      fireEvent.click(screen.getByRole("button", { name: /Disable 2FA/ }));

      expect(await screen.findByText("Incorrect password")).toBeTruthy();
      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });
});
