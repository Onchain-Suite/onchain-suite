import type { Metadata } from "next";

import { NsStandalone } from "@/onchain-suite-website/components/site/ns-standalone";
import { SubprocessorsPage } from "@/onchain-suite-website/components/site/site-bundle";

export const metadata: Metadata = {
  title: "Sub-processors · OnchainSuite",
  description: "The third parties OnchainSuite engages to provide the service.",
};

export default function Page() {
  return (
    <NsStandalone>
      <SubprocessorsPage />
    </NsStandalone>
  );
}
