import type { Metadata } from "next";

import { NsStandalone } from "@/onchain-suite-website/components/site/ns-standalone";
import { DpaPage } from "@/onchain-suite-website/components/site/site-bundle";

export const metadata: Metadata = {
  title: "Data Processing Agreement · OnchainSuite",
  description:
    "Article 28 terms for the data OnchainSuite processes on your behalf, plus our technical and organisational security measures.",
};

export default function Page() {
  return (
    <NsStandalone>
      <DpaPage />
    </NsStandalone>
  );
}
