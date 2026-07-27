"use client";

import {
  ArrowPathIcon,
  CheckCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/ui/button";

import { billingService } from "../billing.service";
import {
  clearPendingCheckout,
  isPendingCheckoutStale,
  normalizeUpgradeStatus,
  PENDING_CHECKOUT_EVENT,
  type PendingCheckout,
  readPendingCheckout,
} from "../checkout";

/**
 * Shown after the user returns from a Blockradar checkout: polls the pending
 * upgrade reference until the deposit webhook lands, then refreshes billing
 * state so plan-gated features unlock without a manual reload. Renders
 * nothing when no checkout is pending.
 */
export function PendingCheckoutBanner() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PendingCheckout | null>(null);
  const [outcome, setOutcome] = useState<"completed" | "failed" | null>(null);

  useEffect(() => {
    const sync = () => {
      setPending(readPendingCheckout());
      setOutcome(null);
    };
    sync();
    // React immediately when a checkout starts/clears in this tab, and via
    // the storage event when it happens in another tab (e.g. /billing/success
    // confirming the payment).
    window.addEventListener(PENDING_CHECKOUT_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PENDING_CHECKOUT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Drives the stale cut-off without a reload. Ticks only while a checkout is
  // genuinely unresolved, and stops as soon as it is.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!pending || outcome !== null) return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [pending, outcome]);

  // Bounded: past the TTL we stop polling instead of hammering the status
  // endpoint every 7s forever on a checkout the user abandoned.
  const isStale = pending ? isPendingCheckoutStale(pending, now) : false;

  const statusQuery = useQuery({
    queryKey: ["billing", "checkout-status", pending?.reference],
    queryFn: () =>
      billingService.getBlockradarUpgradeStatus(pending?.reference ?? ""),
    enabled: Boolean(pending?.reference) && outcome === null && !isStale,
    // Poll until the webhook confirms the deposit, or the TTL runs out. The
    // app tab is backgrounded while the user pays in the checkout tab, so
    // background polling is required for the banner to self-resolve.
    refetchInterval: isStale ? false : 7_000,
    refetchIntervalInBackground: true,
    retry: false,
  });

  useEffect(() => {
    if (!pending || outcome !== null) return;
    if (!statusQuery.data) return;
    const status = normalizeUpgradeStatus(statusQuery.data);
    if (status === "pending") return;

    setOutcome(status);
    if (status === "completed") {
      clearPendingCheckout();
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      toast.success(
        `Payment confirmed — your ${pending.plan || "new"} plan is active and all features are unlocked.`
      );
    }
  }, [statusQuery.data, pending, outcome, queryClient]);

  const dismiss = () => {
    clearPendingCheckout();
    setPending(null);
    setOutcome(null);
  };

  if (!pending) return null;

  if (outcome === "completed") {
    return (
      <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 md:mx-6 lg:mx-8">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <CheckCircleIcon
            aria-hidden="true"
            className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400"
          />
          <span>
            <span className="font-medium">
              {pending.plan || "Plan"} is active.
            </span>{" "}
            Payment confirmed — all plan features are unlocked.
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 rounded-lg"
          aria-label="Dismiss"
          onClick={dismiss}
        >
          <XMarkIcon aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (outcome === "failed") {
    return (
      <div className="mx-4 mt-3 flex flex-col gap-2 rounded-xl border border-destructive/30 bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:mx-6 lg:mx-8">
        <div className="text-sm text-foreground">
          <span className="font-medium">
            Your {pending.plan || "plan"} payment didn&apos;t complete.
          </span>{" "}
          <span className="text-muted-foreground">
            If you already paid, contact support with reference{" "}
            <span className="font-mono text-xs">{pending.reference}</span>.
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 rounded-xl"
          onClick={dismiss}
        >
          Dismiss
        </Button>
      </div>
    );
  }

  // Waited past the TTL without a confirmation: stop the spinner, stop
  // polling, and hand over the reference instead of implying it's still
  // coming. If they never paid, "Hide" clears it for good.
  if (isStale) {
    return (
      <div className="mx-4 mt-3 flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:mx-6 lg:mx-8">
        <div className="text-sm text-foreground">
          <span className="font-medium">
            Still no confirmation for your {pending.plan || "plan"} payment.
          </span>{" "}
          <span className="text-muted-foreground">
            If you completed it, contact support with reference{" "}
            <span className="font-mono text-xs">{pending.reference}</span>.
            Otherwise you can safely dismiss this and try again.
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 rounded-xl"
          onClick={dismiss}
        >
          Dismiss
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 md:mx-6 lg:mx-8">
      <div className="flex items-center gap-2 text-sm text-foreground">
        <ArrowPathIcon
          aria-hidden="true"
          className="h-4 w-4 shrink-0 animate-spin text-primary"
        />
        <span>
          <span className="font-medium">
            Waiting for your {pending.plan || "plan"} payment…
          </span>{" "}
          <span className="text-muted-foreground">
            We&apos;ll unlock everything as soon as the payment confirms —
            usually within a couple of minutes.
          </span>
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="shrink-0 rounded-xl text-muted-foreground"
        onClick={dismiss}
      >
        Hide
      </Button>
    </div>
  );
}
