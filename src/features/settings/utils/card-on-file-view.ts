/**
 * What the "Card on file" card says and offers.
 *
 * There are two cards a workspace can have, and they are not the same thing:
 *
 *  - A card saved with us. Our own renewal charges may use it, and it is
 *    replaced by saving another through the hosted card page.
 *  - The card on a Stripe subscription. Stripe charges it for the subscription
 *    and we never do. Saving another card here would not change which card the
 *    subscription renews on, so the action opens Stripe's billing portal, where
 *    it is changed.
 *
 * A subscriber used to see "No card on file", because only the first kind was
 * looked for.
 */

interface CardLike {
  hasCard?: boolean;
  brand?: string | null;
  last4?: string | null;
  since?: string | null;
  source?: string | null;
}

export interface CardOnFileView {
  hasCard: boolean;
  /** A card saved with us (not the subscription's). */
  savedWithUs: boolean;
  description: string;
  title: string;
  pill: string | null;
  note: string | null;
  /** "save" starts our hosted card page; "portal" opens Stripe's billing portal. */
  action: "save" | "portal";
  actionLabel: string;
}

const SAVE_DESCRIPTION =
  "Save a card to auto-charge renewals on the expiry day.";

const DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const formatSince = (iso?: string | null) => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : DATE.format(date);
};

const brandName = (brand?: string | null) => {
  const value = (brand ?? "").trim();
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Card";
};

const cardTitle = (card: CardLike) => {
  const last4 = (card.last4 ?? "").trim();
  return `${brandName(card.brand)} •••• ${last4.length > 0 ? last4 : "----"}`;
};

export function cardOnFileView(
  card: CardLike | null | undefined
): CardOnFileView {
  if (card?.hasCard !== true) {
    return {
      hasCard: false,
      savedWithUs: false,
      description: SAVE_DESCRIPTION,
      title: "No card on file",
      pill: null,
      note: "Without a card, renewals fall back to reminder emails + a hosted Pay link.",
      action: "save",
      actionLabel: "Add card",
    };
  }

  if (card.source === "subscription") {
    return {
      hasCard: true,
      savedWithUs: false,
      description: "The card your subscription renews on.",
      title: cardTitle(card),
      pill: "Pays your subscription",
      note: "Stripe charges this card when your plan renews. Change it in Stripe billing.",
      action: "portal",
      actionLabel: "Change card",
    };
  }

  const since = formatSince(card.since);
  return {
    hasCard: true,
    savedWithUs: true,
    description: SAVE_DESCRIPTION,
    title: cardTitle(card),
    pill: "On file",
    note: since ? `Added ${since}` : null,
    action: "save",
    actionLabel: "Update card",
  };
}
