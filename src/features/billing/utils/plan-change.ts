/**
 * What pressing the plan picker's button would do for a workspace, given what
 * it has now.
 *
 * The picker used to compare only the TIER: any size inside the current tier
 * read as "Current plan" and the button was dead. A workspace on Launch at
 * 5,000 contacts could not buy 12,000, because 12,000 is still Launch; the
 * only way to a bigger list was to cross into Growth.
 *
 * So the size counts too. The cases:
 *
 *  - `current`  nothing would change: same plan, same size (or a size we
 *               cannot compare, because what they have now is not known).
 *  - `resize`   same plan, a different size.
 *  - `switch`   a different plan.
 *  - `blocked`  they subscribe by card, and the server has not said it can
 *               change that subscription in place. Sending them to checkout
 *               would create a second subscription beside the first, so the
 *               picker offers nothing rather than that.
 */
export type PlanChange = "current" | "resize" | "switch" | "blocked";

/** What the workspace has now, as far as the server has told us. */
export interface CurrentPlanSize {
  /** Contacts (Suite) or subscribers (Send) paid for now; null when unknown. */
  units: number | null;
  /** Billed through a card subscription (as opposed to crypto, or not at all). */
  hasSubscription: boolean;
  /** The server will change that subscription in place. */
  canResize: boolean;
  /** What the plan costs them a month now, in dollars; null when unknown. */
  monthlyPrice?: number | null;
  /** The server charges a larger size at once, not on the next invoice. */
  upgradeChargedNow?: boolean;
}

export function planChange(input: {
  /** The plan the picker's selection resolves to. */
  resolvedPlan: string;
  /** The workspace's plan, lower-cased; empty when it has none. */
  currentPlan: string;
  /** The size on the slider. */
  units: number;
  current?: CurrentPlanSize | null;
}): PlanChange {
  const { resolvedPlan, currentPlan, units, current } = input;
  const samePlan = resolvedPlan === currentPlan;
  const known = typeof current?.units === "number" && current.units > 0;
  const sameSize = !known || Math.round(units) === current?.units;

  // Pay-as-you-go has no size to change.
  if (samePlan && (sameSize || resolvedPlan === "payg")) return "current";

  if (current?.hasSubscription) {
    return current.canResize ? (samePlan ? "resize" : "switch") : "blocked";
  }
  if (!samePlan) return "switch";
  // No card subscription: a larger size is bought as an upgrade. There is no
  // purchase that makes a paid-up size smaller, so that offers nothing.
  return units > (current?.units ?? 0) ? "resize" : "current";
}

/** The words on the button. */
export function planSubmitLabel(input: {
  change: PlanChange;
  /** Pay-as-you-go, or a Suite slider at zero (which is pay-as-you-go). */
  isPayg: boolean;
  /** "Upgrade to" in Settings, absent in onboarding. */
  submitLabel?: string;
  /** The plan's display name, e.g. "Launch". */
  planLabel: string;
  units: number;
  unit: "contacts" | "subscribers";
}): string {
  const { change, isPayg, submitLabel, planLabel, units, unit } = input;
  if (change === "current") return "Current plan";
  if (change === "blocked") return "Change it in Manage billing";
  if (isPayg)
    return submitLabel ? `${submitLabel} pay-as-you-go` : "Start free";
  if (change === "resize") {
    return `Update to ${Math.round(units).toLocaleString("en-US")} ${unit}`;
  }
  return `${submitLabel ?? "Continue with"} ${planLabel}`;
}

const dollars = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/**
 * What a subscriber is told about a change that is applied with no checkout.
 *
 * A larger size is charged at once, for the difference between the two sizes
 * for the period they are in; the new price in full starts at the next
 * renewal. The amounts are the picker's quotes, which are whole dollars, so
 * the difference is "about": the card is charged to the cent.
 */
