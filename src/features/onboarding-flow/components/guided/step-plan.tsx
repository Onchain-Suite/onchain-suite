"use client";

import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { cn, getSelectedOrganizationId } from "@/lib/utils";

import {
  billingService,
  SUITE_TIER_ANCHORS,
} from "@/features/billing/billing.service";
import {
  openCheckoutInNewTab,
  startPlanCheckout,
} from "@/features/billing/checkout";

const usd = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;
const clamp = (n: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, n));

const CONTACT_MAX = 150_000;

const TIER_LINE: Record<string, string> = {
  launch: "Up to 24,999 contacts",
  growth: "25,000 to 74,999 contacts",
  pro: "75,000+ contacts",
};

/**
 * Step 5 - the plan, in the guided layout (slider + tier rows) but wired to real billing. The
 * contact slider decides the Suite tier; prices come from the billing quote and the shared tier
 * anchors (the pricing SSOT, same numbers as Settings > Billing), never mock values. Nothing is
 * charged here: Continue opens the real checkout, Skip starts pay-as-you-go.
 */
export function StepPlan({
  onBack,
  onCompleted,
}: {
  onBack: () => void;
  onCompleted: (planSlug: string) => void;
}) {
  const [contacts, setContacts] = useState(11_000);
  const [submitting, setSubmitting] = useState(false);
  const [debounced, setDebounced] = useState(contacts);
  useEffect(() => {
    const h = window.setTimeout(() => setDebounced(contacts), 250);
    return () => window.clearTimeout(h);
  }, [contacts]);

  const quoteQuery = useQuery({
    queryKey: ["billing", "line-quote", "suite", debounced],
    queryFn: () =>
      billingService.getLineQuote("suite", debounced, { extraSeats: 0 }),
    enabled: debounced > 0,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
  const quote = quoteQuery.data;

  const isEmpty = contacts <= 0;
  const resolvedPlan = isEmpty ? "payg" : (quote?.plan ?? "launch");
  const headline = isEmpty
    ? "Free"
    : quote
      ? usd(quote.totalMonthlyPrice ?? quote.monthlyPrice)
      : "…";
  const pct = (clamp(contacts, 0, CONTACT_MAX) / CONTACT_MAX) * 100;

  const finish = async (choosePlan: boolean) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (!choosePlan || isEmpty) {
        const orgId = getSelectedOrganizationId();
        if (orgId && isEmpty) {
          await billingService
            .startPayg(orgId, { orgId })
            .catch(() => undefined);
        }
        onCompleted(isEmpty ? "payg" : "skipped");
        return;
      }
      const planRef = quote?.plan ?? "launch";
      const checkout = await startPlanCheckout(planRef, undefined, {
        paymentMethod: "card",
        contacts,
        extraSeats: 0,
      });
      if (!checkout?.paymentUrl) {
        toast.error("Checkout did not return a payment link. Try again.");
        return;
      }
      toast.success("Opening secure checkout in a new tab…");
      onCompleted(planRef);
      if (!openCheckoutInNewTab(checkout.paymentUrl)) {
        window.location.assign(checkout.paymentUrl);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't start checkout.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <h1 className="text-foreground text-3xl font-bold">Choose your plan</h1>
      <p className="text-muted-foreground mt-3">
        You won&apos;t be charged here, and you can change it any time.
      </p>

      {/* Contacts slider: it decides the tier. */}
      <div className="mt-8 rounded-xl border border-border p-4">
        <div className="flex items-baseline justify-between">
          <label
            htmlFor="ob-contacts"
            className="text-foreground text-sm font-medium"
          >
            How many contacts?
          </label>
          <span className="text-foreground text-lg font-bold tabular-nums">
            {isEmpty ? "0" : contacts.toLocaleString()}
          </span>
        </div>
        <input
          id="ob-contacts"
          type="range"
          min={0}
          max={CONTACT_MAX}
          step={500}
          value={clamp(contacts, 0, CONTACT_MAX)}
          onChange={(e) => setContacts(Number(e.target.value))}
          aria-label="Contacts"
          className="mt-3 w-full"
          style={{
            accentColor: "var(--primary)",
            background: `linear-gradient(90deg, var(--primary) ${pct}%, var(--border) ${pct}%)`,
          }}
        />
        <p className="text-muted-foreground mt-2 text-xs">
          A contact is one wallet, email address or X handle.
        </p>
      </div>

      {/* Tier rows, priced from the real anchors; the resolved one is highlighted. */}
      <div role="radiogroup" aria-label="Plan" className="mt-4 space-y-2.5">
        {SUITE_TIER_ANCHORS.map((t) => {
          const on = resolvedPlan === t.plan;
          const price =
            on && quote
              ? (quote.totalMonthlyPrice ?? quote.monthlyPrice)
              : t.monthlyPrice;
          return (
            <button
              key={t.plan}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setContacts(t.contacts)}
              className={cn(
                "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors",
                on
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-primary/40 hover:bg-muted/40"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  on ? "border-primary" : "border-border"
                )}
              >
                {on ? (
                  <span className="bg-primary h-2.5 w-2.5 rounded-full" />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <b className="text-foreground font-semibold">{t.planLabel}</b>
                  <span className="text-foreground font-semibold tabular-nums">
                    {usd(price)}
                    <span className="text-muted-foreground text-xs font-normal">
                      /mo
                    </span>
                  </span>
                </span>
                <span className="text-muted-foreground mt-0.5 block text-sm">
                  {TIER_LINE[t.plan] ?? ""}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <footer className="mt-8 flex items-center justify-between gap-3">
        <Button variant="secondary" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <span className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => finish(false)}
            disabled={submitting}
          >
            Skip for now
          </Button>
          <Button onClick={() => finish(true)} disabled={submitting}>
            {submitting
              ? "Setting up…"
              : isEmpty
                ? "Start free"
                : `Continue with ${quote?.planLabel ?? "Launch"}`}
            {!submitting ? (
              <ArrowRightIcon aria-hidden="true" className="ml-1.5 h-4 w-4" />
            ) : null}
          </Button>
        </span>
      </footer>

      <p className="text-muted-foreground mt-3 text-center text-xs">
        {isEmpty
          ? "No credit card required. Upgrade anytime."
          : `${headline}/mo · you complete payment on a secure checkout page, and the price shown is what you're billed.`}
      </p>
    </>
  );
}
