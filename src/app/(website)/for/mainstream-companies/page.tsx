import type { Metadata } from "next";

import { NsStandalone } from "@/onchain-suite-website/components/site/ns-standalone";
import { MainstreamCompanies } from "@/onchain-suite-website/components/site/site-bundle";
import { pageMeta } from "@/onchain-suite-website/config/page-meta";

export const metadata: Metadata = pageMeta("/for/mainstream-companies", {
  title: "OnchainSuite for mainstream companies",
  description:
    "OnchainSuite joins what customers do in your product with how they respond to your emails, so your team can find who needs a message. From $6 a month.",
});

export default function Page() {
  return (
    <NsStandalone>
      <MainstreamCompanies />
    </NsStandalone>
  );
}
