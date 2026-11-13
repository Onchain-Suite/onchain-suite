/**
 * What the plan picker says under its button to a workspace that has already
 * paid for the cycle it is in, has no card subscription, and is about to buy a
 * different size by card.
 *
 * The line it replaces read "The price shown is what you're billed". For this
 * workspace that was the bug: it was billed the whole price shown, on top of a
 * month it had already paid for. The server now charges the difference today
 * and the price shown from the day they are paid up to, so that is what is
 * said, with the date.
 *
 * Extra seats bought on the same checkout start with the plan on that date, so
 * a month of them is charged today too, and the line says so.
 *
 * Null when there is nothing true to say, and the ordinary line is shown: the
 * server has not said it does this, they have paid for nothing, the date is
 * past or within two hours, or it is more than a month off (an annual plan
 * with months left, which the server still bills from today).
 */

import { clampExtraSeats, SEAT_PRICE_USD } from "../seat-pricing";

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const HOUR = 60 * 60 * 1000;
/** The server's own floor for starting a subscription on a later day. */
const MIN_LEAD_MS = 2 * HOUR;
/** Inside this the server charges nothing today, whatever the difference. */
const MIN_CHARGE_LEAD_MS = 49 * HOUR;

const dollars = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

const positive = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;

/** One calendar month after `from`, as the server counts it. */
const monthAfter = (from: Date): number => {
  const d = new Date(from.getTime());
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.getTime();
};

export function paidTimeHint(input: {
  /** The server credits time already paid for (`paidTimeCredited`). */
  credited?: boolean;
  /** The day they are paid up to (`planExpiresAt`). */
  paidThrough?: string | null;
  /** What the plan costs them a month now. */
  currentMonthly?: number | null;
  /** The quote for the size on the slider; null while it is being fetched. */
  newMonthly?: number | null;
  /** Seats added on the stepper, bought with the plan. */
  extraSeats?: number;
  now?: Date;
}): string | null {
  if (input.credited !== true) return null;
  const current = positive(input.currentMonthly);
  if (current === null || !input.paidThrough) return null;
  const through = new Date(input.paidThrough);
  const now = input.now ?? new Date();
  const left = through.getTime() - now.getTime();
  if (Number.isNaN(left) || left < MIN_LEAD_MS) return null;
  if (through.getTime() > monthAfter(now)) return null;

  const until = DATE.format(through);
  const next = positive(input.newMonthly);
  const seats = clampExtraSeats(input.extraSeats);
  const seatsMonthly = seats * SEAT_PRICE_USD;
  const page = "on a secure Stripe checkout page";
  if (next === null) {
    const what =
      seats > 0
        ? "the difference for a larger size and the extra seats until then"
        : "the difference for a larger size";
    return `You have already paid up to ${until}. Today you pay only ${what}, ${page}. The new price starts on that date.`;
  }
  // The amounts are the picker's quotes, in whole dollars: "about".
  const difference = Math.max(0, Math.round(next) - Math.round(current));
  const owed = difference + seatsMonthly;
  const after =
    seats > 0
      ? `${dollars(next)}/mo, plus ${dollars(seatsMonthly)}/mo for ${seats} extra seat${seats === 1 ? "" : "s"}`
      : `${dollars(next)}/mo`;
  if (owed < 1 || left < MIN_CHARGE_LEAD_MS) {
    return `You have already paid up to ${until}, so nothing is charged today. You'll add a card ${page}, and the plan is ${after} from that date.`;
  }
  const what =
    difference >= 1 && seats > 0
      ? "the difference and the extra seats until then"
      : seats > 0
        ? "for the extra seats until then"
        : "the difference";
  return `You have already paid up to ${until}, so today you pay only ${what}, about ${dollars(owed)}, ${page}. From that date the plan is ${after}.`;
}
