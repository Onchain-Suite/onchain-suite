import type { Metadata } from "next";

import { CpaCalculatorPage } from "@/onchain-suite-website/components/landing/v2/cpa-calculator-page";

export const metadata: Metadata = {
  title: "Cost per acquisition calculator · OnchainSuite",
  description:
    "Enter spend, connects and first transactions to see what a transacting wallet actually costs, per channel and blended. Cost per connect flatters every channel.",
};

export default function Page() {
  return <CpaCalculatorPage />;
}
