"use client";

import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckIcon,
  CreditCardIcon,
  SparklesIcon,
  UsersIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { cn, getSelectedOrganizationId } from "@/lib/utils";

import { type BillingPlan, billingService } from "../billing.service";
import { openCheckoutInNewTab, startPlanCheckout } from "../checkout";

type PaymentMethod = "card" | "crypto";

const usd = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;

const clamp = (n: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, n));

/**
 * Canonical feature lines per plan slug, so every card in the modal is fully
 * populated even when GET /billing/plans returns limits-only rows. Backend
 * features win when they are at least as detailed; otherwise these fill in.
 */
const PLAN_FEATURE_CATALOG: Record<string, string[]> = {
  payg: [
    "$5 trial credit to get started",
    "1,000 contacts (cap) · 2 seats",
    "Metered email, in-app, on-chain & AI",
    "Direct campaigns, Audience & Forms",
  ],
  launch: [
    "2,500 contacts · 5,000 emails/mo",
    "25,000 in-app pushes/mo",
    "Intelligence, Audience & Segments",
    "Direct campaigns",
    "2 team seats",
  ],
  growth: [
    "25,000 contacts · 250,000 emails/mo",
    "250,000 in-app pushes/mo",
    "Forms + dedicated sending IP",
    "Automations",
    "4 team seats",
  ],
  pro: [
    "75,000 contacts · 750,000 emails/mo",
    "1,000,000 in-app pushes/mo",
    "Intelligence at working scale",
    "Priority support",
    "7 team seats",
  ],
  scale: [
    "150,000 contacts · 1.5M emails/mo",
    "2,000,000 in-app pushes/mo",
    "5 concierge hours/mo",
    "SLA + custom team seats",
  ],
};

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
      "2,500 contacts · 5,000 emails/mo",
      "25,000 in-app pushes/mo",
      "Intelligence",
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

const planSlugKey = (plan: BillingPlan): string =>
  (typeof plan.slug === "string" && plan.slug
    ? plan.slug
    : (plan.name ?? "")
  ).toLowerCase();

const planFeatures = (plan: BillingPlan): string[] => {
  const backend = Array.isArray(plan.features)
    ? plan.features.filter((f): f is string => typeof f === "string")
    : [];
  const canonical = PLAN_FEATURE_CATALOG[planSlugKey(plan)] ?? [];
  // Show whichever list is more complete so a card is never sparse.
  return canonical.length > backend.length ? canonical : backend;
};

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
 * "Size your plan" slider. Quotes GET /billing/contact-pricing on every drag so
 * an org sees the real price for its exact list size and keeps its tier's
 * features between anchors (11,000 contacts stays on Launch, not Growth). When a
 * quote resolves after the user drags, it selects the resolved tier and the
 * chosen capacity in the parent so checkout charges for that many contacts.
 */
function PlanSizer({
  onSizeSelected,
}: {
  onSizeSelected: (planLabel: string, contacts: number) => void;
}) {
  const [contacts, setContacts] = useState(11000);
  const [debounced, setDebounced] = useState(11000);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const h = window.setTimeout(() => setDebounced(contacts), 250);
    return () => window.clearTimeout(h);
  }, [contacts]);

  const pricingQuery = useQuery({
    queryKey: ["billing", "contact-pricing", debounced],
    queryFn: () => billingService.getContactPricing(debounced),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const quote = pricingQuery.data?.quote;
  const anchors = useMemo(
    () => pricingQuery.data?.anchors ?? [],
    [pricingQuery.data?.anchors]
  );
  const min = anchors[0]?.contacts ?? 500;
  const max = anchors[anchors.length - 1]?.contacts ?? 200_000;
  // A round step keeps the handle on tidy contact counts (5,000, 5,500, …);
  // the number input is there for an exact figure.
  const step = 500;

  // Only drive the parent's selection after the user actually moves the handle,
  // so mounting the sizer never clobbers a pre-selected plan.
  const planLabel = quote?.planLabel;
  const quoteContacts = quote?.contacts;
  useEffect(() => {
    if (touched && planLabel && typeof quoteContacts === "number") {
      onSizeSelected(planLabel, quoteContacts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [touched, planLabel, quoteContacts]);

  const setContactsTouched = (n: number) => {
    setTouched(true);
    setContacts(clamp(Math.round(n) || 0, min, max));
  };

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <UsersIcon aria-hidden="true" className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold text-foreground">
          Size your plan
        </h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        You only pay for the contacts you have. Slide to your list size - you
        keep your tier&apos;s features without jumping to the next one.
      </p>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {quote ? usd(quote.monthlyPrice) : "…"}
            </span>
            <span className="text-sm text-muted-foreground">/mo</span>
            {quote?.planLabel ? (
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {quote.planLabel}
              </span>
            ) : null}
          </div>
          {quote ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {quote.planLabel}&apos;s features with{" "}
              <span className="font-medium text-foreground">
                {contacts.toLocaleString()}
              </span>{" "}
              contacts
              {quote.annualPrice ? ` · ${usd(quote.annualPrice)}/yr` : ""}
            </p>
          ) : null}
        </div>
        <label className="text-right">
          <span className="mb-1 block text-xs text-muted-foreground">
            Contacts
          </span>
          <input
            type="number"
            min={min}
            max={max}
            value={contacts}
            onChange={(e) => setContactsTouched(Number(e.target.value))}
            className="h-9 w-32 rounded-lg border border-border bg-background px-3 text-right text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </label>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamp(contacts, min, max)}
        onChange={(e) => setContactsTouched(Number(e.target.value))}
        aria-label="Contacts"
        className="mt-4 w-full accent-[var(--primary)]"
      />

      {anchors.length > 0 ? (
        <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
          {anchors.map((a) => (
            <button
              key={a.plan || a.planLabel}
              type="button"
              onClick={() => setContactsTouched(a.contacts)}
              className="transition-colors hover:text-foreground"
            >
              {a.planLabel}
            </button>
          ))}
        </div>
      ) : null}

      {quote?.nextTier ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {quote.nextTier.planLabel} unlocks at{" "}
          {quote.nextTier.contacts.toLocaleString()} contacts
          {typeof quote.nextTier.monthlyPrice === "number"
            ? ` (${usd(quote.nextTier.monthlyPrice)}/mo)`
            : ""}
          .
        </p>
      ) : null}

      {pricingQuery.isError ? (
        <p className="mt-3 text-xs text-amber-500">
          Couldn&apos;t load live pricing right now - the plans below still
          apply.
        </p>
      ) : null}
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
  // Set only when the plan was chosen via the sizer slider (a capacity purchase);
  // null means a plain named-tier purchase.
  const [capacityContacts, setCapacityContacts] = useState<number | null>(null);
  const selectPlanCard = (name: string) => {
    setSelectedPlan(name);
    setCapacityContacts(null);
  };

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
        { paymentMethod, contacts: capacityContacts ?? undefined }
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

      <PlanSizer
        onSizeSelected={(planLabel, contacts) => {
          setSelectedPlan(planLabel);
          setCapacityContacts(contacts);
        }}
      />

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
            onSelect={() => selectPlanCard("payg")}
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
                onSelect={() => selectPlanCard(name)}
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
