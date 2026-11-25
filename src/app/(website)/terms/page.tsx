import type { Metadata } from "next";

import { NsStandalone } from "@/onchain-suite-website/components/site/ns-standalone";
import { TermsPage } from "@/onchain-suite-website/components/site/site-bundle";
import { pageMeta } from "@/onchain-suite-website/config/page-meta";

export const metadata: Metadata = pageMeta("/terms", {
  title: "Terms of Service",
  description:
    "The agreement for access to and use of the OnchainSuite platform.",
});

export default function Page() {
  return (
    <NsStandalone>
      <TermsPage />
    </NsStandalone>
  );
}
