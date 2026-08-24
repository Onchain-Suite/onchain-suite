import type { Metadata } from "next";

import { ComingSoonPage } from "@/onchain-suite-website/components/landing/v2/coming-soon-page";

export const metadata: Metadata = {
  title: "Free tools · OnchainSuite",
  description:
    "Free on-chain growth tools from OnchainSuite: cost per acquisition, dormant wallet reactivation, wallet reachability and churn.",
};

export default function Page() {
  return (
    <ComingSoonPage
      eyebrow="Free tools"
      title="On-chain growth tools"
      sub="The cost-per-acquisition calculator is live now; dormant wallet reactivation, reachability and churn tools are on the way."
    />
  );
}
