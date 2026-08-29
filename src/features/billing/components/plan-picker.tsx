"use client";

import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  MinusIcon,
  PlusIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { cn, getSelectedOrganizationId } from "@/lib/utils";

import {
  billingService,
  SEND_MIN_SUBSCRIBERS,
  SUITE_TIER_ANCHORS,
} from "../billing.service";
import { openCheckoutInNewTab, startPlanCheckout } from "../checkout";
import {
  clampExtraSeats,
  includedSeatsForPlan,
  MAX_EXTRA_SEATS,
  SEAT_PRICE_USD,
} from "../seat-pricing";

type PaymentMethod = "card" | "crypto";
type Selection = "suite" | "send" | "payg";

const usd = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;
const clamp = (n: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, n));

/**
 * Fixed per-tier allowances (SSOT docs/pricing.md §4). Suite allowances do NOT
 * move with the slider - only the price and the resolved tier do - so this is
 * what a customer "gets" at whichever band the contact slider lands in.
 */
// Contacts is what the slider sizes (shown in the header), so it is not repeated
// here; these are the FIXED allowances the tier carries at any size.
const TIER_ALLOWANCES: Record<string, [string, string][]> = {
  launch: [
    ["Emails / mo", "50,000"],
    ["In-app push / mo", "25,000"],
    ["On-chain credits", "1,000"],
    ["AI credits", "500"],
    ["ONS+ verifications", "250"],
    ["Team seats", "2"],
  ],
  growth: [
    ["Emails / mo", "250,000"],
    ["In-app push / mo", "250,000"],
    ["On-chain credits", "10,000"],
    ["AI credits", "8,000"],
    ["ONS+ verifications", "2,500"],
    ["Dedicated IP", "1"],
    ["Team seats", "4"],
  ],
  pro: [
    ["Emails / mo", "750,000"],
    ["In-app push / mo", "1,000,000"],
    ["On-chain credits", "25,000"],
    ["AI credits", "16,000"],
    ["ONS+ verifications", "7,500"],
    ["Dedicated IP", "1"],
    ["Team seats", "7"],
  ],
};
const SEND_INCLUDED: [string, string][] = [
  ["Line", "Email only"],
  ["List protection", "ONS+ at upload"],
  ["Team seats", "2"],
];
const PAYG_INCLUDED: [string, string][] = [
  ["Contacts", "1,000"],
  ["Automations", "3 max"],
  ["Team seats", "2"],
  ["Metered at", "list price"],
];

const SUITE_MIN = 0;
const SUITE_MAX = 150_000;
const SEND_MAX = 100_000;

const LINES: { id: Selection; name: string; sub: string }[] = [
  { id: "suite", name: "Suite", sub: "Wallet + email" },
  { id: "send", name: "Send", sub: "Email only" },
  { id: "payg", name: "Pay as you go", sub: "$0 + usage" },
];

/**
 * Capabilities on EVERY Suite tier including PAYG (SSOT docs/pricing.md §4: "no
 * capability is gated inside Suite"). Tiers differ only on allowance depth,
 * seats and the dedicated IP - so Forms ships on every tier, not just Growth.
 */
const CORE_CAPABILITIES = [
  "Campaigns (direct + in-app)",
  "Automations",
  "Audience & segments",
  "Forms",
  "Intelligence",
  "ONS+ list protection",
];

