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

const PAYG_PLAN = {
  name: "Pay as you go",
  slug: "payg",
  description: "For small teams - no monthly fee, pay only for what you use",
  features: [
    "$5 trial credit to get started",
    "1,000 contacts (cap) · 2 seats",
    "Metered email, in-app, on-chain & AI",
    "Direct campaigns, Audience & Forms",
  ],
};

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

const priceLabel = (price: BillingPlan["price"]): string => {
  if (typeof price === "number") return `$${price.toLocaleString()}`;
  if (typeof price === "string" && price.trim().length > 0) return price;
  return "-";
};

const planFeatures = (plan: BillingPlan): string[] =>
  Array.isArray(plan.features)
    ? plan.features.filter((f): f is string => typeof f === "string")
    : [];

function PlanCard({
  name,
  description,
  priceText,
  interval,
  features,
  isSelected,
  isCurrent,
  isRecommended,
  onSelect,
}: {
  name: string;
  description?: string;
  priceText: string;
  interval?: string;
  features: string[];
  isSelected: boolean;
  isCurrent?: boolean;
  isRecommended?: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "relative flex h-full cursor-pointer flex-col rounded-2xl border-2 bg-card p-5 text-left transition-colors",
        isSelected
          ? "border-primary shadow-lg"
          : "border-border hover:border-muted-foreground/40"
      )}
    >
      {isRecommended ? (
        <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
          <SparklesIcon aria-hidden="true" className="h-3 w-3" />
          Popular
        </span>
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-base font-semibold text-foreground">
            {name}
            {isCurrent ? (
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Current
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
            isSelected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background"
          )}
        >
          {isSelected ? <CheckIcon className="h-3 w-3" /> : null}
        </span>
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold tracking-tight text-foreground">
          {priceText}
        </span>
        {interval ? (
          <span className="text-sm text-muted-foreground">/{interval}</span>
        ) : null}
      </div>
      <ul className="mt-4 space-y-2">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <CheckIcon
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Side-by-side allowance table (docs/pricing.md v4 §1). Columns key off the
 *  same selection state as the cards, so the picked plan's column highlights.
 *  PAYG's metered channels read "Metered" (no bundled allowance). */
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

function PlanComparison({ selectedPlan }: { selectedPlan: string }) {
  return (
    <div className="mt-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Compare plans
      </p>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[620px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="sticky left-0 z-10 bg-muted/60 px-4 py-3 text-left font-medium text-muted-foreground"
              >
                Plan
              </th>
              {COMPARISON_PLANS.map((p) => {
                const active = selectedPlan === p.key;
                return (
                  <th
                    key={p.key}
                    scope="col"
                    className={cn(
                      "px-4 py-3 text-center font-semibold",
                      active
                        ? "bg-primary/5 text-primary"
                        : "bg-muted/40 text-foreground"
                    )}
                  >
                    {p.label}
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
                  className="sticky left-0 z-10 bg-card px-4 py-3 text-left font-medium text-muted-foreground"
                >
                  {row.label}
                </th>
                {row.values.map((value, ci) => {
                  const active = selectedPlan === COMPARISON_PLANS[ci].key;
                  return (
                    <td
                      key={COMPARISON_PLANS[ci].key}
                      className={cn(
                        "px-4 py-3 text-center tabular-nums",
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
    </div>
  );
}

/** PAYG rendered as a full-width entry banner above the paid grid, so the
 *  "start free" default reads as the obvious first step rather than one of five
 *  equally-weighted columns. Still a radio option in the same group. */
function PaygCard({
  isSelected,
  isCurrent,
  onSelect,
}: {
  isSelected: boolean;
  isCurrent?: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "relative flex cursor-pointer flex-col gap-4 rounded-2xl border-2 bg-card p-5 text-left transition-colors md:flex-row md:items-center md:gap-6",
        isSelected
          ? "border-primary shadow-lg"
          : "border-border hover:border-muted-foreground/40"
      )}
    >
      <div className="flex items-start gap-3 md:w-64 md:shrink-0">
        <span
          aria-hidden="true"
          className={cn(
            "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
            isSelected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background"
          )}
        >
          {isSelected ? <CheckIcon className="h-3 w-3" /> : null}
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2 text-base font-semibold text-foreground">
            {PAYG_PLAN.name}
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Start free
            </span>
            {isCurrent ? (
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Current
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {PAYG_PLAN.description}
          </p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              $0
            </span>
            <span className="text-sm text-muted-foreground">/mo + usage</span>
          </div>
        </div>
      </div>
      <ul className="grid flex-1 gap-2 sm:grid-cols-2">
        {PAYG_PLAN.features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <CheckIcon
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            />
            {feature}
          </li>
        ))}
      </ul>
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
    <div>
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

      {plansQuery.isLoading ? (
        <div className="space-y-4" aria-hidden="true">
          <div className="h-28 animate-pulse rounded-2xl bg-muted" />
          <div className="grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      ) : (
        <div role="radiogroup" aria-label="Billing plan" className="space-y-4">
          <PaygCard
            isSelected={selectedPlan === "payg"}
            isCurrent={
              currentName === "payg" || currentName === "pay as you go"
            }
            onSelect={() => setSelectedPlan("payg")}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {paidPlans.map((plan, idx) => {
              const name =
                typeof plan.name === "string" && plan.name.trim().length > 0
                  ? plan.name
                  : `Plan ${idx + 1}`;
              return (
                <PlanCard
                  key={name}
                  name={name}
                  description={
                    typeof plan.description === "string"
                      ? plan.description
                      : undefined
                  }
                  priceText={priceLabel(plan.price)}
                  interval={
                    typeof plan.interval === "string" ? plan.interval : "month"
                  }
                  features={planFeatures(plan)}
                  isSelected={selectedPlan === name}
                  isCurrent={name.trim().toLowerCase() === currentName}
                  isRecommended={name === "Growth"}
                  onSelect={() => setSelectedPlan(name)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Full allowance table so buyers can compare the plans side by side. */}
      <PlanComparison selectedPlan={selectedPlan} />

      {/* Baseline reassurance + how overage bills, so the modal fully explains
          the purchase now that the standalone rates table is gone. */}
      <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Every plan includes
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {EVERY_PLAN_INCLUDES.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-sm text-foreground"
            >
              <CheckIcon
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              />
              {feature}
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-border/60 pt-4 text-xs leading-relaxed text-muted-foreground">
          Plans bundle an allowance of every meter (email, in-app, on-chain and
          AI). Once an allowance is used up, that meter continues at the
          pay-as-you-go rate; billing is monthly, cancel anytime.
        </p>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
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
