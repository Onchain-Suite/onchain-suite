import type { Metadata } from "next";

import { LEGAL_DOCS } from "@/onchain-suite-website/components/landing/v2/legal-content";
import { LegalDocPage } from "@/onchain-suite-website/components/landing/v2/legal-doc-page";

export const metadata: Metadata = {
  title: "Data Processing Agreement · OnchainSuite",
  description: LEGAL_DOCS.dpa.subtitle,
};

export default function Page() {
  return <LegalDocPage doc={LEGAL_DOCS.dpa} />;
}
