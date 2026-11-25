import type { Metadata } from "next";

import { NsStandalone } from "@/onchain-suite-website/components/site/ns-standalone";
import { ReferPage } from "@/onchain-suite-website/components/site/site-bundle";
import { pageMeta } from "@/onchain-suite-website/config/page-meta";

export const metadata: Metadata = pageMeta("/refer", {
  title: "Refer a team or become an agency partner",
  description:
    "Introduce a team that should be using OnchainSuite, or become an agency partner and run OnchainSuite for the companies you work with.",
});

export default function Page() {
  return (
    <NsStandalone>
      <ReferPage />
    </NsStandalone>
  );
}
