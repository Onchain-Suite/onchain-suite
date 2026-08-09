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
    features: [
      "150,000 contacts · 1.5M emails/mo",
      "2,000,000 in-app pushes/mo",
      "5 concierge hours/mo",
      "Custom team seats",
    ],
  },
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
      <div className="mb-5 flex items-center gap-2">
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
        <div
          className="grid animate-pulse gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5"
          aria-hidden="true"
        >
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-muted" />
          ))}
        </div>
      ) : (
        <div
          role="radiogroup"
          aria-label="Billing plan"
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5"
        >
          <PlanCard
            name={PAYG_PLAN.name}
            description={PAYG_PLAN.description}
            priceText="$0"
            interval="mo + usage"
            features={PAYG_PLAN.features}
            isSelected={selectedPlan === "payg"}
            isCurrent={
              currentName === "payg" || currentName === "pay as you go"
            }
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
                isCurrent={name.trim().toLowerCase() === currentName}
                isRecommended={name === "Growth"}
                onSelect={() => setSelectedPlan(name)}
              />
            );
          })}
        </div>
      )}

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
