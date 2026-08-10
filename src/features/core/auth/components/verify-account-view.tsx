"use client";

import {
  ArrowPathIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { cn, isJsonObject } from "@/lib/utils";

import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { AUTH_ROUTES } from "@/shared/config/app-routes";

function VerifyAccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? null;
  const [status, setStatus] = useState<
    "verifying" | "success" | "error" | "pending"
  >(token ? "verifying" : "pending");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("pending");
      return;
    }

    const verifyEmail = async () => {
      try {
        // We now call our custom verification API which handles the
        // selector/verifier hashing logic and updates the user status.
        const response = await fetch(
          `/api/v1/auth/verify-email?token=${token}`
        );

        let data: unknown = null;
        try {
          data = await response.json();
        } catch (e) {
          console.error("Failed to parse verification API response", e);
        }

        if (!response.ok) {
          const message = isJsonObject(data) ? data.message : undefined;
          console.error("Verification error:", message);
          setStatus("error");
          toast.error(
            typeof message === "string" && message.length > 0
              ? message
              : "Verification failed"
          );
          return;
        }

        setStatus("success");
        toast.success("Email verified successfully!");

        // Invited members carry a redirectTo (their invite accept link) -
        // send them there; owners continue to onboarding.
        const redirectToRaw = searchParams?.get("redirectTo") ?? "";
        const redirectTo =
          redirectToRaw.startsWith("/") && !redirectToRaw.startsWith("//")
            ? redirectToRaw
            : null;
        const timer = setTimeout(() => {
          router.push(redirectTo ?? AUTH_ROUTES.ONBOARDING);
        }, 5000);
        return () => clearTimeout(timer);
      } catch (error) {
        console.error("Verification exception:", error);
        setStatus("error");
        toast.error("An unexpected error occurred during verification");
      }
    };

    verifyEmail();
  }, [token, router, searchParams]);

  const handleResend = async () => {
    // Better-auth uses sendVerificationEmail
    setResending(true);
    try {
      // We need the email to resend, but if we don't have it (e.g. from session)
      // we might need to ask the user or get it from a query param if provided
      const email = searchParams?.get("email") ?? null;

      if (!email) {
        toast.error("Please log in to resend verification email");
        router.push(AUTH_ROUTES.LOGIN);
        return;
      }

      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: window.location.origin + AUTH_ROUTES.VERIFY_ACCOUNT,
      });

      if (error) {
        toast.error(
          typeof error?.message === "string" && error.message.length > 0
            ? error.message
            : "Failed to resend verification email"
        );
      } else {
        toast.success("Verification email resent!");
      }
    } catch (_e) {
      String(_e);
      toast.error("An unexpected error occurred");
    } finally {
      setResending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] bg-card/50 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-6">
            <div
              className={cn(
                "h-20 w-20 rounded-2xl flex items-center justify-center transition-all duration-500",
                status === "verifying" &&
                  "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 animate-pulse",
                status === "success" &&
                  "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 scale-110",
                status === "error" &&
                  "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
                status === "pending" &&
                  "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
              )}
            >
              {status === "verifying" && (
                <ArrowPathIcon
                  aria-hidden="true"
                  className="h-10 w-10 animate-spin"
                />
              )}
              {status === "success" && (
                <CheckCircleIcon aria-hidden="true" className="h-10 w-10" />
              )}
              {status === "error" && (
                <XCircleIcon aria-hidden="true" className="h-10 w-10" />
              )}
              {status === "pending" && (
                <EnvelopeIcon aria-hidden="true" className="h-10 w-10" />
              )}
            </div>
          </div>
          <CardTitle className="text-3xl font-light tracking-tight text-(--brand-oxford-blue) dark:text-foreground">
            {status === "verifying" && "Verifying account"}
            {status === "success" && "Welcome aboard!"}
            {status === "error" && "Verification failed"}
            {status === "pending" && "Check your inbox"}
          </CardTitle>
          <CardDescription className="text-base mt-3 text-muted-foreground/80 leading-relaxed px-4">
            {status === "verifying" &&
              "We're currently validating your email address. This will only take a moment."}
            {status === "success" &&
              "Your email has been verified. We're getting your workspace ready now."}
            {status === "error" &&
              "The verification link is invalid or has expired. Please request a new one."}
            {status === "pending" &&
              "We've sent a verification link to your email. Please click it to confirm your account."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {status === "success" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                onClick={() => {
                  const raw = searchParams?.get("redirectTo") ?? "";
                  const safe =
                    raw.startsWith("/") && !raw.startsWith("//") ? raw : null;
                  router.push(safe ?? AUTH_ROUTES.ONBOARDING);
                }}
                className="w-full h-12 bg-(--brand-blue) hover:bg-(--brand-blue)/90 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-300"
              >
                Go to Dashboard
              </Button>
            </motion.div>
          )}
          {status === "error" && (
            <div className="space-y-3">
              <Button
                onClick={handleResend}
                disabled={resending}
                className="w-full h-12 bg-(--brand-blue) hover:bg-(--brand-blue)/90 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-300"
              >
                {resending ? (
                  <ArrowPathIcon
                    aria-hidden="true"
                    className="mr-2 h-4 w-4 animate-spin"
                  />
                ) : (
                  <PaperAirplaneIcon
                    aria-hidden="true"
                    className="mr-2 h-4 w-4"
                  />
                )}
                Resend Verification Email
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push(AUTH_ROUTES.LOGIN)}
                className="w-full h-12 rounded-xl text-muted-foreground hover:bg-muted/50"
              >
                Back to Login
              </Button>
            </div>
          )}
          {status === "pending" && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-2xl border border-border/50">
                <p className="text-sm text-center text-muted-foreground italic">
                  Confirming your email helps us keep your account secure.
                </p>
              </div>
              <Button
                onClick={handleResend}
                disabled={resending}
                className="w-full h-12 bg-(--brand-blue) hover:bg-(--brand-blue)/90 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-300"
              >
                {resending ? (
                  <ArrowPathIcon
                    aria-hidden="true"
                    className="mr-2 h-4 w-4 animate-spin"
                  />
                ) : (
                  <PaperAirplaneIcon
                    aria-hidden="true"
                    className="mr-2 h-4 w-4"
                  />
                )}
                Resend Verification Email
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-center border-t border-border/50 py-6">
          <p className="text-sm text-muted-foreground">
            Need help?{" "}
            <a
              href="mailto:support@onchain.com"
              className="text-(--brand-blue) hover:underline font-medium"
            >
              Contact Support
            </a>
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

export function VerifyAccountView() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <ArrowPathIcon
            aria-hidden="true"
            className="h-8 w-8 animate-spin text-blue-600"
          />
        </div>
      }
    >
      <VerifyAccountContent />
    </Suspense>
  );
}
