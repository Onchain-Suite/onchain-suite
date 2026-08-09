"use client";

import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { cn, getSelectedOrganizationId } from "@/lib/utils";

import { type OnboardingStepsProps } from "../types";
import {
  type BillingPlan,
  billingService,
  DEFAULT_PAYMENT_METHOD,
  type PaymentCheckoutMethod,
} from "@/features/billing/billing.service";
import {
  openCheckoutInNewTab,
  startPlanCheckout,
} from "@/features/billing/checkout";
import { PaymentMethodSelect } from "@/features/billing/components/payment-method-select";

/**
 * Pay-As-You-Go starter option for small teams — replaces the old free tier.
 * Selecting it flips the org to `plan: payg` (`POST /billing/payg/start`,
 * one-time $5 trial credit); usage is metered from the prepaid wallet at the
 * backend's PAYG rates, and hard caps still apply. Onboarding never
 * dead-ends on billing — a failed start is retried from Settings → Billing.
 */
const PAYG_PLAN = {
  name: "Pay as you go",
  interval: "usage-based",
  description: "For small teams — no monthly fee, pay only for what you use",
  features: [
    "$5 trial credit to get started",
    "$1 per 1k messages · $5 per 1k AI credits",
    "$1 per 10k on-chain (GoldRush) credits",
    "Up to 25k contacts · 2 seats · 3 automations",
  ],
};

/** Mirrors the sellable catalog (docs/backend.md 2026-07-25). */
const FALLBACK_PAID_PLANS: BillingPlan[] = [
  {
    name: "Launch",
    slug: "launch",
    price: 29,
    interval: "month",
    features: [
      "For protocols getting started",
      "Monthly message & credit allowance",
      "Email + in-app channels",
      "Overage continues at PAYG rates",
    ],
  },
  {
    name: "Growth",
    slug: "growth",
    price: 199,
    interval: "month",
    features: [
      "Bigger allowances for scaling teams",
      "Unlimited campaigns & automations",
      "Onchain audience intelligence",
      "Overage continues at PAYG rates",
    ],
  },
  {
    name: "Pro",
    slug: "pro",
    price: 499,
    interval: "month",
    features: [
      "High-volume allowances",
      "Advanced segmentation & UTM tracking",
      "Priority support",
      "All channels + webhooks",
    ],
  },
];

const priceLabel = (price: BillingPlan["price"]) => {
  if (typeof price === "number") return `$${price.toLocaleString()}`;
  if (typeof price === "string" && price.trim().length > 0) return price;
  return "—";
};

const planFeatures = (plan: BillingPlan): string[] =>
  Array.isArray(plan.features)
    ? plan.features.filter((f): f is string => typeof f === "string")
    : [];

interface PlanCardProps {
  name: string;
  description?: string;
  priceText: string;
  interval?: string;
  features: string[];
  isSelected: boolean;
  isRecommended?: boolean;
  onSelect: () => void;
}

function PlanCard({
  name,
  description,
  priceText,
  interval,
  features,
  isSelected,
  isRecommended = false,
  onSelect,
}: PlanCardProps) {
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
          Recommended
        </span>
      ) : null}

      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-base font-semibold text-foreground">{name}</div>
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

/**
 * Onboarding step 2 — pick a real billing plan. Free completes onboarding
 * immediately; paid plans start a checkout via POST /billing/upgrade and
 * redirect once onboarding is recorded. Billing failures never block
 * finishing onboarding — the plan can always be changed later in Settings.
 */
