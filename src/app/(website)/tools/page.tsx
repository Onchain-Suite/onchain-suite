import type { Metadata } from "next";

import { ToolsIndexPage } from "@/onchain-suite-website/components/landing/v2/tools-index-page";

export const metadata: Metadata = {
  title: "Free tools · OnchainSuite",
  description:
    "Free on-chain growth calculators: cost per acquisition, dormant wallet reactivation, wallet reachability and churn. No signup, no email gate, every formula on the page.",
};

export default function Page() {
  return <ToolsIndexPage />;
}
