/**
 * Single source of truth for team-seat pricing.
 *
 * Backend contract (docs/backend.md): `GET /billing/quote` and
 * `POST /billing/checkout/plan` both accept an `extraSeats` DELTA above the
 * tier's included seats, priced by the SAME `seatSurcharge` function - so the
 * shown total and the charged total cannot drift. Extra seats are capped at
 * {@link MAX_EXTRA_SEATS} per checkout; hostile/absent values price at 0.
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

/** Seat billing state derived from a plan-usage seats meter. */
export interface SeatBilling {
  /** Seats already in use beyond the tier's included allowance. */
  extraSeats: number;
  /** Monthly surcharge for those extra seats (display estimate at the SSOT rate). */
  extraMonthlyUsd: number;
  /**
   * Whether the NEXT seat added would be a billable extra, i.e. the included
   * allowance is already full. Drives the "+$10/mo" disclosure on invite.
   */
  nextIsBillable: boolean;
}

/**
 * Derive seat billing from current seat usage vs the tier's included allowance.
 * Seats are usage-billed: the backend charges `max(0, used - included)` extra
 * seats at {@link SEAT_PRICE_USD}/mo (priced-usage), so adding a member past the
 * allowance bills on the invoice rather than needing a separate purchase. Values
 * here are display helpers; the authoritative charge is the backend's invoice.
 * Non-finite or negative inputs clamp to 0 (treated as no extra seats).
 */
export function seatBilling(
  used: number | null | undefined,
  includedLimit: number | null | undefined
): SeatBilling {
  const limit =
    typeof includedLimit === "number" && Number.isFinite(includedLimit)
      ? Math.max(0, includedLimit)
      : 0;
  const u =
    typeof used === "number" && Number.isFinite(used) ? Math.max(0, used) : 0;
  const extraSeats = Math.max(0, u - limit);
  return {
    extraSeats,
    extraMonthlyUsd: extraSeats * SEAT_PRICE_USD,
    nextIsBillable: u >= limit,
  };
}
