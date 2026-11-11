/**
 * Single source of truth for team-seat pricing.
 *
 * Backend contract (docs/backend.md): `GET /billing/quote` and
 * `POST /billing/checkout/plan` both accept an `extraSeats` DELTA above the
 * tier's included seats, priced by the SAME `seatSurcharge` function - so the
 * shown total and the charged total cannot drift. Extra seats are capped at
 * {@link MAX_EXTRA_SEATS} per checkout; hostile/absent values price at 0.
 *
 * Seats are bought at checkout, BEFORE they are used: inviting someone never
 * adds a seat or a charge by itself. See {@link seatUsage}.
 *
 * These numbers (seat rate, included-per-tier) are display + input-bound helpers
 * only. The authoritative price for what a customer pays always comes from the
 * quote's `seatMonthlyPrice` / `totalMonthlyPrice`, never from arithmetic here.
 */

/** Monthly price per extra seat above a tier's included allowance. */
export const SEAT_PRICE_USD = 10;

/** The backend caps a single checkout at this many extra seats. */
export const MAX_EXTRA_SEATS = 50;

/** Included team seats per plan slug (matches the marketing pricing tiers). */
export const INCLUDED_SEATS: Record<string, number> = {
  payg: 2,
  send: 2,
  launch: 2,
  growth: 4,
  pro: 7,
};

/** Included seats for a plan slug, defaulting to the entry-tier allowance. */
export function includedSeatsForPlan(plan: string | null | undefined): number {
  if (!plan) return INCLUDED_SEATS.payg;
  return INCLUDED_SEATS[plan.toLowerCase()] ?? INCLUDED_SEATS.payg;
}

/** Clamp an extra-seat count to the valid [0, MAX_EXTRA_SEATS] integer range. */
export function clampExtraSeats(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(MAX_EXTRA_SEATS, Math.max(0, Math.round(value)));
}

/** Where a workspace stands on seats, for the Team card and the invite gate. */
export interface SeatUsage {
  /** Seats spoken for: members, plus invites that have not been accepted yet. */
  taken: number;
  /** Seats the workspace has: the plan's, plus any added in Billing. */
  limit: number;
  /** How many more people can be invited. */
  free: number;
  /** No seat is free: the backend will refuse the next invite. */
  isFull: boolean;
  /** `taken / limit` as 0-100, for the meter. */
  percent: number;
}

/**
 * Seat usage against the workspace's seat limit.
 *
 * Seats are bought ahead, not billed after the fact. A workspace has the seats
 * its plan includes plus any it added in Billing, and the backend refuses an
 * invite (402 `PLAN_LIMIT_EXCEEDED`) once members and pending invites fill
 * them. So a pending invite counts as taken here: it holds a seat until it is
 * accepted or cancelled, and a meter that left it out would show a free seat
 * the next invite cannot have. An accepted invite is a member, and takes the
 * seat it was holding.
 *
 * Null when the limit is not known (the plan has not loaded), or when the plan
 * has no seat limit: nothing can be said about what is free, so nothing is.
 */
export function seatUsage(input: {
  members: number | null | undefined;
  pendingInvites: number | null | undefined;
  limit: number | null | undefined;
}): SeatUsage | null {
  const { limit } = input;
  if (typeof limit !== "number" || !Number.isFinite(limit) || limit <= 0) {
    return null;
  }
  const count = (n: number | null | undefined) =>
    typeof n === "number" && Number.isFinite(n)
      ? Math.max(0, Math.round(n))
      : 0;
  const taken = count(input.members) + count(input.pendingInvites);
  return {
    taken,
    limit,
    free: Math.max(0, limit - taken),
    isFull: taken >= limit,
    percent: Math.min(100, Math.round((taken / limit) * 100)),
  };
}