export function PlanSelectionStep({
  initialData,
  onNext,
  onBack,
}: OnboardingStepsProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>(
    initialData.selectedPlan ?? ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentCheckoutMethod>(
    DEFAULT_PAYMENT_METHOD
  );

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

  // Any non-PAYG selection attempts checkout; plans without a self-serve
  // checkout slug (e.g. Enterprise) fall through to the contact-sales path.
  const isPaidPlan = selectedPlan.length > 0 && selectedPlan !== "payg";

  const handleContinue = async () => {
    if (!selectedPlan || isSubmitting) return;
    setIsSubmitting(true);
    try {
      let paymentUrl = "";
      if (selectedPlan === "payg") {
        try {
          const orgId = getSelectedOrganizationId();
          if (orgId) {
            await billingService.startPayg(orgId, { orgId });
          }
        } catch (e) {
          // Backend also auto-falls-back to payg — never block onboarding.
          console.warn("PAYG start failed during onboarding:", e);
          toast.warning(
            "We couldn't activate pay-as-you-go right now. You can enable it anytime in Settings → Billing."
          );
        }
      }
      if (isPaidPlan) {
        try {
          // Stripe card checkout — the pending reference is stored locally, so
          // after paying the user lands back in the app and the
          // PendingCheckoutBanner confirms the upgrade and unlocks features.
          const selected = paidPlans.find((p) => p.name === selectedPlan);
          const checkout = await startPlanCheckout(
            selected?.slug ?? selectedPlan,
            undefined,
            { paymentMethod }
          );
          if (checkout) {
            ({ paymentUrl } = checkout);
          } else {
            toast.warning(
              "We couldn't start checkout right now. You can upgrade anytime in Settings → Billing."
            );
          }
        } catch (e) {
          // Don't dead-end onboarding on a billing hiccup — finish the flow
          // and let the user upgrade from Settings → Billing.
          console.warn("Plan checkout failed during onboarding:", e);
          toast.warning(
            "We couldn't start checkout right now. You can upgrade anytime in Settings → Billing."
          );
        }
      }

      await onNext({ selectedPlan });

      if (paymentUrl) {
        // New tab: the app continues into the dashboard, where the pending
        // checkout banner tracks the payment; fall back to same-tab
        // navigation if the popup was blocked.
        if (!openCheckoutInNewTab(paymentUrl)) {
          window.location.assign(paymentUrl);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
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
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Choose the plan that fits your protocol
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Start pay-as-you-go with a $5 trial credit and upgrade whenever you
          need more reach — you can change your plan anytime in Settings →
          Billing.
        </p>
      </div>

      {plansQuery.isLoading ? (
        <div
          className="grid animate-pulse gap-4 md:grid-cols-2 xl:grid-cols-4"
          aria-hidden="true"
        >
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-muted" />
          ))}
        </div>
      ) : (
        <div
          role="radiogroup"
          aria-label="Billing plan"
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <PlanCard
            name={PAYG_PLAN.name}
            description={PAYG_PLAN.description}
            priceText="$0/mo"
            interval={PAYG_PLAN.interval}
            features={PAYG_PLAN.features}
            isSelected={selectedPlan === "payg"}
            onSelect={() => setSelectedPlan("payg")}
          />
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
                isRecommended={name === "Pro"}
                onSelect={() => setSelectedPlan(name)}
              />
            );
          })}
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-3">
        {/* Only the paid plans reach a checkout — PAYG just flips the org over,
            so a payment method would be a meaningless choice there. */}
        {isPaidPlan ? (
          <div className="w-full max-w-md space-y-2">
            <p className="text-center text-xs text-muted-foreground">
              How would you like to pay?
            </p>
            <PaymentMethodSelect
              value={paymentMethod}
              onChange={setPaymentMethod}
              disabled={isSubmitting}
            />
          </div>
        ) : null}
        <Button
          type="button"
          size="lg"
          onClick={handleContinue}
          disabled={!selectedPlan || isSubmitting}
          className="w-full rounded-xl px-8 sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <ArrowPathIcon
                aria-hidden="true"
                className="mr-2 h-4 w-4 animate-spin"
              />
              Setting up your workspace…
            </>
          ) : selectedPlan === "free" ? (
            "Start free"
          ) : isPaidPlan ? (
            `Continue with ${selectedPlan}`
          ) : (
            "Continue"
          )}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {isPaidPlan
            ? paymentMethod === "card"
              ? "You'll be taken to our secure Stripe checkout after setup."
              : "You'll be taken to a crypto checkout after setup."
            : "No credit card required. Upgrade anytime."}
        </p>
      </div>
    </div>
  );
}
