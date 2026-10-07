import type { Metadata } from "next";

import { NsPricing } from "@/onchain-suite-website/components/site/ns-pricing";

export const metadata: Metadata = {
  title: "Pricing · OnchainSuite",
  description:
    "Usage-based pricing for OnchainSuite, priced by the on-chain wallets you track and the email subscribers you reach. No rigid tiers; founding rates for early teams.",
};

export default function Page() {
  return <NsPricing />;
}
