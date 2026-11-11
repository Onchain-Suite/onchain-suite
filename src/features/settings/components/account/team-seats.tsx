import Link from "next/link";

import { cn } from "@/lib/utils";

import {
  SEAT_PRICE_USD,
  type SeatUsage,
} from "@/features/billing/seat-pricing";

export const BILLING_HREF = "/settings?tab=billing";

/**
 * How many seats the workspace has and how many are taken. Seats are bought
 * ahead: when they are all taken the next invite is refused, so this says so
 * and points at Billing, where a seat is added, instead of implying that an
 * invite adds one.
 */
export function TeamSeats({
  usage,
  pendingInvites,
}: {
  usage: SeatUsage;
  /** How many of the taken seats are invites not accepted yet. */
  pendingInvites: number;
}) {
  return (
    <div className="mb-4 rounded-xl border border-border/60 bg-background/40 p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">Seats</span>
        <span className="tabular-nums text-muted-foreground">
          {usage.taken} of {usage.limit} taken
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Seats taken"
        aria-valuemin={0}
        aria-valuemax={usage.limit}
        aria-valuenow={Math.min(usage.taken, usage.limit)}
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300",
            usage.isFull ? "bg-amber-500" : "bg-primary"
          )}
          style={{ width: `${usage.percent}%` }}
        />
      </div>
      {usage.isFull ? (
        <p className="mt-2 text-xs text-muted-foreground">
          All {usage.limit} seats are taken
          {pendingInvites > 0
            ? `, ${pendingInvites} by ${pendingInvites === 1 ? "an invite" : "invites"} not accepted yet`
            : ""}
          . To invite someone else,{" "}
          <Link
            href={BILLING_HREF}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            add a seat in Billing
          </Link>{" "}
          first (${SEAT_PRICE_USD} a month each)
          {pendingInvites > 0 ? ", or cancel an invite you no longer need" : ""}
          .
        </p>
      ) : pendingInvites > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {pendingInvites === 1
            ? "1 invite is holding a seat until it is accepted."
            : `${pendingInvites} invites are holding seats until they are accepted.`}
        </p>
      ) : null}
    </div>
  );
}
