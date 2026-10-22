"use client";

import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { cn, getSelectedOrganizationId } from "@/lib/utils";

import {
  billingService,
  SEND_MIN_SUBSCRIBERS,
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
const SEND_MAX = 500_000;

type Line = "suite" | "send" | "payg";

const LINES: { id: Line; name: string; sub: string }[] = [
  { id: "suite", name: "Suite", sub: "Wallet + email" },
  { id: "send", name: "Send", sub: "Email only" },
  { id: "payg", name: "Pay as you go", sub: "$0 + usage" },
];

const TIER_LINE: Record<string, string> = {
  launch: "Up to 24,999 contacts",
  growth: "25,000 to 74,999 contacts",
  pro: "75,000+ contacts",
};

/**
 * Step 5 - the plan, in the guided layout but wired to real billing. A Suite / Send / Pay-as-you-go
 * line chooser, then a slider that decides the tier (Suite) or the size (Send); prices come from
 * the billing quote and the shared tier anchors (the pricing SSOT, same numbers as Settings >
 * Billing), never mock values. Nothing is charged here: Continue opens the real checkout, Skip
 * starts pay-as-you-go.
 */
export function StepPlan({
  onBack,
  onCompleted,
}: {
  onBack: () => void;
  onCompleted: (planSlug: string) => void;
}) {
  const [selection, setSelection] = useState<Line>("suite");
  const [contacts, setContacts] = useState(11_000);
  const [subscribers, setSubscribers] = useState(10_000);
  const [submitting, setSubmitting] = useState(false);

  const units = selection === "send" ? subscribers : contacts;
  const [debounced, setDebounced] = useState(units);
  useEffect(() => {
    const h = window.setTimeout(() => setDebounced(units), 250);
    return () => window.clearTimeout(h);
  }, [units]);

  const quoteQuery = useQuery({
    queryKey: ["billing", "line-quote", selection, debounced],
    queryFn: () =>
      billingService.getLineQuote(
        selection === "send" ? "send" : "suite",
        debounced,
        { extraSeats: 0 }
      ),
    enabled: selection !== "payg",
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
  const quote = quoteQuery.data;

  const isEmptySuite = selection === "suite" && contacts <= 0;
  const resolvedPlan =
    selection === "payg" || isEmptySuite
      ? "payg"
      : selection === "send"
        ? "send"
        : (quote?.plan ?? "launch");
  const headline =
    selection === "payg" || isEmptySuite
      ? "$0"
      : quote
        ? usd(quote.totalMonthlyPrice ?? quote.monthlyPrice)
        : "…";

  const sliderMax = selection === "send" ? SEND_MAX : CONTACT_MAX;
  const sliderMin = selection === "send" ? SEND_MIN_SUBSCRIBERS : 0;
  const pct =
    ((clamp(units, sliderMin, sliderMax) - sliderMin) /
      (sliderMax - sliderMin)) *
    100;

  const finish = async (choosePlan: boolean) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (!choosePlan || resolvedPlan === "payg") {
        const orgId = getSelectedOrganizationId();
        if (orgId && resolvedPlan === "payg") {
          await billingService
            .startPayg(orgId, { orgId })
            .catch(() => undefined);
        }
        onCompleted(resolvedPlan === "payg" ? "payg" : "skipped");
        return;
      }
      const planRef = selection === "send" ? "send" : (quote?.plan ?? "launch");
      const checkout = await startPlanCheckout(planRef, undefined, {
        paymentMethod: "card",
        contacts: units,
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

  const continueLabel =
    resolvedPlan === "payg"
      ? "Start free"
      : selection === "send"
        ? "Continue with Send"
        : `Continue with ${quote?.planLabel ?? "Launch"}`;

  return (
    <>
      <h1 className="text-foreground text-3xl font-bold">Choose your plan</h1>
      <p className="text-muted-foreground mt-3">
        You won&apos;t be charged here, and you can change it any time.
      </p>

      {/* Line chooser: Suite / Send / Pay-as-you-go. */}
      <div
        role="radiogroup"
        aria-label="Plan line"
        className="mt-8 grid grid-cols-3 gap-2"
      >
        {LINES.map((l) => {
          const on = selection === l.id;
          return (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setSelection(l.id)}
              className={cn(
                "rounded-xl border-2 px-3 py-2.5 text-left transition-colors",
                on
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              )}
            >
              <span
                className={cn(
                  "block text-sm font-semibold",
                  on ? "text-primary" : "text-foreground"
                )}
              >
                {l.name}
              </span>
              <span className="text-muted-foreground block text-[11px]">
                {l.sub}
              </span>
            </button>
          );
        })}
      </div>

      {selection !== "payg" ? (
        <>
          {/* Size slider: decides the Suite tier, or sizes the Send list. */}
          <div className="mt-4 rounded-xl border border-border p-4">
            <div className="flex items-baseline justify-between">
              <label
                htmlFor="ob-units"
                className="text-foreground text-sm font-medium"
              >
                {selection === "send"
                  ? "How many subscribers?"
                  : "How many contacts?"}
              </label>
              <span className="text-foreground text-lg font-bold tabular-nums">
                {units.toLocaleString()}
              </span>
            </div>
            <input
              id="ob-units"
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={selection === "send" ? 1000 : 500}
              value={clamp(units, sliderMin, sliderMax)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (selection === "send") setSubscribers(v);
                else setContacts(v);
              }}
              aria-label={selection === "send" ? "Subscribers" : "Contacts"}
              className="mt-3 w-full"
              style={{
                accentColor: "var(--primary)",
                background: `linear-gradient(90deg, var(--primary) ${pct}%, var(--border) ${pct}%)`,
              }}
            />
            <p className="text-muted-foreground mt-2 text-xs">
              {selection === "send"
                ? "Email only, priced per subscriber."
                : "A contact is one wallet, email address or X handle."}
            </p>
          </div>

          {/* Send: a prominent price, so the monthly cost is unmissable. */}
          {selection === "send" ? (
            <div className="border-primary/30 bg-primary/5 mt-4 flex items-end justify-between rounded-xl border p-4">
              <div>
                <span className="text-muted-foreground block text-xs font-medium">
                  Your Send plan
                </span>
                <span className="text-muted-foreground mt-0.5 block text-sm">
                  {subscribers.toLocaleString()} subscribers · email only
                </span>
              </div>
              <div className="text-right">
                <span className="text-foreground text-3xl font-bold tabular-nums">
                  {headline}
                </span>
                <span className="text-muted-foreground text-sm font-medium">
                  /mo
                </span>
              </div>
            </div>
          ) : null}

          {/* Suite: the tier rows, priced from the real anchors; resolved tier highlighted. */}
          {selection === "suite" ? (
            <div
              role="radiogroup"
              aria-label="Plan"
              className="mt-4 space-y-2.5"
            >
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
                        <b className="text-foreground font-semibold">
                          {t.planLabel}
                        </b>
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
          ) : null}
        </>
      ) : (
        // Pay-as-you-go: the metered $0 entry, no sizing.
        <div className="mt-4 rounded-xl border border-border p-4">
          <div className="flex items-baseline gap-2">
            <span className="text-foreground text-2xl font-bold">$0</span>
            <span className="text-muted-foreground text-sm">/mo + usage</span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Every capability, metered at list price. Prepaid wallet, $10 minimum
            top-up. Free until you import contacts.
          </p>
        </div>
      )}

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
            {submitting ? "Setting up…" : continueLabel}
            {!submitting ? (
              <ArrowRightIcon aria-hidden="true" className="ml-1.5 h-4 w-4" />
            ) : null}
          </Button>
        </span>
      </footer>

      <p className="text-muted-foreground mt-3 text-center text-xs">
        {resolvedPlan === "payg"
          ? "No credit card required. Upgrade anytime."
          : "You complete payment on a secure checkout page, and the price shown is what you're billed."}
      </p>
    </>
  );
}
