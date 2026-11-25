import type { Metadata } from "next";

import { NsPricing } from "@/onchain-suite-website/components/site/ns-pricing";
import { pageMeta } from "@/onchain-suite-website/config/page-meta";

export const metadata: Metadata = pageMeta("/pricing", {
  title: "Pricing",
  description:
    "OnchainSuite pricing: the Suite plan for blockchain companies starts at $39 a month for 2,500 contacts, and the Send plan is $6 a month plus $3.95 per 1,000 subscribers.",
});

export default function Page() {
  return <NsPricing />;
}
