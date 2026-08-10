"use client";

import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckIcon,
  CreditCardIcon,
  SparklesIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { cn, getSelectedOrganizationId } from "@/lib/utils";

import { type BillingPlan, billingService } from "../billing.service";
import { openCheckoutInNewTab, startPlanCheckout } from "../checkout";

type PaymentMethod = "card" | "crypto";

/** v4 catalogue (docs/pricing.md). Shown only when the backend plan list is
 *  unavailable; the charged price always comes from the backend at checkout. */
const FALLBACK_PAID_PLANS: BillingPlan[] = [
  {
    name: "Launch",
    slug: "launch",
    price: 49,
    interval: "month",
    description: "A protocol getting started on email + wallet.",
    features: [
      "2,500 contacts · 50,000 emails/mo",
      "25,000 in-app pushes/mo",
      "Intelligence at sample size",
      "2 team seats",
    ],
  },
  {
    name: "Growth",
    slug: "growth",
    price: 349,
    interval: "month",
    description: "Scaling retention, with Forms and a dedicated IP.",
    features: [
      "25,000 contacts · 250,000 emails/mo",
      "250,000 in-app pushes/mo",
      "Forms + dedicated IP",
      "4 team seats",
    ],
  },
  {
    name: "Pro",
    slug: "pro",
    price: 799,
    interval: "month",
    description: "Intelligence at working scale across a large list.",
    features: [
      "75,000 contacts · 750,000 emails/mo",
      "1,000,000 in-app pushes/mo",
      "Intelligence at working scale",
      "7 team seats",
    ],
  },
  {
    name: "Scale",
    slug: "scale",
    price: 2299,
    interval: "month",
    description: "Custom allowances and concierge for big ecosystems.",
    features: [
      "150,000 contacts · 1.5M emails/mo",
      "2,000,000 in-app pushes/mo",
      "5 concierge hours/mo",
      "Custom team seats",
    ],
  },
];

/** The platform baseline every plan (PAYG included) ships with, shown as a
 *  reassurance strip so buyers see they get the whole product, not a slice. */
const EVERY_PLAN_INCLUDES = [
  "In-app push to every connected wallet",
  "Email over a wallet-linked identity bridge",
  "Behavior-triggered automations + Protocol Plays",
  "On-chain Intelligence (from Launch up)",
  "ONS+ list protection on every upload",
  "Pay by card (Stripe) or crypto (USDC)",
];

/** Side-by-side allowance table (docs/pricing.md v4 §1). This IS the plan
 *  selector: each column header is a radio, the picked plan's column
 *  highlights. PAYG's metered channels read "Metered" (no bundled allowance). */
const COMPARISON_PLANS: { key: string; label: string }[] = [
  { key: "payg", label: "PAYG" },
  { key: "Launch", label: "Launch" },
  { key: "Growth", label: "Growth" },
  { key: "Pro", label: "Pro" },
  { key: "Scale", label: "Scale" },
];

const COMPARISON_ROWS: { label: string; values: string[] }[] = [
  {
    label: "Price / mo",
    values: ["$0 + usage", "$49", "$349", "$799", "$2,299"],
  },
  {
    label: "Contacts",
    values: ["1,000 (cap)", "2,500", "25,000", "75,000", "150,000"],
  },
  {
    label: "Emails",
    values: ["Metered", "50,000", "250,000", "750,000", "1,500,000"],
  },
  {
    label: "In-app push",
    values: ["Metered", "25,000", "250,000", "1,000,000", "2,000,000"],
  },
  {
    label: "On-chain credits",
    values: ["Metered", "1,000", "10,000", "25,000", "50,000"],
  },
];

