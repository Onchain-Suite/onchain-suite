import type { Metadata } from "next";

import { PricingPage } from "@/onchain-suite-website/components/landing/v2/pricing-page";

export const metadata: Metadata = {
  title: "Pricing · OnchainSuite",
  description:
    "Usage-based pricing for OnchainSuite, priced by the on-chain wallets you track and the email subscribers you reach. No rigid tiers; founding rates for early teams.",
};

export default function Page() {
  return <PricingPage />;
}
