import type { Metadata } from "next";

import { EarlyAccessPage } from "@/onchain-suite-website/components/landing/v2/early-access-page";

export const metadata: Metadata = {
  title: "Get early access · OnchainSuite",
  description:
    "Tell us about your protocol and book a 20-minute call. We'll show you OnchainSuite on your own on-chain data.",
};

export default function Page() {
  return <EarlyAccessPage />;
}
