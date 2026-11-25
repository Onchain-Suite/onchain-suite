import type { Metadata } from "next";

import { NsStandalone } from "@/onchain-suite-website/components/site/ns-standalone";
import { LegalPage } from "@/onchain-suite-website/components/site/site-bundle";
import { pageMeta } from "@/onchain-suite-website/config/page-meta";

export const metadata: Metadata = pageMeta("/legal", {
  title: "Legal",
  description:
    "Terms of Service, Privacy Policy, Data Processing Agreement, Sub-processors and Cookie Policy for OnchainSuite.",
});

export default function Page() {
  return (
    <NsStandalone>
      <LegalPage />
    </NsStandalone>
  );
}
