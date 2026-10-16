import type { Metadata } from "next";

import { NsStandalone } from "@/onchain-suite-website/components/site/ns-standalone";
import { DataTransfersPage } from "@/onchain-suite-website/components/site/site-bundle";

export const metadata: Metadata = {
  title: "International Data Transfers · OnchainSuite",
  description:
    "Safeguards for data leaving the UK, including the UK Extension to the EU-US Data Privacy Framework and the UK IDTA.",
};

export default function Page() {
  return (
    <NsStandalone>
      <DataTransfersPage />
    </NsStandalone>
  );
}
