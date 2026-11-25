import type { Metadata } from "next";

import { NsCompareHub } from "@/onchain-suite-website/components/site/ns-compare-hub";
import { pageMeta } from "@/onchain-suite-website/config/page-meta";

export const metadata: Metadata = pageMeta("/compare", {
  title: "Comparisons",
  description:
    "How OnchainSuite compares to Customer.io, Braze, SendGrid, Formo, Galxe and other messaging, analytics and growth tools for on-chain retention.",
});

export default function Page() {
  return <NsCompareHub />;
}
