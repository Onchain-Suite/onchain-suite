/**
 * "Run now" gating for the automation builder.
 *
 * The lending "Run now" control hits POST /automations/:id/defi/health-factor/run
 * (onchain-backend `runHealthFactor` -> `healthFactorTrigger.runNow`), which reads
 * on-chain lending positions and REQUIRES a pool address / protocol / chain. Only
 * the DeFi "Health Factor Crossed" trigger (`defi_health_factor`) carries that
 * config, so only it may run.
 *
 * `health_threshold` looks similar by name but is a CONTACT-SCORE trigger
 * (category 'scoring', config `{ direction, score }`) with no pool - pointing its
 * "Run now" at the lending endpoint fires a check that has nothing to read and
 * errors or no-ops. Its on-demand path is the score-based send-test instead
 * (`triggerHealthThreshold({ score })`), exposed via "Send test event".
 */

/** The only trigger `type` allowed to invoke the lending health-factor run-now. */
export const LENDING_RUN_NOW_TRIGGER_TYPE = "defi_health_factor";

/**
 * Whether a trigger's schema `type` may use the lending "Run now" control.
 * True ONLY for `defi_health_factor`; explicitly false for `health_threshold`
 * (the contact-score trigger) so the two never get conflated again.
 */
export const canRunLendingHealthFactorNow = (
  schemaType: string | null | undefined
): boolean => schemaType === LENDING_RUN_NOW_TRIGGER_TYPE;
