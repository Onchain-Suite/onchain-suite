"use client";

import {
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/ui/button";
import { Form } from "@/ui/form";
import { LoadingButton } from "@/ui/loading-button";

import { authClient } from "@/lib/auth-client";

import { type ResetPasswordFormData, resetPasswordSchema } from "../validation";
import { AuthHeader, PasswordField, PasswordStrengthIndicator } from "./shared";

interface ResetPasswordFormProps {
  token?: string;
  onPasswordReset?: () => void;
}

export function ResetPasswordForm({
  token,
  onPasswordReset,
}: ResetPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const hasToken = typeof token === "string" && token.trim().length > 0;

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const password = form.watch("password");

  const onSubmit = async (value: ResetPasswordFormData) => {
    setIsLoading(true);
    setSubmitError(null);
    const { password } = value;

    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (error) {
        const message =
          error.message ??
          "This reset link is invalid or has expired. Request a new one.";
        setSubmitError(message);
        toast.error(message);
        return;
      }

      setIsSuccess(true);
      toast.success("Password reset successfully!");
      // Redirect after success
      setTimeout(() => {
        onPasswordReset?.();
      }, 3000);
    } catch (error) {
      console.error("Reset password error:", error);
      setSubmitError("An unexpected error occurred. Please try again.");
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // A reset link without a token can never succeed - say so up front
  // instead of failing after the user has typed a new password.
  if (!hasToken && !isSuccess) {
    return (
      <div className="text-center">
        <AuthHeader
          icon={ExclamationCircleIcon}
          title="This reset link isn't valid"
          subtitle="The link is missing its reset token - it may have expired or been copied incompletely."
        />
        <Button asChild className="h-12 w-full">
          <Link href="/auth/forgot-password">Request a new reset link</Link>
        </Button>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {!isSuccess ? (
        <motion.div
          key="reset-form"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.4 }}
        >
          <AuthHeader
            icon={ShieldCheckIcon}
            title="Reset your password"
            subtitle="Create a new secure password for your Onchain Suite account"
          />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <PasswordField
                  control={form.control}
                  name="password"
                  label="New Password"
                  placeholder="Create a new password"
                />
                <PasswordStrengthIndicator password={password} />
              </div>

              <PasswordField
                control={form.control}
                name="confirmPassword"
                label="Confirm New Password"
                placeholder="Confirm your new password"
              />

              {submitError ? (
                <div
                  role="alert"
                  className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-md border p-3 text-sm"
                >
                  <ExclamationCircleIcon
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />
                  <span>{submitError}</span>
                </div>
              ) : null}

              <LoadingButton isLoading={isLoading}>
                Reset Password
              </LoadingButton>
            </form>
          </Form>
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

          <h1 className="mb-2 text-2xl font-bold">
            Password reset successful!
          </h1>
          <p className="text-muted-foreground mb-6">
            Your password has been successfully updated. You can now sign in
            with your new password.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20"
          >
            <p className="text-sm text-green-800 dark:text-green-200">
              Redirecting you to sign in page in 3 seconds...
            </p>
          </motion.div>

          <Button onClick={onPasswordReset} className="group h-12 w-full">
            Continue to Sign In
            <ArrowRightIcon
              aria-hidden="true"
              className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
            />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
