import type { Metadata } from "next";

import { NsStandalone } from "@/onchain-suite-website/components/site/ns-standalone";
import { PrivacyPage } from "@/onchain-suite-website/components/site/site-bundle";

export const metadata: Metadata = {
  title: "Privacy Policy · OnchainSuite",
  description:
    "How OnchainSuite collects, uses and protects personal data under UK GDPR and the Data Protection Act 2018.",
};

export default function Page() {
  return (
    <NsStandalone>
      <PrivacyPage />
    </NsStandalone>
  );
}
