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
}
