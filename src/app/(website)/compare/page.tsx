import type { Metadata } from "next";

import { ComingSoonPage } from "@/onchain-suite-website/components/landing/v2/coming-soon-page";

export const metadata: Metadata = {
  title: "Comparisons · OnchainSuite",
  description:
    "How OnchainSuite compares to Customer.io, Braze, SendGrid and other messaging platforms for on-chain retention.",
};

export default function Page() {
  return (
    <ComingSoonPage
      eyebrow="Compare"
      title="OnchainSuite vs the rest"
      sub="Side-by-side comparisons with the messaging platforms Web3 teams outgrow are being written. Tell us who you're evaluating and we'll walk you through it."
    />
  );
}
