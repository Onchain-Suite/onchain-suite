import type { Metadata } from "next";

import { NsStandalone } from "@/onchain-suite-website/components/site/ns-standalone";
import { ToolsHub } from "@/onchain-suite-website/components/site/site-bundle";

export const metadata: Metadata = {
  title: "Free tools · OnchainSuite",
  description:
    "Free calculators for churn, wallet reachability, lifetime value and acquisition cost. No signup, no email gate - every tool runs in your browser.",
};

export default function Page() {
  return (
    <NsStandalone>
      <ToolsHub />
    </NsStandalone>
  );
}
