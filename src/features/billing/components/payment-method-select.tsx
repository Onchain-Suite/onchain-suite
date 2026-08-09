"use client";

import { CreditCardIcon, WalletIcon } from "@heroicons/react/24/outline";
import { memo, useId } from "react";

import { Label } from "@/ui/label";
import { RadioGroup, RadioGroupItem } from "@/ui/radio-group";

import { cn } from "@/lib/utils";

import type { PaymentCheckoutMethod } from "../billing.service";

/**
 * Module scope, not inline: a stable reference so the memoized rows below
 * aren't rebuilt every render, and the icon components are named imports so
 * only these two glyphs ship (no dynamic icon registry).
 */
const METHODS: ReadonlyArray<{
  value: PaymentCheckoutMethod;
  label: string;
  hint: string;
  Icon: typeof CreditCardIcon;
}> = [
  {
    value: "card",
    label: "Card",
    hint: "Visa, Mastercard or Amex — secured by Stripe. Confirms in seconds.",
    Icon: CreditCardIcon,
  },
  {
    value: "crypto",
    label: "Crypto",
    hint: "Pay in USDC on Base. Confirms on-chain, usually a couple of minutes.",
    Icon: WalletIcon,
  },
];

interface PaymentMethodSelectProps {
  value: PaymentCheckoutMethod;
  /**
   * Pass a stable callback (a `useState` setter is already stable) — this
   * component is memoized, and a fresh arrow each render would defeat it.
   */
  onChange: (value: PaymentCheckoutMethod) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Card-or-crypto checkout picker. Both methods hit the same endpoints and
 * settle the same `reference`, so the only thing that changes downstream is
 * which hosted page the buyer lands on and how long confirmation takes.
 *
 * Built on the RadioGroup primitive rather than two buttons so the choice is
 * exposed as a real radiogroup: arrow-key navigation, one tab stop, and a
 * screen-reader-announced selected state come for free.
 */
export const PaymentMethodSelect = memo(function PaymentMethodSelect({
  value,
  onChange,
  disabled = false,
  className,
}: PaymentMethodSelectProps) {
  // Namespaced so several instances (upgrade dialog + top-up dialog) can be
  // mounted without their label/input ids colliding.
  const groupId = useId();

  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onChange(next as PaymentCheckoutMethod)}
      disabled={disabled}
      aria-label="Payment method"
      className={cn("gap-2 sm:grid-cols-2", className)}
    >
      {METHODS.map(({ value: method, label, hint, Icon }) => {
        const id = `${groupId}-${method}`;
        const isSelected = value === method;
        return (
          <Label
            key={method}
            htmlFor={id}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
              isSelected
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-muted-foreground/40",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <RadioGroupItem id={id} value={method} className="mt-0.5" />
            <span className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Icon aria-hidden="true" className="h-4 w-4" />
                {label}
              </span>
              <span className="text-xs font-normal leading-5 text-muted-foreground">
                {hint}
              </span>
            </span>
          </Label>
        );
      })}
    </RadioGroup>
  );
});
