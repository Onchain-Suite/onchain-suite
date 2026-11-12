/**
 * A workspace's own renewal, from `GET /billing/renewal` (2026-11-12).
 *
 * Workspaces that bought a plan before card checkouts became subscriptions
 * renew month by month through our own invoices. This says whether the active
 * workspace is one of them, and whether its owner can put that renewal on a
 * Stripe subscription from the billing page.
 *
 * Types only. Safe to import from anywhere.
 */
export interface RenewalOffer {
  /** Its owner can put the renewal on a subscription from here. */
  available: boolean;
  /**
   * Why not, when it cannot (`already_subscribed`, `lapsed`, `not_paying`, ...).
   * `ready` or `no_card` when it can.
   */
  reason: string;
  plan: string | null;
  /** The plan's display name, e.g. "Send". */
  planLabel: string | null;
  cycle: "monthly" | "annual";
  /** What it pays each cycle, and would go on paying. Dollars. */
  priceUsd: number | null;
  /** The day it is paid up to, which is the first charge. ISO. */
  renewsAt: string | null;
  /** Stripe already holds a card: one click, no page to fill in. */
  hasCard: boolean;
}

/** `POST /billing/renewal/subscribe`: where to send the browser next. */
export interface RenewalSubscribeResponse {
  /** Stripe's hosted page when a card is needed, the billing tab otherwise. */
  url?: string;
}
