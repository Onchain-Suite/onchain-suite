const BILLING_TAB = "/settings?tab=billing";

/**
 * Where `/billing` sends the browser: the billing tab in Settings, carrying
 * over what the visit was about.
 *
 * Checkout sessions issued before the cancel URL was fixed come back as
 * `/billing?canceled=<ref>`. That is a cancelled checkout, and the billing tab
 * says so when it sees `checkout=canceled`; a bare redirect would drop the
 * marker and land the person on a page that looks as it did before they left.
 * The reference itself is not carried: nothing on the tab reads it.
 */
export function billingRedirectTarget(
  params: Record<string, string | string[] | undefined>
): string {
  const { canceled } = params;
  const wasCanceled = Array.isArray(canceled)
    ? canceled.some(Boolean)
    : Boolean(canceled);
  return wasCanceled ? `${BILLING_TAB}&checkout=canceled` : BILLING_TAB;
}
