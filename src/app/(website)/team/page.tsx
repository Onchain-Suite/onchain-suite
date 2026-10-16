import type { Metadata } from "next";

import { NsStandalone } from "@/onchain-suite-website/components/site/ns-standalone";
import { TeamPage } from "@/onchain-suite-website/components/site/site-bundle";

export const metadata: Metadata = {
  title: "Team · OnchainSuite",
  description:
    "The team building OnchainSuite - the lifecycle intelligence and retention layer for Web3.",
};

export default function Page() {
  return (
    <NsStandalone>
      <TeamPage />
    </NsStandalone>
  );
}
