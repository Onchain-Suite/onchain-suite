import type { Metadata } from "next";

import { NsStandalone } from "@/onchain-suite-website/components/site/ns-standalone";
import { BlockchainCompanies } from "@/onchain-suite-website/components/site/site-bundle";
import { pageMeta } from "@/onchain-suite-website/config/page-meta";

export const metadata: Metadata = pageMeta("/for/blockchain-companies", {
  title: "Retention for blockchain companies",
  description:
    "OnchainSuite reads what customers do in your app and what their wallets do on-chain, adds how they respond to your messages, and answers in plain English.",
});

export default function Page() {
  return (
    <NsStandalone>
      <BlockchainCompanies />
    </NsStandalone>
  );
}
