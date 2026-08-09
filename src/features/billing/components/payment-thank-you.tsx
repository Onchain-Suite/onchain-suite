"use client";

import {
  ArrowPathIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/ui/button";

import { billingService } from "../billing.service";
import {
  clearPendingCheckout,
  normalizeUpgradeStatus,
  readPendingCheckout,
} from "../checkout";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

type PageState = "confirming" | "confirmed" | "processing" | "failed";

const FAILED_URL_STATUSES = new Set([
  "failed",
  "cancelled",
  "canceled",
  "expired",
  "error",
]);

/**
 * Return target for a hosted checkout — Stripe's `success_url`
 * (`/billing/success?ref=…`) by default, and the Blockradar payment link's
 * redirect on the crypto path. When we know the upgrade reference — from a
 * `?ref=`/`?reference=` query param or the locally stored pending checkout —
 * the page polls until the provider webhook confirms and unlocks the plan.
 * Without a reference (or without a session) it degrades to a static "payment
 * received" confirmation, since activation happens server-side via the webhook
 * either way.
 */
export function PaymentThankYou() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);

  const [pending, setPending] = useState(() => readPendingCheckout());
  useEffect(() => {
    setPending(readPendingCheckout());
  }, []);

  const reference = useMemo(() => {
    const fromUrl = (
      searchParams?.get("reference") ??
      searchParams?.get("ref") ??
      ""
    ).trim();
    return fromUrl.length > 0 ? fromUrl : (pending?.reference ?? "");
  }, [searchParams, pending?.reference]);

  // The provider redirect may carry ?status= — treat explicit failure values
  // as a failed checkout, but keep polling: a late webhook can still confirm.
  const failedFromUrl = FAILED_URL_STATUSES.has(
    (searchParams?.get("status") ?? "").trim().toLowerCase()
  );

  const planName = pending?.plan ?? "";
  const providerLabel =
    pending?.paymentMethod === "card" ||
    pending?.mode?.toLowerCase().includes("stripe") === true
      ? "Stripe"
      : "Blockradar";

  const statusQuery = useQuery({
    queryKey: ["billing", "checkout-status", reference],
    queryFn: () => billingService.getCheckoutStatus(reference),
    enabled: reference.length > 0 && !confirmed,
    refetchInterval: 7_000,
    refetchIntervalInBackground: true,
    retry: false,
  });

  useEffect(() => {
    if (confirmed || !statusQuery.data) return;
    if (normalizeUpgradeStatus(statusQuery.data) === "completed") {
      setConfirmed(true);
      clearPendingCheckout();
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    }
  }, [statusQuery.data, confirmed, queryClient]);

  // Failed/unknown statuses aren't surfaced as errors here — the user just
  // paid, and false alarms (webhook lag, logged-out polling) would be worse
  // than the neutral "being confirmed" message.
  const state: PageState = confirmed
    ? "confirmed"
    : failedFromUrl
      ? "failed"
      : reference.length > 0 && !statusQuery.isError
        ? "confirming"
        : "processing";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
          <CheckCircleIcon
            aria-hidden="true"
            className="h-9 w-9 text-primary"
          />
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {state === "failed"
            ? "Payment not completed"
            : "Thank you — payment received!"}
        </h1>

        <p className="mt-3 text-base text-muted-foreground">
          {state === "confirmed"
            ? `Your ${planName || "new"} plan is active and every feature is unlocked. Welcome aboard.`
            : state === "failed"
              ? "The checkout was cancelled or didn't go through. No worries — you can restart the upgrade anytime from Settings → Billing."
              : "We're confirming your payment. Your plan activates automatically — this usually takes just a few seconds."}
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-card px-5 py-4 text-left">
          {state === "confirmed" ? (
            <div className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircleIcon
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400"
              />
              <span>
                <span className="font-medium">Payment confirmed.</span>{" "}
                {planName ? `${planName} plan activated.` : "Plan activated."}
              </span>
            </div>
          ) : state === "failed" ? (
            <div className="text-sm text-foreground">
              <span className="font-medium">Nothing was charged.</span>{" "}
              <span className="text-muted-foreground">
                If you did complete the payment, keep this page open — it
                updates automatically when the transaction confirms.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-foreground">
              <ArrowPathIcon
                aria-hidden="true"
                className="h-4 w-4 shrink-0 animate-spin text-primary"
              />
              <span>
                <span className="font-medium">
                  {state === "confirming"
                    ? "Confirming your payment…"
                    : "Payment processing."}
                </span>{" "}
                <span className="text-muted-foreground">
                  You can head back to the app now — everything unlocks the
                  moment it confirms.
                </span>
              </span>
            </div>
          )}
          {reference ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Reference: <span className="font-mono">{reference}</span>
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild className="w-full rounded-xl px-6 sm:w-auto">
            <Link href={PRIVATE_ROUTES.DASHBOARD}>
              Go to dashboard
              <ArrowRightIcon aria-hidden="true" className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full rounded-xl px-6 sm:w-auto"
          >
            <Link href={`${PRIVATE_ROUTES.SETTINGS}?tab=billing`}>
              View billing
            </Link>
          </Button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Questions about your payment? Contact support
          {reference ? " and include the reference above" : ""}.
        </p>
      </div>
    </main>
  );
}
