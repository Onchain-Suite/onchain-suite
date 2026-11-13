import type { OrgSubscriptionResponse } from "@/features/billing/contracts/subscription";

export const toTitle = (s: string): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};

export interface SubscriptionStatus {
  label: string;
  note?: string;
  tone?: "success" | "danger" | "pending";
}

/**
 * Map the org's Stripe subscription lifecycle to a STATUS pill. Empty label
 * means "no Stripe subscription" (or the endpoint isn't deployed) so the caller
 * falls back to the legacy status. A scheduled cancel is still `active` with
 * `cancelAtPeriodEnd`, which reads "Canceling · ends <date>".
 *
 * `trialing` is not a trial here. Nothing in the product starts one: it is
 * what Stripe calls a subscription started over time the workspace had
 * already paid for, which bills nothing until its first full charge. It read
 * "Trialing" to someone who had just paid; it is an active plan, with the date
 * of that charge beside it.
 */
export function subscriptionStatus(
  sub: OrgSubscriptionResponse | undefined
): SubscriptionStatus {
  if (sub?.hasSubscription !== true) return { label: "" };
  const status = (sub.status ?? "").toLowerCase();
  const endsOn = formatDate(sub.currentPeriodEnd);
  if (
    sub.cancelAtPeriodEnd === true &&
    (status === "active" || status === "trialing")
  ) {
    return {
      label: "Canceling",
      note: endsOn ? `Ends ${endsOn}` : undefined,
      tone: "danger",
    };
  }
  switch (status) {
    case "active":
      return { label: "Active", tone: "success" };
    case "trialing":
      return {
        label: "Active",
        note: endsOn ? `Paid up to ${endsOn}` : undefined,
        tone: "success",
      };
    case "past_due":
      return { label: "Past due", tone: "danger" };
    case "unpaid":
      return { label: "Unpaid", tone: "danger" };
    case "canceled":
      return { label: "Canceled", tone: "danger" };
    default:
      return { label: status ? toTitle(status) : "Active", tone: "pending" };
  }
}
