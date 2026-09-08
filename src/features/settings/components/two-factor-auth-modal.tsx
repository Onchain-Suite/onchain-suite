import {
  ArrowPathIcon,
  CheckIcon,
  ExclamationCircleIcon,
  LockClosedIcon,
  QrCodeIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { authClient } from "@/lib/auth-client";
import { getSecurityStatus } from "@/lib/passkey";

import { CopyButton } from "@/shared/components/common/copy-button";

interface TwoFactorAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Called after 2FA is enabled or disabled so the parent can refresh the
   * session + any status it renders. Without this the Security card kept
   * showing the pre-change state until a full page reload.
   */
  onStatusChange?: () => void;
}

const TwoFactorAuthModal = ({
  open,
  onOpenChange,
  onStatusChange,
}: TwoFactorAuthModalProps) => {
  const { data: session } = authClient.useSession();
  const [twoFACode, setTwoFACode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"initial" | "password" | "qr" | "backup">(
    "initial"
  );
  // What the password confirmation is for: enrolling/re-enrolling TOTP
  // ("enable") or turning 2FA off ("disable"). Without this, "Reconfigure
  // 2FA" and "Disable 2FA" would be indistinguishable at the password step.
  const [pendingAction, setPendingAction] = useState<"enable" | "disable">(
    "enable"
  );
  const [totpURI, setTotpURI] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  // Whether the account has a password. Password users confirm with it on
  // enable; OAuth-only users (no password) enable without one, since the
  // backend's better-auth `allowPasswordless` drops the check for them. Default
  // true so we never wrongly enable-without-password for a real password user.
  const [hasPassword, setHasPassword] = useState(true);

  // Manual-entry secret for authenticator apps that can't scan the QR code.
  const totpSecret = useMemo(() => {
    if (!totpURI) return "";
    try {
      return new URL(totpURI).searchParams.get("secret") ?? "";
    } catch {
      return "";
    }
  }, [totpURI]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setStep("initial");
      setPendingAction("enable");
      setTwoFACode("");
      setPassword("");
      setTotpURI("");
      setBackupCodes([]);
      setError("");
      setLoading(false);
      // Learn whether this account has a password, to decide enable-with-password
      // vs the passwordless (OAuth) path.
      getSecurityStatus()
        .then((status) => setHasPassword(status.hasPassword))
        .catch(() => setHasPassword(true));
    }
  }, [open]);

  const isEnabled = session?.user?.twoFactorEnabled;

  // Surface the real reason instead of a blanket "An error occurred": prefer the
  // server message, then a status/code, so a rejected password, a passwordless
  // account, or a disabled 2FA route each read differently in the UI and logs.
  const errText = (err: unknown, fallback: string): string => {
    if (err && typeof err === "object") {
      const e = err as {
        message?: string;
        statusText?: string;
        code?: string;
        status?: number;
      };
      if (e.message) return e.message;
      if (e.statusText) return e.statusText;
      if (e.code) return `2FA error: ${e.code}`;
      if (typeof e.status === "number") return `Request failed (${e.status})`;
    }
    if (err instanceof Error && err.message) return err.message;
    return fallback;
  };

  const goToPasswordStep = (action: "enable" | "disable") => {
    // OAuth-only accounts (no password) enable 2FA without one — the backend's
    // better-auth `allowPasswordless` skips the confirmation for them. Go
    // straight to enrolment instead of asking for a password they don't have.
    if (action === "enable" && !hasPassword) {
      handleEnableWithoutPassword().catch(() => undefined);
      return;
    }
    setPendingAction(action);
    setPassword("");
    setError("");
    setStep("password");
  };

  const handleEnableWithoutPassword = async () => {
    setLoading(true);
    setError("");
    try {
      // No password in the body: allowed for passwordless (OAuth) accounts.
      const res = await authClient.twoFactor.enable({});
      if (res.data) {
        setTotpURI(res.data.totpURI);
        setBackupCodes(res.data.backupCodes ?? []);
        setStep("qr");
      } else {
        const message = errText(res.error, "Failed to start 2FA setup");
        setError(message);
        toast.error(message);
      }
    } catch (e) {
      const message = errText(e, "Failed to start 2FA setup");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authClient.twoFactor.enable({
        password,
      });

      if (res.data) {
        setTotpURI(res.data.totpURI);
        setBackupCodes(res.data.backupCodes ?? []);
        setPassword("");
        setStep("qr");
      } else if (res.error) {
        const message = errText(res.error, "Couldn't start 2FA setup");
        setError(message);
        toast.error(message);
      }
    } catch (e) {
      const message = errText(e, "Couldn't start 2FA setup");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (twoFACode.length < 6) {
      setError("Code must be 6 digits");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await authClient.twoFactor.verifyTotp({
        code: twoFACode,
      });

      if (res.data) {
        toast.success("2FA enabled successfully");
        setStep("backup");
        // 2FA is on now - let the parent refresh the session + status row so
        // it doesn't keep showing "Needs setup" until a reload.
        onStatusChange?.();
      } else if (res.error) {
        const message = errText(
          res.error,
          "That code didn't match. Try again."
        );
        setError(message);
        toast.error(message);
      }
    } catch (e) {
      const message = errText(e, "That code didn't match. Try again.");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authClient.twoFactor.disable({
        password,
      });
      if (res.data) {
        toast.success("2FA disabled");
        onOpenChange(false);
        // Refresh session + status in place instead of a full page reload.
        onStatusChange?.();
      } else {
        const message = errText(res.error, "Failed to disable 2FA");
        setError(message);
        toast.error(message);
      }
    } catch (e) {
      const message = errText(e, "Failed to disable 2FA");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto p-0 gap-0 border-border/80 bg-background/95 backdrop-blur-xl">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-light tracking-tight text-foreground">
              Two-factor authentication
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-1.5">
              {isEnabled && step === "initial"
                ? "Manage your 2FA settings"
                : "Add an extra layer of security to your account"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {isEnabled && step === "initial" && (
              <motion.div
                key="enabled-initial"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="rounded-xl bg-emerald-500/10 p-4 border border-emerald-500/20">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-emerald-500/20 p-1">
                      <ShieldCheckIcon
                        className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                        2FA is currently enabled
                      </p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300/80">
                        Your account is protected with TOTP. You can reconfigure
                        it or disable it below.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  <Button
                    variant="outline"
                    onClick={() => goToPasswordStep("enable")}
                    className="h-11 w-full justify-start gap-3 border-border/60 hover:bg-muted/50"
                  >
                    <ArrowPathIcon
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">
                        Reconfigure 2FA
                      </span>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => goToPasswordStep("disable")}
                    className="h-11 w-full justify-start gap-3 border-border/60 hover:bg-red-50 hover:text-red-600 hover:border-red-100 dark:hover:bg-red-900/10 dark:hover:border-red-900/30 dark:hover:text-red-400 transition-colors"
                  >
                    <LockClosedIcon className="h-4 w-4" aria-hidden="true" />
                    <span className="text-sm font-medium">Disable 2FA</span>
                  </Button>
                </div>
              </motion.div>
            )}

            {!isEnabled && step === "initial" && (
              <motion.div
                key="disabled-initial"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col items-center justify-center gap-4 py-4 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/5 shadow-inner">
                    <QrCodeIcon
                      className="h-10 w-10 text-primary"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-foreground">
                      Authenticator App
                    </h4>
                    <p className="text-sm text-muted-foreground max-w-[260px] mx-auto">
                      Use apps like Google Authenticator or Authy to generate
                      verification codes.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => goToPasswordStep("enable")}
                  className="w-full h-11 shadow-lg shadow-primary/20"
                >
                  Setup 2FA
                </Button>
              </motion.div>
            )}

            {step === "password" && (
              <motion.div
                key="password"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Password Confirmation
                  </Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="h-11 bg-muted/30"
                    autoFocus
                  />
                  {error && (
                    <p className="text-xs text-red-500 flex items-center gap-1.5">
                      <ExclamationCircleIcon
                        className="h-3 w-3"
                        aria-hidden="true"
                      />{" "}
                      {error}
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setError("");
                      setStep("initial");
                    }}
                    className="h-10"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={
                      pendingAction === "disable"
                        ? handleDisable
                        : handlePasswordSubmit
                    }
                    disabled={loading || !password}
                    className="h-10 min-w-[100px]"
                  >
                    {loading ? (
                      <ArrowPathIcon
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : null}
                    {pendingAction === "disable" ? "Disable 2FA" : "Continue"}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "qr" && (
              <motion.div
                key="qr"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <div className="flex flex-col items-center gap-6">
                  <div className="relative flex items-center justify-center rounded-2xl border border-border/50 bg-white p-4 shadow-sm">
                    {totpURI ? (
                      <QRCode
                        value={totpURI}
                        size={160}
                        style={{
                          height: "auto",
                          maxWidth: "100%",
                          width: "100%",
                        }}
                      />
                    ) : (
                      <div className="h-40 w-40 animate-pulse bg-muted rounded-lg" />
                    )}
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    Scan this QR code with your authenticator app
                  </p>
                </div>

                {totpSecret ? (
                  <div className="rounded-lg border border-border/60 bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">
                      Can&apos;t scan? Enter this key manually:
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <code className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">
                        {totpSecret}
                      </code>
                      <CopyButton value={totpSecret} label="Copy setup key" />
                    </div>
                  </div>
                ) : null}

                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Verification code
                  </Label>
                  <Input
                    value={twoFACode}
                    onChange={(e) => {
                      const val = e.target.value
                        .replace(/[^0-9]/g, "")
                        .slice(0, 6);
                      setTwoFACode(val);
                      if (error) setError("");
                    }}
                    placeholder="000000"
                    className="h-12 text-center text-lg tracking-[0.5em] font-mono bg-muted/30"
                    maxLength={6}
                    autoComplete="one-time-code"
                  />
                  {error && (
                    <p className="text-xs text-red-500 flex items-center gap-1.5 justify-center">
                      <ExclamationCircleIcon
                        className="h-3 w-3"
                        aria-hidden="true"
                      />{" "}
                      {error}
                    </p>
                  )}
                </div>

                {isEnabled && (
                  <div className="rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400">
                    2FA is currently enabled. Verify a new code to change
                    devices.
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setError("");
                      setTwoFACode("");
                      setStep("initial");
                    }}
                    className="h-10"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleVerify}
                    disabled={loading || twoFACode.length !== 6}
                    className="h-10 min-w-[100px] bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {loading ? (
                      <ArrowPathIcon
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <CheckIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                    )}
                    Verify
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "backup" && (
              <motion.div
                key="backup"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="rounded-xl bg-amber-500/10 p-4 border border-amber-500/20">
                  <h4 className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-100">
                    <ExclamationCircleIcon
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                    Save your backup codes
                  </h4>
                  <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-200/80">
                    If you lose access to your authenticator device, you can use
                    these codes to log in. Keep them safe.
                  </p>
                </div>

                <div className="relative rounded-lg border border-border/60 bg-muted/50 p-4 font-mono text-sm">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    {backupCodes.map((code) => (
                      <div
                        key={code}
                        className="rounded bg-background py-1 px-2 border border-border/40"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                  <CopyButton
                    value={backupCodes.join("\n")}
                    label="Copy backup codes"
                    className="absolute right-2 top-2 h-8 w-8 hover:bg-background/80"
                  />
                </div>

                <Button
                  onClick={() => onOpenChange(false)}
                  className="w-full h-11"
                >
                  I have saved my codes
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TwoFactorAuthModal;