function PlanComparison({
  selectedPlan,
  currentPlan,
  onSelect,
}: {
  selectedPlan: string;
  currentPlan?: string;
  onSelect: (planKey: string) => void;
}) {
  const currentName = (currentPlan ?? "").trim().toLowerCase();
  return (
    <div
      role="radiogroup"
      aria-label="Billing plan"
      className="overflow-x-auto rounded-2xl border border-border"
    >
      <table className="w-full min-w-[600px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th
              scope="col"
              className="sticky left-0 z-10 bg-muted/60 px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              Plan
            </th>
            {COMPARISON_PLANS.map((p) => {
              const active = selectedPlan === p.key;
              const isCurrent =
                p.key.toLowerCase() === currentName ||
                (p.key === "payg" && currentName === "pay as you go");
              const isPopular = p.key === "Growth";
              return (
                <th
                  key={p.key}
                  scope="col"
                  className={cn("p-0", active ? "bg-primary/5" : "bg-muted/30")}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onSelect(p.key)}
                    className={cn(
                      "flex w-full flex-col items-center gap-1 px-3 py-2.5 transition-colors",
                      active
                        ? "text-primary"
                        : "text-foreground hover:bg-muted/60"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-full border-2",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background"
                      )}
                    >
                      {active ? <CheckIcon className="h-2.5 w-2.5" /> : null}
                    </span>
                    <span className="text-sm font-semibold">{p.label}</span>
                    {isCurrent ? (
                      <span className="rounded-full border border-border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                        Current
                      </span>
                    ) : isPopular ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary-foreground">
                        <SparklesIcon
                          aria-hidden="true"
                          className="h-2.5 w-2.5"
                        />
                        Popular
                      </span>
                    ) : null}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((row) => (
            <tr
              key={row.label}
              className="border-b border-border/60 last:border-0"
            >
              <th
                scope="row"
                className="sticky left-0 z-10 bg-card px-4 py-2 text-left font-medium text-muted-foreground"
              >
                {row.label}
              </th>
              {row.values.map((value, ci) => {
                const active = selectedPlan === COMPARISON_PLANS[ci].key;
                return (
                  <td
                    key={COMPARISON_PLANS[ci].key}
                    className={cn(
                      "px-3 py-2 text-center tabular-nums",
                      active
                        ? "bg-primary/5 font-semibold text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The canonical plan picker, shared by onboarding and Settings > Billing.
 * Payment defaults to Stripe (card) with a crypto (USDC) fallback toggle.
 * PAYG starts the metered plan; paid plans open a hosted checkout in a new tab.
 */
export function PlanPicker({
  initialPlan,
  currentPlan,
  submitLabel,
  onCompleted,
  onBack,
}: {
  /** Slug/name pre-selected on mount. */
  initialPlan?: string;
  /** The org's current plan name (marks its card and disables re-buying it). */
  currentPlan?: string;
  submitLabel?: string;
  /** Fired after PAYG start / checkout launch (onboarding advances, dialog closes). */
  onCompleted?: (planSlug: string) => void;
  onBack?: () => void;
}) {
  const [selectedPlan, setSelectedPlan] = useState<string>(initialPlan ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const plansQuery = useQuery({
    queryKey: ["billing", "plans"],
    queryFn: () => billingService.getPlans(),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000,
  });

  const fetched = plansQuery.data?.plans;
  const paidPlans =
    Array.isArray(fetched) && fetched.length > 0
      ? fetched
      : FALLBACK_PAID_PLANS;

  const currentName = (currentPlan ?? "").trim().toLowerCase();
  const isPaid = selectedPlan.length > 0 && selectedPlan !== "payg";

  const handleContinue = async () => {
    if (!selectedPlan || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (selectedPlan === "payg") {
        const orgId = getSelectedOrganizationId();
        if (orgId) {
          await billingService
            .startPayg(orgId, { orgId })
            .catch(() => undefined);
        }
        toast.success("Pay-as-you-go is active.");
        onCompleted?.("payg");
        return;
      }

      const selected = paidPlans.find((p) => p.name === selectedPlan);
      const checkout = await startPlanCheckout(
        selected?.slug ?? selectedPlan,
        undefined,
        { paymentMethod }
      );
      if (!checkout?.paymentUrl) {
        toast.error("Checkout did not return a payment link. Try again.");
        return;
      }
      toast.success(
        paymentMethod === "card"
          ? "Opening secure card checkout in a new tab…"
          : "Opening crypto checkout in a new tab…"
      );
      onCompleted?.(selected?.slug ?? selectedPlan);
      if (!openCheckoutInNewTab(checkout.paymentUrl)) {
        window.location.assign(checkout.paymentUrl);
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Couldn't start checkout.";
      // Card unavailable in this environment - nudge to crypto and switch.
      if (message.toLowerCase().includes("card payments aren't available")) {
        setPaymentMethod("crypto");
        toast.error("Card checkout isn't available yet - switched to crypto.");
      } else {
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // min-w-0 lets this shrink to the dialog's grid cell so the table's
    // min-width scrolls inside overflow-x-auto instead of widening the modal.
    <div className="w-full min-w-0">
      {onBack ? (
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={isSubmitting}
          className="mb-4 flex items-center gap-2 rounded-xl"
        >
          <ArrowLeftIcon aria-hidden="true" className="h-4 w-4" />
          Back
        </Button>
      ) : null}

      {/* Payment method: Stripe (card) by default, crypto (USDC) fallback. */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Pay with</span>
        <div
          role="group"
          aria-label="Payment method"
          className="inline-flex rounded-lg border border-border bg-card p-1"
        >
          {(
            [
              { key: "card" as const, label: "Card", icon: CreditCardIcon },
              {
                key: "crypto" as const,
                label: "Crypto (USDC)",
                icon: WalletIcon,
              },
            ] satisfies {
              key: PaymentMethod;
              label: string;
              icon: typeof CreditCardIcon;
            }[]
          ).map((m) => {
            const active = paymentMethod === m.key;
            return (
              <button
                key={m.key}
                type="button"
                aria-pressed={active}
                onClick={() => setPaymentMethod(m.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <m.icon aria-hidden="true" className="h-4 w-4" />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* The comparison table doubles as the selector: allowances are static
          (pricing.md); the plans query only resolves the checkout slug. */}
      <PlanComparison
        selectedPlan={selectedPlan}
        currentPlan={currentPlan}
        onSelect={setSelectedPlan}
      />

      <p className="mt-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">
          Every plan includes:{" "}
        </span>
        {EVERY_PLAN_INCLUDES.join(" · ")}. Allowances are monthly; past an
        allowance each meter continues at the pay-as-you-go rate.
      </p>

      <div className="mt-5 flex flex-col items-center gap-3">
        <Button
          type="button"
          size="lg"
          onClick={handleContinue}
          disabled={
            !selectedPlan ||
            isSubmitting ||
            selectedPlan.trim().toLowerCase() === currentName
          }
          className="w-full rounded-xl px-8 sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <ArrowPathIcon
                aria-hidden="true"
                className="mr-2 h-4 w-4 animate-spin"
              />
              Setting things up…
            </>
          ) : selectedPlan.trim().toLowerCase() === currentName ? (
            "Current plan"
          ) : isPaid ? (
            `${submitLabel ?? "Continue with"} ${selectedPlan}`
          ) : (
            (submitLabel ?? "Continue")
          )}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {isPaid
            ? paymentMethod === "card"
              ? "You'll complete payment on a secure Stripe checkout page."
              : "You'll pay in USDC on a hosted crypto checkout page."
            : "No credit card required. Upgrade anytime."}
        </p>
      </div>
    </div>
  );
}