/** The "included on every tier" capability list (Forms among them). */
function CoreCapabilities() {
  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Included on every tier
      </p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {CORE_CAPABILITIES.map((c) => (
          <li
            key={c}
            className="flex items-center gap-1.5 text-xs text-foreground"
          >
            <CheckIcon
              aria-hidden="true"
              className="h-3.5 w-3.5 shrink-0 text-primary"
            />
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Allowance rows: label left, mono value right. */
function IncludedRows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid gap-1.5 text-sm sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-baseline justify-between gap-3 border-b border-border/60 py-1.5"
        >
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium tabular-nums text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The canonical plan picker, shared by onboarding and Settings > Billing. It is
 * slider-first per docs/pricing.md v4.2: one slider per line, and the contact
 * count DECIDES the Suite tier (Launch 0-24,999, Growth 25,000-74,999, Pro
 * 75,000+) - there is no tier picker. The quote comes from GET /billing/quote,
 * whose public equivalent matches the charge exactly, so the shown price is what
 * is billed. Payment defaults to Stripe (card) with a crypto (USDC) fallback.
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
  /** The org's current plan name (marks it and disables re-buying it). */
  currentPlan?: string;
  submitLabel?: string;
  /** Fired after PAYG start / checkout launch. */
  onCompleted?: (planSlug: string) => void;
  onBack?: () => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [selection, setSelection] = useState<Selection>(() => {
    const p = (initialPlan ?? "").trim().toLowerCase();
    if (p === "payg" || p === "pay as you go") return "payg";
    if (p === "send") return "send";
    return "suite";
  });
  const [contacts, setContacts] = useState(11_000);
  const [subscribers, setSubscribers] = useState(10_000);
  const [extraSeats, setExtraSeats] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const units = selection === "send" ? subscribers : contacts;
  const [debouncedUnits, setDebouncedUnits] = useState(units);
  useEffect(() => {
    const h = window.setTimeout(() => setDebouncedUnits(units), 250);
    return () => window.clearTimeout(h);
  }, [units]);
  // Re-quote on seat changes too so the headline total the customer sees is the
  // backend's own plan+seats figure (never a client sum) - that's shown==charged.
  const [debouncedSeats, setDebouncedSeats] = useState(extraSeats);
  useEffect(() => {
    const h = window.setTimeout(() => setDebouncedSeats(extraSeats), 250);
    return () => window.clearTimeout(h);
  }, [extraSeats]);

  const quoteQuery = useQuery({
    queryKey: [
      "billing",
      "line-quote",
      selection,
      debouncedUnits,
      debouncedSeats,
    ],
    queryFn: () =>
      billingService.getLineQuote(
        selection === "send" ? "send" : "suite",
        debouncedUnits,
        { extraSeats: debouncedSeats }
      ),
    enabled: selection !== "payg",
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
  const quote = quoteQuery.data;

  // An empty Suite list is free: 0 contacts is pay-as-you-go, not a $0 tier.
  const isEmptySuite = selection === "suite" && contacts <= 0;
  const resolvedPlan =
    selection === "payg" || isEmptySuite
      ? "payg"
      : selection === "send"
        ? "send"
        : (quote?.plan ?? "launch");

  const currentName = (currentPlan ?? "").trim().toLowerCase();
  const isCurrent = resolvedPlan === currentName;

  // Warn as the handle nears a tier boundary (the price is a real cliff there).
  const nearCliff = useMemo(() => {
    if (selection !== "suite" || !quote?.nextTier) return null;
    const boundary = quote.nextTier.units;
    if (boundary <= 0) return null;
    return contacts >= boundary * 0.85 && contacts < boundary
      ? quote.nextTier
      : null;
  }, [selection, quote?.nextTier, contacts]);

  const handleContinue = async () => {
    if (isSubmitting || isCurrent) return;
    setIsSubmitting(true);
    try {
      const orgId = getSelectedOrganizationId();
      if (selection === "payg" || isEmptySuite) {
        if (orgId) {
          await billingService
            .startPayg(orgId, { orgId })
            .catch(() => undefined);
        }
        toast.success("Pay-as-you-go is active.");
        onCompleted?.("payg");
        return;
      }
      const planRef = selection === "send" ? "send" : (quote?.plan ?? "launch");
      const unitsToBuy = selection === "send" ? subscribers : contacts;
      const checkout = await startPlanCheckout(planRef, undefined, {
        paymentMethod,
        contacts: unitsToBuy,
        extraSeats,
      });
      if (!checkout?.paymentUrl) {
        toast.error("Checkout did not return a payment link. Try again.");
        return;
      }
      toast.success(
        paymentMethod === "card"
          ? "Opening secure card checkout in a new tab…"
          : "Opening crypto checkout in a new tab…"
      );
      onCompleted?.(planRef);
      if (!openCheckoutInNewTab(checkout.paymentUrl)) {
        window.location.assign(checkout.paymentUrl);
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Couldn't start checkout.";
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

  const sliderMin = selection === "send" ? SEND_MIN_SUBSCRIBERS : SUITE_MIN;
  const sliderMax = selection === "send" ? SEND_MAX : SUITE_MAX;
  const sliderPct = ((units - sliderMin) / (sliderMax - sliderMin)) * 100;

  // Headline = plan + seats, straight from the quote (backend prices seats with
  // the same function checkout charges, so this equals what's billed).
  const headlineMonthly = quote
    ? (quote.totalMonthlyPrice ?? quote.monthlyPrice)
    : null;
  const headlineAnnual = quote
    ? (quote.totalAnnualPrice ?? quote.annualPrice)
    : null;
  const priceText = isEmptySuite
    ? "Free"
    : headlineMonthly !== null
      ? usd(headlineMonthly)
      : "…";
  const includedSeats = includedSeatsForPlan(resolvedPlan);

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

      {/* Line chooser: Suite / Send / PAYG. */}
      <div
        role="radiogroup"
        aria-label="Plan line"
        className="grid gap-2 sm:grid-cols-3"
      >
        {LINES.map((l) => {
          const active = selection === l.id;
          return (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelection(l.id)}
              className={cn(
                "rounded-xl border-2 bg-card px-4 py-3 text-left transition-colors",
                active
                  ? "border-primary shadow-sm"
                  : "border-border hover:border-muted-foreground/40"
              )}
            >
              <span
                className={cn(
                  "block text-[15px] font-semibold",
                  active ? "text-primary" : "text-foreground"
                )}
              >
                {l.name}
              </span>
              <span className="block text-xs text-muted-foreground">
                {l.sub}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sized plan (Suite / Send): one slider that decides the tier. */}
      {selection !== "payg" ? (
        <div className="mt-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  {priceText}
                </span>
                {!isEmptySuite ? (
                  <span className="text-sm text-muted-foreground">/mo</span>
                ) : null}
                {!isEmptySuite && quote ? (
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {quote.planLabel}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {isEmptySuite ? (
                  "Free until you import contacts - you start on pay-as-you-go."
                ) : (
                  <>
                    {quote?.planLabel ?? "…"} with{" "}
                    <span className="font-medium text-foreground">
                      {units.toLocaleString()}
                    </span>{" "}
                    {selection === "send" ? "subscribers" : "contacts"}
                    {headlineAnnual ? ` · ${usd(headlineAnnual)}/yr` : ""}
                  </>
                )}
              </p>
            </div>
            <label className="text-right">
              <span className="mb-1 block text-xs text-muted-foreground">
                {selection === "send" ? "Subscribers" : "Contacts"}
              </span>
              <input
                type="number"
                min={sliderMin}
                max={sliderMax}
                value={units}
                onChange={(e) => {
                  const v = clamp(
                    Math.round(Number(e.target.value) || 0),
                    sliderMin,
                    sliderMax
                  );
                  if (selection === "send") setSubscribers(v);
                  else setContacts(v);
                }}
                className="h-9 w-32 rounded-lg border border-border bg-background px-3 text-right text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </label>
          </div>

          <input
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
            className="mt-4 w-full"
            style={{
              accentColor: "var(--primary)",
              background: `linear-gradient(90deg, var(--primary) ${sliderPct}%, var(--border) ${sliderPct}%)`,
            }}
          />

          {/* Suite tier stops. */}
          {selection === "suite" ? (
            <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
              {SUITE_TIER_ANCHORS.map((a) => (
                <button
                  key={a.plan}
                  type="button"
                  onClick={() => setContacts(a.contacts)}
                  className="transition-colors hover:text-foreground"
                >
                  {a.planLabel}
                </button>
              ))}
            </div>
          ) : null}

          {/* Cliff warning near a tier boundary. */}
          {nearCliff ? (
            <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
              <ExclamationTriangleIcon
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              Crossing {nearCliff.units.toLocaleString()} contacts moves you to{" "}
              {nearCliff.label}, about {usd(nearCliff.stepUp)}/mo more.
            </p>
          ) : null}

          {/* What you get at this size. */}
          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {isEmptySuite
                ? "Pay-as-you-go includes"
                : `${quote?.planLabel ?? "This plan"} includes`}
            </p>
            <IncludedRows
              rows={
                isEmptySuite
                  ? PAYG_INCLUDED
                  : selection === "send"
                    ? SEND_INCLUDED
                    : (TIER_ALLOWANCES[resolvedPlan] ?? TIER_ALLOWANCES.launch)
              }
            />
            {selection !== "send" ? <CoreCapabilities /> : null}
          </div>

          {/* Extra team seats - a delta above the tier's included count. The
              cost is folded into the headline total above by the quote. */}
          {!isEmptySuite ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Team seats
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {includedSeats} included · extra seats {usd(SEAT_PRICE_USD)}
                  /mo each
                  {extraSeats > 0 && quote?.seatMonthlyPrice
                    ? ` · +${usd(quote.seatMonthlyPrice)}/mo`
                    : ""}
                </p>
              </div>
              <div className="flex items-center rounded-lg border border-border">
                <button
                  type="button"
                  aria-label="Remove a seat"
                  disabled={extraSeats <= 0}
                  onClick={() => setExtraSeats((s) => clampExtraSeats(s - 1))}
                  className="flex size-9 items-center justify-center rounded-l-lg text-foreground transition-colors hover:bg-muted disabled:opacity-40"
                >
                  <MinusIcon className="size-4" aria-hidden="true" />
                </button>
                <span className="w-12 text-center text-sm font-medium tabular-nums text-foreground">
                  {includedSeats + extraSeats}
                </span>
                <button
                  type="button"
                  aria-label="Add a seat"
                  disabled={extraSeats >= MAX_EXTRA_SEATS}
                  onClick={() => setExtraSeats((s) => clampExtraSeats(s + 1))}
                  className="flex size-9 items-center justify-center rounded-r-lg text-foreground transition-colors hover:bg-muted disabled:opacity-40"
                >
                  <PlusIcon className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        // Pay-as-you-go: the metered $0 entry, no sizing.
        <div className="mt-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              $0
            </span>
            <span className="text-sm text-muted-foreground">/mo + usage</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Every capability, metered at list price. Prepaid wallet, $10 minimum
            top-up. Free until you import contacts.
          </p>
          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Pay-as-you-go includes
            </p>
            <IncludedRows rows={PAYG_INCLUDED} />
            <CoreCapabilities />
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-3">
        <Button
          type="button"
          size="lg"
          onClick={handleContinue}
          disabled={isSubmitting || isCurrent}
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
          ) : isCurrent ? (
            "Current plan"
          ) : selection === "payg" || isEmptySuite ? (
            submitLabel ? (
              `${submitLabel} pay-as-you-go`
            ) : (
              "Start free"
            )
          ) : (
            `${submitLabel ?? "Continue with"} ${quote?.planLabel ?? (selection === "send" ? "Send" : "Suite")}`
          )}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {selection === "payg" || isEmptySuite
            ? "No credit card required. Upgrade anytime."
            : paymentMethod === "card"
              ? "You'll complete payment on a secure Stripe checkout page. The price shown is what you're billed."
              : "You'll pay in USDC on a hosted crypto checkout page. The price shown is what you're billed."}
        </p>
      </div>
    </div>
  );
}