function inPlaceHint(input: {
  larger: boolean;
  chargedNow: boolean;
  currentMonthly?: number | null;
  newMonthly?: number | null;
}): string {
  if (!input.larger) {
    return "Takes effect at your next renewal, with no checkout. Nothing is charged or refunded now.";
  }
  // A server that has not said it charges at once adds the cost to the next
  // invoice instead. Say what THAT server does, not what the newest one does.
  if (!input.chargedNow) {
    return "Applied to your subscription straight away, with no checkout. The extra for this period is added to your next invoice.";
  }
  const { currentMonthly, newMonthly } = input;
  if (
    typeof currentMonthly === "number" &&
    typeof newMonthly === "number" &&
    currentMonthly > 0 &&
    newMonthly > currentMonthly
  ) {
    return `Your card is charged the difference for this period now, about ${dollars(newMonthly - currentMonthly)}, with no checkout. From your next renewal it is ${dollars(newMonthly)}/mo.`;
  }
  return "Your card is charged the difference for this period now, with no checkout. The new price in full starts at your next renewal.";
}

/** The line under the button: what happens next, and to their money. */
export function planSubmitHint(input: {
  change: PlanChange;
  isPayg: boolean;
  /** They subscribe by card, so a change is applied without a checkout. */
  inPlace: boolean;
  paymentMethod: "card" | "crypto";
  /** The new size is larger than the one they have. */
  larger?: boolean;
  /** The server charges a larger size at once. */
  chargedNow?: boolean;
  currentMonthly?: number | null;
  newMonthly?: number | null;
}): string {
  const { change, isPayg, inPlace, paymentMethod } = input;
  if (change === "blocked") {
    return "Your subscription can't be changed from here right now. Use Manage billing.";
  }
  if (isPayg) return "No credit card required. Upgrade anytime.";
  if (inPlace && change !== "current") {
    return inPlaceHint({
      larger: input.larger !== false,
      chargedNow: input.chargedNow === true,
      currentMonthly: input.currentMonthly,
      newMonthly: input.newMonthly,
    });
  }
  return paymentMethod === "card"
    ? "You'll complete payment on a secure Stripe checkout page. The price shown is what you're billed."
    : "You'll pay in USDC on a hosted crypto checkout page. The price shown is what you're billed.";
}

/** Everything the picker's button needs, from what the picker knows. */
export function planSubmit(input: {
  resolvedPlan: string;
  currentPlan?: string;
  units: number;
  current?: CurrentPlanSize | null;
  selection: "suite" | "send" | "payg";
  submitLabel?: string;
  /** The quote for the slider's size: its plan name and price without seats. */
  quote?: { planLabel?: string; monthlyPrice?: number } | null;
  paymentMethod: "card" | "crypto";
}): { change: PlanChange; disabled: boolean; label: string; hint: string } {
  const isPayg = input.resolvedPlan === "payg";
  const change = planChange({
    resolvedPlan: input.resolvedPlan,
    currentPlan: (input.currentPlan ?? "").trim().toLowerCase(),
    units: input.units,
    current: input.current,
  });
  return {
    change,
    disabled: change === "current" || change === "blocked",
    label: planSubmitLabel({
      change,
      isPayg,
      submitLabel: input.submitLabel,
      planLabel:
        input.quote?.planLabel ??
        (input.selection === "send" ? "Send" : "Suite"),
      units: input.units,
      unit: input.selection === "send" ? "subscribers" : "contacts",
    }),
    hint: planSubmitHint({
      change,
      isPayg,
      inPlace:
        input.paymentMethod === "card" &&
        input.current?.hasSubscription === true &&
        input.current.canResize,
      paymentMethod: input.paymentMethod,
      larger: input.units > (input.current?.units ?? 0),
      chargedNow: input.current?.upgradeChargedNow === true,
      currentMonthly: input.current?.monthlyPrice,
      newMonthly: input.quote?.monthlyPrice,
    }),
  };
}
