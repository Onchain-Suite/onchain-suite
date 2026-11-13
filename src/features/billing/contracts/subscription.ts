/**
 * Response of `GET /billing/subscription/:organizationId`: the org's Stripe
 * subscription lifecycle, used for the billing panel's STATUS card and the
 * "cancels on <date>" indicator. `hasSubscription` is false for an org billed
 * another way (crypto/admin), in which case the UI shows the plan alone.
 */
export interface OrgSubscriptionResponse {
  hasSubscription: boolean;
  /**
   * Stripe's own status. `trialing` here is not a free trial: it is a
   * subscription started over time the org had already paid for, which bills
   * nothing until `currentPeriodEnd` (backend, 2026-11-12).
   */
  status: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  priceId: string | null;
  plan: string | null;
  /** The day the org has paid up to, with or without a subscription. */
  planExpiresAt: string | null;
  /**
   * The size the subscription was bought at. Absent on a backend that
   * predates sizes (2026-11-11), null when none is on record.
   */
  capacity?: number | null;
  /** The size it is billed at now; it follows a list that outgrew `capacity`. */
  billedUnits?: number | null;
  /**
   * `POST /billing/subscribe` will change this subscription in place. Absent
   * (so falsy) on an older backend, where the same call starts a second
   * checkout: the picker must not offer a subscriber a change without it.
   */
  canResize?: boolean;
  /**
   * A larger size is charged at once (the difference for the current period)
   * rather than on the next invoice. Absent (so falsy) on a backend that
   * still defers it: the picker reads this before it tells a buyer which.
   * Also false while `status` is `trialing`, where a change is not charged.
   */
  upgradeChargedNow?: boolean;
  /**
   * An org that has paid for its cycle another way and has no subscription is
   * not billed for that cycle again at the card checkout: it pays the
   * difference today and the full price from `planExpiresAt`. Absent (so
   * falsy) on a backend that bills the whole month (before 2026-11-12).
   */
  paidTimeCredited?: boolean;
}
