"use client";

import { CheckIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  type BillingPlan,
  billingService,
} from "@/features/billing/billing.service";
import {
  openCheckoutInNewTab,
  startPlanCheckout,
} from "@/features/billing/checkout";

interface UpgradePlanDialogProps {
  currentPlan?: string;
  trigger?: React.ReactNode;
}

/** Mirrors the sellable catalog (docs/backend.md 2026-07-25). */
const FALLBACK_PLANS: BillingPlan[] = [
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

const planFeatures = (plan: BillingPlan): string[] => {
  if (Array.isArray(plan.features)) {
    return plan.features.filter((f): f is string => typeof f === "string");
  }
  return [];
};

export default function UpgradePlanDialog({
  currentPlan,
  trigger,
}: UpgradePlanDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const plansQuery = useQuery({
    queryKey: ["billing", "plans"],
    queryFn: () => billingService.getPlans(),
    enabled: open,
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  // Crypto-only for now: every plan goes straight to the Blockradar mainnet
  // checkout (limits unlock via webhook). Card (Stripe) stays unwired until
  // production keys exist — the service supports it when that day comes.
  const upgradeMutation = useMutation({
    mutationFn: async (plan: string) => {
      const checkout = await startPlanCheckout(plan);
      if (!checkout?.paymentUrl) {
        throw new Error("Checkout did not return a payment link. Try again.");
      }
      return checkout;
    },
    onSuccess: (checkout) => {
      // New tab keeps the app alive so the pending-checkout banner can
      // confirm the payment; same-tab fallback when popups are blocked.
      if (openCheckoutInNewTab(checkout.paymentUrl)) {
        toast.success(
          "Complete your payment in the new tab — your plan unlocks automatically once it confirms."
        );
        queryClient.invalidateQueries({ queryKey: ["billing"] });
        setOpen(false);
      } else {
        window.location.href = checkout.paymentUrl;
      }
    },
    onError: (e) => {
      toast.error(
        e instanceof Error ? e.message : "Couldn't start the upgrade."
      );
    },
  });

  const fetched = plansQuery.data?.plans;
  const plans =
    Array.isArray(fetched) && fetched.length > 0 ? fetched : FALLBACK_PLANS;
  const currentName = (currentPlan ?? "").trim().toLowerCase();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" className="rounded-xl">
            <SparklesIcon aria-hidden="true" className="h-4 w-4" />
            Upgrade plan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choose your plan</DialogTitle>
          <DialogDescription>
            Upgrade to unlock more contacts, channels, and intelligence.
          </DialogDescription>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Pay in USDC via crypto checkout — your plan and limits unlock
          automatically once the payment confirms on-chain.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          {plans.map((plan, idx) => {
            const name =
              typeof plan.name === "string" ? plan.name : `Plan ${idx + 1}`;
            const isCurrent = name.trim().toLowerCase() === currentName;
            const featured = idx === 1;
            const features = planFeatures(plan);
            const isCustom =
              typeof plan.price === "string" &&
              plan.price.toLowerCase().includes("custom");
            return (
              <div
                key={name}
                className={`relative flex flex-col rounded-2xl border p-5 transition-colors ${
                  featured
                    ? "border-primary bg-primary/5 shadow-[0_20px_60px_-30px_rgba(23,39,224,0.5)]"
                    : "border-border bg-card"
                }`}
              >
                {featured ? (
                  <span className="absolute -top-2.5 left-5 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                    Popular
                  </span>
                ) : null}
                <div className="text-sm font-semibold text-foreground">
                  {name}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-foreground">
                    {priceLabel(plan.price)}
                  </span>
                  {!isCustom ? (
                    <span className="text-xs text-muted-foreground">
                      /{plan.interval ?? "month"}
                    </span>
                  ) : null}
                </div>
                {features.length > 0 ? (
                  <ul className="mt-4 flex-1 space-y-2">
                    {features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-xs text-muted-foreground"
                      >
                        <CheckIcon
                          aria-hidden="true"
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex-1" />
                )}
                <Button
                  type="button"
                  variant={featured ? "default" : "outline"}
                  disabled={isCurrent || upgradeMutation.isPending}
                  onClick={() => upgradeMutation.mutate(plan.slug ?? name)}
                  className="mt-5 w-full rounded-xl"
                >
                  {isCurrent ? "Current plan" : `Upgrade to ${name}`}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
