import type { Metadata } from "next";

import { NsStandalone } from "@/onchain-suite-website/components/site/ns-standalone";
import { BlockchainCompanies } from "@/onchain-suite-website/components/site/site-bundle";

export const metadata: Metadata = {
  title: "OnchainSuite for blockchain companies",
  description:
    "OnchainSuite reads what customers do in your app and what their wallets do on-chain, adds how they respond to your messages, and answers in plain English.",
  alternates: { canonical: "/for/blockchain-companies" },
};

export default function Page() {
  return (
    <NsStandalone>
      <BlockchainCompanies />
    </NsStandalone>
  );
}
