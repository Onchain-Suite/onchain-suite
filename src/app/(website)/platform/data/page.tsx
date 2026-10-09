import type { Metadata } from "next";

import { NsStandalone } from "@/onchain-suite-website/components/site/ns-standalone";
import { DataPage } from "@/onchain-suite-website/components/site/site-bundle";

export const metadata: Metadata = {
  title: "How we use data · OnchainSuite",
  description:
    "We read the two lanes your customers leave a record in, join them into one record per person, and never hold funds or private keys.",
};

export default function Page() {
  return (
    <NsStandalone>
      <DataPage />
    </NsStandalone>
  );
}
