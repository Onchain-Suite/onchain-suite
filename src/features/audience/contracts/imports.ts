/**
 * Backend contracts for the audience imports API family.
 *
 * Mirrors `docs/backend.md` imports section. Types only — no runtime code.
 */

/**
 * `POST /audience/imports/estimate` response (backend 2026-10-23): a dry,
 * no-write pre-check the UI runs before committing an import. It answers two
 * questions the real import would otherwise only surface by failing: can a PAYG
 * wallet cover the verification cost, and will the import exceed the plan's
 * contact cap.
 *
 * Money is a hard gate (`willExceedBalance`); the cap is a warning only
 * (`willExceedCap`) - over-cap rows are quarantined, not rejected.
 */
export interface AudienceImportEstimate {
  /** Rows parsed from the uploaded file (header excluded). */
  contacts: number;
  /** Whether the org bills usage from a prepaid wallet. */
  isPayg: boolean;
  /**
   * Projected PAYG verification cost in USD: addresses beyond the plan
   * allowance times the ONS+ rate. Always 0 for non-PAYG orgs and for
   * wallet-dedupe imports (no emails are verified).
   */
  estimatedCostUsd: number;
  /** Current usage-wallet balance in USD (0 for non-PAYG). */
  walletBalanceUsd: number;
  /** True when the cost exceeds the wallet balance: the UI must block + prompt a top-up. */
  willExceedBalance: boolean;
  /** USD to top up to cover this import (0 when the wallet already covers it). */
  shortfallUsd: number;
  /** Plan contact cap, or null when unlimited. */
  contactLimit: number | null;
  /** Contacts already in the org. */
  existingContacts: number;
  /** Remaining cap room (`contactLimit - existingContacts`), or null when unlimited. */
  headroom: number | null;
  /** True when the row count exceeds the headroom: a warning, not a block. */
  willExceedCap: boolean;
  /** How many rows would be quarantined over the cap (0 when within it). */
  overCapBy: number;
  /**
   * When over cap, whether raising the plan to cover the file would actually
   * cost money (the proration is at/above Stripe's card minimum). `false` means
   * the plan already prices these contacts - the import can run silently and the
   * capacity is raised, with the higher contact pricing collected at renewal.
   * Backend 2026-10-27; absent on older responses (treated as "chargeable", so
   * the gate still shows).
   */
  requiresPaidUpgrade?: boolean;
  /** The one-time upgrade proration in USD (0 when no paid upgrade is needed). */
  upgradeChargeUsd?: number;
}

/**
 * `POST /billing/checkout/import-upgrade` response (backend 2026-10-23): the
 * "upgrade & import" flow. The import is held server-side (AWAITING_PAYMENT) and
 * a plan-upgrade checkout is returned; on payment the backend raises the cap and
 * resumes the import in the background, so the user can leave the page.
 *
 * NO-CHARGE case (backend 2026-10-27): when the upgrade prorates below Stripe's
 * card minimum (the plan already covers these contacts), the backend raises the
 * capacity and runs the import immediately - `checkout` is `null` and
 * `noChargeRequired` is true. There is nothing to pay and nowhere to redirect.
 */
export interface ImportUpgradeCheckout {
  /** The held import job that resumes once the upgrade is paid (or the running job in the no-charge case). */
  jobId: string;
  /** Contact capacity the upgrade buys (existing + imported), the new plan size. */
  targetContacts: number;
  /** Contacts already in the org. */
  existingContacts: number;
  /** Rows in the file. */
  importContacts: number;
  /** Rows that would have been over the old cap. */
  overCapBy: number;
  /** True when no payment was needed: the import is already running. */
  noChargeRequired?: boolean;
  /**
   * Checkout to send the user to; `url` is the hosted payment page. `null` in
   * the no-charge case, where the import is already running.
   */
  checkout: {
    url?: string;
    paymentUrl?: string;
    sessionId?: string;
    plan?: string;
    cycle?: string;
  } | null;
}
