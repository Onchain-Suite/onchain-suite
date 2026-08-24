import type { Metadata } from "next";

import { TeamPage } from "@/onchain-suite-website/components/landing/v2/team-page";

export const metadata: Metadata = {
  title: "Team · OnchainSuite",
  description:
    "The people building OnchainSuite: a small team of blockchain data and growth people building the retention layer Web3 never had.",
};

export default function Page() {
  return <TeamPage />;
}
