import type { Metadata } from "next";

import { NsStandalone } from "@/onchain-suite-website/components/site/ns-standalone";
import { TermsPage } from "@/onchain-suite-website/components/site/site-bundle";

export const metadata: Metadata = {
  title: "Terms of Service · OnchainSuite",
  description:
    "The agreement for access to and use of the OnchainSuite platform.",
};

export default function Page() {
  return (
    <NsStandalone>
      <TermsPage />
    </NsStandalone>
  );
}
