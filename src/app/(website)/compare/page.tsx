import type { Metadata } from "next";

import { NsCompareHub } from "@/onchain-suite-website/components/site/ns-compare-hub";

export const metadata: Metadata = {
  title: "Comparisons · OnchainSuite",
  description:
    "How OnchainSuite compares to Customer.io, Braze, SendGrid, Formo, Galxe and other messaging, analytics and growth tools for on-chain retention.",
};

export default function Page() {
  return <NsCompareHub />;
}
