import type { Metadata } from "next";

import { LegalPage } from "@/onchain-suite-website/components/landing/v2/legal-page";

export const metadata: Metadata = {
  title: "Legal & compliance · OnchainSuite",
  description:
    "OnchainSuite privacy, terms, and compliance. Read-only, non-custodial on-chain monitoring with a zero-knowledge identity bridge.",
};

export default function Page() {
  return <LegalPage />;
}
