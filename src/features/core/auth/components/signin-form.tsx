"use client";

import { EnvelopeIcon, FingerPrintIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { InputFormField } from "@/components/form-fields";
import { Button } from "@/ui/button";
import { Form } from "@/ui/form";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { LoadingButton } from "@/ui/loading-button";

import { authClient, signInWithGoogle } from "@/lib/auth-client";
import { isWebAuthnSupported, signInWithPasskey } from "@/lib/passkey";
import { isJsonObject } from "@/lib/utils";

import {
  AuthHeader,
  AuthLink,
  FormDivider,
  OAuthButtons,
  PasswordField,
} from "./shared";
import { type SignInFormData, signInSchema } from "@/auth/validation";
import { AUTH_ROUTES, PRIVATE_ROUTES } from "@/shared/config/app-routes";

/**
 * Detects "account does not exist" sign-in failures.
 *
 * Note: better-auth deliberately returns the same generic
 * `INVALID_EMAIL_OR_PASSWORD` (401) for both unknown-email and
 * wrong-password (anti-enumeration), so this only matches if the backend
 * surfaces a distinct code/message. The generic case is handled by the
 * inline "Don't have an account?" affordance after a failed attempt.
 */
const isUserNotFoundError = (error: {
  code?: string;
  message?: string;
}): boolean => {
  if (error.code === "USER_NOT_FOUND") return true;
  const message = error.message ?? "";
  return /user\s+not\s+found|no\s+account|not\s+registered|account\s+does\s+not\s+exist/i.test(
    message
  );
};

interface SignInFormProps {
  onSwitchToSignUp: () => void;
  onSwitchToForgotPassword: () => void;
}

function GoogleOAuthButtons({
  isLoading,
  setIsLoading,
}: {
  isLoading: boolean;
  setIsLoading: (next: boolean) => void;
}) {
  const searchParams = useSearchParams();

  const safeRedirectPath = (raw: string | null): string | null => {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed.startsWith("/")) return null;
    if (trimmed.startsWith("//")) return null;
    return trimmed;
  };

  const handleOAuthSignIn = async () => {
    setIsLoading(true);
    try {
      const redirectToRaw = searchParams?.get("redirectTo") ?? null;
      const redirectTo = safeRedirectPath(redirectToRaw);
      const callbackURL = redirectTo ?? PRIVATE_ROUTES.DASHBOARD;

      // A redirectTo (e.g. an invite accept link) must win for NEW users
      // too - the default new-user destination is onboarding, which invited
      // members should never see.
      await signInWithGoogle({
        callbackURL,
        ...(redirectTo ? { newUserCallbackURL: redirectTo } : {}),
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Failed to sign in with Google";
      console.error("Google OAuth start error:", error);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OAuthButtons
      onOAuthSignIn={async (_provider: string) => {
        await handleOAuthSignIn();
      }}
      isLoading={isLoading}
    />
  );
}

/**
 * better-auth (with the two-factor plugin) responds to a correct
 * email/password with `{ twoFactorRedirect: true }` instead of a session
 * when the account has TOTP 2FA enabled.
 */
const needsTwoFactor = (data: unknown): boolean =>
  isJsonObject(data) && data.twoFactorRedirect === true;

export function SignInForm({
  onSwitchToSignUp,
  onSwitchToForgotPassword,
}: SignInFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [failedEmail, setFailedEmail] = useState<string | null>(null);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [twoFactorPending, setTwoFactorPending] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [isVerifyingTwoFactor, setIsVerifyingTwoFactor] = useState(false);
  const { push } = useRouter();
  const searchParams = useSearchParams();

  // Feature-detect in an effect so SSR and the first client render agree.
  useEffect(() => {
    setPasskeySupported(isWebAuthnSupported());
  }, []);

  const goToSignUpWithEmail = (email: string) => {
    push(`${AUTH_ROUTES.REGISTER}?email=${encodeURIComponent(email)}`);
  };

  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const pickNonEmptyString = (...values: unknown[]) => {
    for (const value of values) {
      if (typeof value === "string" && value.trim().length > 0) return value;
    }
    return undefined;
  };

  const safeRedirectPath = (raw: string | null): string | null => {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed.startsWith("/")) return null;
    if (trimmed.startsWith("//")) return null;
    return trimmed;
  };

  const redirectAfterSignIn = () => {
    const redirectToRaw = searchParams?.get("redirectTo") ?? null;
    const redirectTo = safeRedirectPath(redirectToRaw);
    if (redirectTo) {
      push(redirectTo);
    } else {
      push(PRIVATE_ROUTES.DASHBOARD);
    }
  };

  const onSubmit = async (formData: SignInFormData) => {
    setIsLoading(true);
    setFailedEmail(null);
    try {
      const { data, error } = await authClient.signIn.email({
        email: formData.email,
        password: formData.password,
        callbackURL: PRIVATE_ROUTES.DASHBOARD,
      });

      if (error) {
        if (isUserNotFoundError(error)) {
          toast.info("No account found for this email - create one");
          goToSignUpWithEmail(formData.email);
          return;
        }
        // Backend returns a generic invalid-credentials error for both
        // unknown-email and wrong-password - surface a sign-up affordance
        // instead of guessing which one it was.
        setFailedEmail(formData.email);
        toast.error(
          pickNonEmptyString(error.message) ?? "Invalid email or password"
        );
        return;
      }

      if (needsTwoFactor(data)) {
        setTwoFactorCode("");
        setUseBackupCode(false);
        setTwoFactorPending(true);
        return;
      }

      toast.success("Successfully signed in!");
      redirectAfterSignIn();
    } catch (error: unknown) {
      console.error("Sign in error:", error);
      const displayMessage =
        pickNonEmptyString(
          error instanceof Error ? error.message : undefined,
          String(error)
        ) ?? "Failed to sign in. Please try again.";
      toast.error(displayMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeySignIn = async () => {
    setIsPasskeyLoading(true);
    setFailedEmail(null);
    try {
      await signInWithPasskey();
      toast.success("Successfully signed in!");
      redirectAfterSignIn();
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Passkey sign-in failed";
      toast.error(message);
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  const handleTwoFactorVerify = async () => {
    const code = twoFactorCode.trim();
    if (!code) {
      toast.error("Enter your verification code");
      return;
    }
    setIsVerifyingTwoFactor(true);
    try {
      const { error } = useBackupCode
        ? await authClient.twoFactor.verifyBackupCode({ code })
        : await authClient.twoFactor.verifyTotp({ code });

      if (error) {
        toast.error(
          pickNonEmptyString(error.message) ?? "Invalid verification code"
        );
        return;
      }

      toast.success("Successfully signed in!");
      redirectAfterSignIn();
    } catch (error: unknown) {
      console.error("2FA verification error:", error);
      toast.error("Failed to verify the code. Please try again.");
    } finally {
      setIsVerifyingTwoFactor(false);
    }
  };

  if (twoFactorPending) {
    const codeLengthOk = useBackupCode
      ? twoFactorCode.trim().length > 0
      : twoFactorCode.length === 6;

    return (
      <>
        <AuthHeader
          title="Two-factor authentication"
          subtitle={
            useBackupCode
              ? "Enter one of your backup codes"
              : "Enter the 6-digit code from your authenticator app"
          }
        />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label
              htmlFor="two-factor-code"
              className="text-sm font-medium text-foreground"
            >
              {useBackupCode ? "Backup code" : "Verification code"}
            </Label>
            <Input
              id="two-factor-code"
              value={twoFactorCode}
              onChange={(e) => {
                const raw = e.target.value;
                setTwoFactorCode(
                  useBackupCode ? raw : raw.replace(/[^0-9]/g, "").slice(0, 6)
                );
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && codeLengthOk) {
                  handleTwoFactorVerify();
                }
              }}
              placeholder={useBackupCode ? "Backup code" : "000000"}
              className={
                useBackupCode
                  ? "h-12 font-mono"
                  : "h-12 text-center text-lg tracking-[0.5em] font-mono"
              }
              maxLength={useBackupCode ? 64 : 6}
              autoComplete="one-time-code"
              autoFocus
            />
          </div>

          <LoadingButton
            isLoading={isVerifyingTwoFactor}
            disabled={isVerifyingTwoFactor || !codeLengthOk}
            onClick={() => {
              handleTwoFactorVerify();
            }}
          >
            Verify
          </LoadingButton>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setUseBackupCode((prev) => !prev);
                setTwoFactorCode("");
              }}
              className="text-primary transition-colors hover:underline"
            >
              {useBackupCode
                ? "Use authenticator code"
                : "Use a backup code instead"}
            </button>
            <button
              type="button"
              onClick={() => {
                setTwoFactorPending(false);
                setTwoFactorCode("");
                setUseBackupCode(false);
              }}
              className="text-muted-foreground transition-colors hover:underline"
            >
              Back to sign in
            </button>
          </div>
        </motion.div>
      </>
    );
  }

  return (
    <>
      <AuthHeader
        title="Welcome back"
        subtitle="Sign in to your Onchain Suite account"
      />

      <GoogleOAuthButtons isLoading={isLoading} setIsLoading={setIsLoading} />

      <div className="my-6">
        <FormDivider />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <InputFormField
              form={form}
              name="email"
              placeholder="Email"
              icon={EnvelopeIcon}
              type="email"
              label="Email Address"
              required
            />

            {/* Password Field */}
            <PasswordField
              control={form.control}
              name="password"
              label="Password"
              placeholder="Enter your password"
            />

            {/* Forgot Password Link */}
            <div className="text-right">
              <button
                type="button"
                onClick={onSwitchToForgotPassword}
                className="text-primary text-sm transition-colors hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <LoadingButton
              isLoading={isLoading}
              disabled={isLoading || isPasskeyLoading}
            >
              Sign In
            </LoadingButton>

            {passkeySupported ? (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  handlePasskeySignIn();
                }}
                disabled={isLoading || isPasskeyLoading}
              >
                <FingerPrintIcon className="h-4 w-4" aria-hidden="true" />
                {isPasskeyLoading
                  ? "Waiting for passkey..."
                  : "Sign in with passkey"}
              </Button>
            ) : null}

            {failedEmail ? (
              <div className="border-border bg-muted text-muted-foreground rounded-md border p-3 text-sm">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => goToSignUpWithEmail(failedEmail)}
                  className="text-primary font-medium hover:underline"
                >
                  Sign up with {failedEmail}
                </button>
              </div>
            ) : null}
          </form>
        </Form>
      </motion.div>

      <AuthLink
        text="Don't have an account?"
        linkText="Sign up"
        onClick={onSwitchToSignUp}
      />
    </>
  );
}
