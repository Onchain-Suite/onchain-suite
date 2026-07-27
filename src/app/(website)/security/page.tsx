import type { Metadata } from "next";

import { SecurityPage } from "@/onchain-suite-website/components/landing/v2/security-page";

export const metadata: Metadata = {
  title: "Security · OnchainSuite",
  description:
    "How to spot a phishing attempt, what OnchainSuite will never ask you for, and how to secure your account and wallet.",
};

export default function Page() {
  return <SecurityPage />;
}
