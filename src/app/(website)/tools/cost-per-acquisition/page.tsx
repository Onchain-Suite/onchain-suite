import type { Metadata } from "next";

import { NsStandalone } from "@/onchain-suite-website/components/site/ns-standalone";
import { CpaPage } from "@/onchain-suite-website/components/site/site-bundle";

export const metadata: Metadata = {
  title: "Cost per acquisition calculator · OnchainSuite",
  description:
    "Spend by channel against wallets that actually transacted, so a connected wallet stops counting as an acquisition.",
};

export default function Page() {
  return (
    <NsStandalone>
      <CpaPage />
    </NsStandalone>
  );
}
