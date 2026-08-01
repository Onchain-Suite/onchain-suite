"use client";

import { EnvelopeIcon, UserIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { CheckboxFormField, InputFormField } from "@/components/form-fields";
import { Form } from "@/ui/form";
import { LoadingButton } from "@/ui/loading-button";

import { useLocalStorage } from "@/hooks/client";
import { authClient, signInWithGoogle } from "@/lib/auth-client";
import { isJsonObject } from "@/lib/utils";

import {
  AuthHeader,
  AuthLink,
  FormDivider,
  OAuthButtons,
  PasswordField,
  PasswordStrengthIndicator,
} from "./shared";
import { syncUserDataWithGuard } from "@/auth/actions";
import { type SignUpFormData, signUpSchema } from "@/auth/validation";

interface SignUpFormProps {
  onSwitchToSignIn: () => void;
}

export function SignUpForm({ onSwitchToSignIn }: SignUpFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const { setValue } = useLocalStorage<SignUpFormData | null>("user", null);

  const searchParams = useSearchParams();
  // Prefill email when arriving from the sign-in "no account" flow
  // (/auth/signup?email=...).
  const prefilledEmail = searchParams?.get("email")?.trim() ?? "";

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: prefilledEmail,
      password: "",
      confirmPassword: "",
      acceptTerms: false,
      marketingEmails: false,
    },
  });

  const password = form.watch("password");

  const pickNonEmptyString = (...values: unknown[]) => {
    for (const value of values) {
      if (typeof value === "string" && value.trim().length > 0) return value;
    }
    return undefined;
  };

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    try {
      const { error } = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: `${data.firstName} ${data.lastName}`,
      });

      if (error) {
        toast.error(
          pickNonEmptyString(error.message) ??
            "Failed to create account. Please try again."
        );
        return;
      }

      try {
        // Sync user data to ensure firstName/lastName are saved properly
        await syncUserDataWithGuard(data);
      } catch (err) {
        console.error("Failed to sync user data:", err);
      }

      // Store form data for onboarding
      setValue(data);
      toast.success(
        "Account created successfully! Please check your email to verify your account."
      );
      form.reset();
    } catch (error: unknown) {
      console.error("Sign up error:", error);
      const response = isJsonObject(error) ? error.response : undefined;
      const data = isJsonObject(response) ? response.data : undefined;
      const message = isJsonObject(data) ? data.message : undefined;
      const displayMessage =
        pickNonEmptyString(
          message,
          error instanceof Error ? error.message : undefined
        ) ?? "Failed to create account. Please try again.";
      toast.error(displayMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const safeRedirectPath = (raw: string | null): string | null => {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed.startsWith("/")) return null;
    if (trimmed.startsWith("//")) return null;
    return trimmed;
  };

  const handleOAuthSignUp = async (provider: string) => {
    setIsLoading(true);
    try {
      // Invited members arrive with redirectTo (the invite accept link) —
      // honor it for both existing and NEW users so they never land in the
      // owner-only onboarding flow.
      const redirectTo = safeRedirectPath(
        searchParams?.get("redirectTo") ?? null
      );
      await signInWithGoogle(
        redirectTo
          ? { callbackURL: redirectTo, newUserCallbackURL: redirectTo }
          : undefined
      );
    } catch (error: unknown) {
      console.error("OAuth error:", error);
      toast.error(`Failed to sign up with ${provider}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthHeader
        title="Create your account"
        subtitle="Join Onchain Suite and revolutionize your marketing"
      />

      <OAuthButtons onOAuthSignIn={handleOAuthSignUp} isLoading={isLoading} />

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
            {/* Name Fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <InputFormField
                form={form}
                name="firstName"
                placeholder="First name"
                label="First Name"
                icon={UserIcon}
                required
              />

              <InputFormField
                form={form}
                name="lastName"
                placeholder="Last name"
                label="Last Name"
                icon={UserIcon}
                required
              />
            </div>

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
            <div className="space-y-2">
              <PasswordField
                control={form.control}
                name="password"
                label="Password"
                placeholder="Create a password"
              />
              <PasswordStrengthIndicator password={password ?? ""} />
            </div>

            {/* Confirm Password Field */}
            <PasswordField
              control={form.control}
              name="confirmPassword"
              label="Confirm Password"
              placeholder="Confirm your password"
            />

            {/* Terms and Marketing Checkboxes */}
            <div className="space-y-3">
              <CheckboxFormField
                form={form}
                name="acceptTerms"
                label={
                  <>
                    I agree to the{" "}
                    <Link href="#" className="text-primary hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="#" className="text-primary hover:underline">
                      Privacy Policy
                    </Link>
                  </>
                }
              />

              <CheckboxFormField
                form={form}
                name="marketingEmails"
                label="I'd like to receive marketing emails about Onchain Suite
                      updates and features"
              />
            </div>

            <LoadingButton isLoading={isLoading} disabled={isLoading}>
              Create Account
            </LoadingButton>
          </form>
        </Form>
      </motion.div>

      <AuthLink
        text="Already have an account?"
        linkText="Sign in"
        onClick={onSwitchToSignIn}
      />
    </>
  );
}
