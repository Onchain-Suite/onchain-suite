import { NsShell } from "./ns-shell";
import { PricingBody } from "./site-bundle";

/**
 * Redesigned pricing page ("ns" design) under the retained legacy navbar.
 * Phase 2 of the site redesign. Pricing numbers match the SSOT
 * (Suite $16 + $13.30 / 1,000 contacts; Launch $39 / Growth $349 / Pro $1,622;
 * Send $6 + $3.95 / 1,000 subscribers, stops to 500k).
 */
export function NsPricing() {
  return (
    <NsShell>
      <PricingBody />
    </NsShell>
  );
}

export default NsPricing;
