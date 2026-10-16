import type { Metadata } from "next";

import { NsStandalone } from "@/onchain-suite-website/components/site/ns-standalone";
import { AudiencePage } from "@/onchain-suite-website/components/site/site-bundle";

export const metadata: Metadata = {
  title: "Audience · OnchainSuite",
  description:
    "Every wallet, email and app account on one customer record. Audience brings your lists, your product and your contracts together.",
};

export default function Page() {
  return (
    <NsStandalone>
      <AudiencePage />
    </NsStandalone>
  );
}
