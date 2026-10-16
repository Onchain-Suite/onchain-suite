import type { Metadata } from "next";

import { NsStandalone } from "@/onchain-suite-website/components/site/ns-standalone";
import { SegmentsPage } from "@/onchain-suite-website/components/site/site-bundle";

export const metadata: Metadata = {
  title: "Segments · OnchainSuite",
  description:
    "Describe an audience in a sentence and get the rules back. Segments turn what customers do in your app and on-chain into an audience you can send to.",
};

export default function Page() {
  return (
    <NsStandalone>
      <SegmentsPage />
    </NsStandalone>
  );
}
