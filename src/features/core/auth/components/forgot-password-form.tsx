"use client";

import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { InputFormField } from "@/components/form-fields";
import { Button } from "@/ui/button";
import { Form } from "@/ui/form";
import { LoadingButton } from "@/ui/loading-button";

import { authClient } from "@/lib/auth-client";

import {
  type ForgotPasswordFormData,
  forgotPasswordSchema,
} from "../validation";
import { AuthHeader } from "./shared";

interface ForgotPasswordFormProps {
  onSwitchToSignIn: () => void;
}

export function ForgotPasswordForm({
  onSwitchToSignIn,
}: ForgotPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const email = form.watch("email");

  // better-auth responds with success even for unknown emails
  // (anti-enumeration), so a fulfilled request always moves to the
  // "check your email" view.
  const requestReset = async (targetEmail: string): Promise<boolean> => {
    const { data, error } = await authClient.requestPasswordReset({
      email: targetEmail,
      redirectTo: "/auth/reset-password",
    });

    if (error) {
      toast.error(error.message ?? "Failed to send reset email");
      return false;
    }
    toast.success(
      (data as { message?: string } | null)?.message ??
        "Password reset link sent - check your email"
    );
    return true;
  };

  const onSubmit = async (value: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      if (await requestReset(value.email)) {
        setIsEmailSent(true);
        setCountdown(60);
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (countdown > 0) return;

    setIsLoading(true);
    try {
      if (await requestReset(email)) {
        setCountdown(60);
      }
    } catch (error) {
      console.error("Resend error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  return (
    <AnimatePresence mode="wait">
      {!isEmailSent ? (
        <motion.div
          key="forgot-form"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.4 }}
        >
          <AuthHeader
            icon={EnvelopeIcon}
            title="Forgot your password?"
            subtitle="No worries! Enter your email and we'll send you a reset link."
          />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <InputFormField
                form={form}
                name="email"
                placeholder="Email"
                icon={EnvelopeIcon}
                type="email"
                label="Email Address"
                required
              />

              <LoadingButton isLoading={isLoading}>
                Send Reset Link
              </LoadingButton>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <button
              onClick={onSwitchToSignIn}
              className="text-muted-foreground hover:text-primary inline-flex items-center text-sm transition-colors"
            >
              <ArrowLeftIcon aria-hidden="true" className="mr-2 h-4 w-4" />
              Back to sign in
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="success-message"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20"
          >
            <CheckCircleIcon
              aria-hidden="true"
              className="h-8 w-8 text-green-600 dark:text-green-400"
            />
          </motion.div>

          <h1 className="mb-2 text-2xl font-bold">Check your email</h1>
          <p className="text-muted-foreground mb-6">
            We&apos;ve sent a password reset link to{" "}
            <span className="text-foreground font-medium">{email}</span>
          </p>

          <div className="bg-muted/50 mb-6 rounded-lg p-4 text-left">
            <h3 className="mb-2 font-medium">What&apos;s next?</h3>
            <ul className="text-muted-foreground space-y-1 text-sm">
              <li>• Check your email inbox (and spam folder)</li>
              <li>• Click the reset link in the email</li>
              <li>• Create a new password</li>
              <li>• Sign in with your new password</li>
            </ul>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleResendEmail}
              variant="outline"
              className="h-12 w-full"
              disabled={countdown > 0 || isLoading}
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                  className="h-5 w-5 rounded-full border-2 border-current border-t-transparent"
                />
              ) : countdown > 0 ? (
                <>
                  <ClockIcon aria-hidden="true" className="mr-2 h-4 w-4" />
                  Resend in {countdown}s
                </>
              ) : (
                <>
                  <EnvelopeIcon aria-hidden="true" className="mr-2 h-4 w-4" />
                  Resend Email
                </>
              )}
            </Button>

            <button
              onClick={onSwitchToSignIn}
              className="text-muted-foreground hover:text-primary inline-flex items-center text-sm transition-colors"
            >
              <ArrowLeftIcon aria-hidden="true" className="mr-2 h-4 w-4" />
              Back to sign in
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
