import type { Metadata } from "next";

import { NsStandalone } from "@/onchain-suite-website/components/site/ns-standalone";
import { LoopsPage } from "@/onchain-suite-website/components/site/site-bundle";
import { pageMeta } from "@/onchain-suite-website/config/page-meta";

export const metadata: Metadata = pageMeta("/platform/loops", {
  title: "Loops: win-back emails triggered by on-chain events",
  description:
    "Journeys that start on-chain and stop the moment the customer acts. A Loop waits, checks a condition, sends by email or in-app, and ends when the action happens.",
});

export default function Page() {
  return (
    <NsStandalone>
      <LoopsPage />
    </NsStandalone>
  );
}
