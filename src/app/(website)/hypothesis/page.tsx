import type { Metadata } from "next";

import { NsStandalone } from "@/onchain-suite-website/components/site/ns-standalone";
import { HypothesisPage } from "@/onchain-suite-website/components/site/site-bundle";
import { pageMeta } from "@/onchain-suite-website/config/page-meta";

export const metadata: Metadata = pageMeta("/hypothesis", {
  title: "Our hypothesis",
  description:
    "The most important things your users do happen on-chain, and the tools you use to talk to them cannot see it. This is our case for changing that.",
});

export default function Page() {
  return (
    <NsStandalone>
      <HypothesisPage />
    </NsStandalone>
  );
}
