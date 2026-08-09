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
  BillingError,
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentCheckoutMethod>(
    DEFAULT_PAYMENT_METHOD
  );
  const queryClient = useQueryClient();

  const plansQuery = useQuery({
    queryKey: ["billing", "plans"],
    queryFn: () => billingService.getPlans(),
    enabled: open,
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  // Both methods hit POST /billing/checkout/plan and the plan's limits unlock
  // when the provider webhook lands — card via Stripe's `checkout.session.*`,
  // crypto via the Blockradar deposit event. The buyer's pick is threaded
  // through as the mutation argument rather than read from state inside
  // mutationFn, so an in-flight checkout can't be retargeted by a late click.
  const upgradeMutation = useMutation({
    mutationFn: async ({
      plan,
      method,
    }: {
      plan: string;
      method: PaymentCheckoutMethod;
    }) => {
      const checkout = await startPlanCheckout(plan, undefined, {
        paymentMethod: method,
      });
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
      // Card is unavailable in this environment (no Stripe key). Now that the
      // buyer has a choice, move the selection to the method that does work so
      // the retry is one click — the toast says so rather than doing it
      // silently.
      if (e instanceof BillingError && e.code === "FIAT_CHECKOUT_UNAVAILABLE") {
        setPaymentMethod("crypto");
        toast.error(`${e.message} We've switched you to crypto — try again.`);
        return;
      }
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

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Choose how you&apos;d like to pay — your plan and limits unlock
            automatically once the payment confirms.
          </p>
          <PaymentMethodSelect
            value={paymentMethod}
            onChange={setPaymentMethod}
            disabled={upgradeMutation.isPending}
          />
        </div>

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
                  onClick={() =>
                    upgradeMutation.mutate({
                      plan: plan.slug ?? name,
                      method: paymentMethod,
                    })
                  }
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
