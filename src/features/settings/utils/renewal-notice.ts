/**
 * What the billing page says to a workspace that still renews through our own
 * invoices, and what it offers.
 *
 * Such a workspace pays again by hand every cycle: a reminder, a pay page, and
 * a plan that lapses if nobody gets to it. The offer is to put that renewal on
 * a subscription at the price it already pays. Two things have to be said
 * plainly, because both are what a person hesitates over: the price does not
 * change, and nothing is charged before the date they are already paid up to.
 *
 * A workspace that cannot be moved from here (it already subscribes, it pays
 * nothing, its plan has lapsed) is told nothing: null.
 */

interface OfferLike {
  available?: boolean;
  planLabel?: string | null;
  cycle?: string | null;
  priceUsd?: number | null;
  renewsAt?: string | null;
  hasCard?: boolean;
}

export interface RenewalNotice {
  title: string;
  body: string;
  actionLabel: string;
}

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const dateOf = (iso?: string | null): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : DATE.format(date);
};

/** "$18" for a whole amount, "$65.18" otherwise. */
const money = (usd: number) =>
  `$${usd.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(usd) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

export function renewalNotice(
  offer: OfferLike | null | undefined
): RenewalNotice | null {
  if (offer?.available !== true) return null;
  const price = offer.priceUsd;
  const when = dateOf(offer.renewsAt);
  // Without the price or the date there is nothing true to promise.
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    return null;
  }
  if (!when) return null;

  const plan = offer.planLabel?.trim() ? offer.planLabel.trim() : "Your";
  const per = offer.cycle === "annual" ? "a year" : "a month";
  const paidTo =
    plan === "Your"
      ? `Your plan is paid up to ${when}.`
      : `Your ${plan} plan is paid up to ${when}.`;
  const rest = ` It renews by itself from then at ${money(price)} ${
    per
  }, the price you pay now. Nothing is charged before that date.`;

  return offer.hasCard === true
    ? {
        title: "Renew automatically",
        body: `${paidTo} Put it on the card we have on record.${rest}`,
        actionLabel: "Renew automatically",
      }
    : {
        title: "Renew automatically",
        body: `${paidTo} Add a card once.${rest}`,
        actionLabel: "Add a card",
      };
}
