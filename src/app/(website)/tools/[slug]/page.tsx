import type { Metadata } from "next";
import type { ComponentType } from "react";

import { ComingSoonPage } from "@/onchain-suite-website/components/landing/v2/coming-soon-page";
import { DormantWalletPage } from "@/onchain-suite-website/components/landing/v2/dormant-wallet-page";
import { WalletChurnPage } from "@/onchain-suite-website/components/landing/v2/wallet-churn-page";
import { WalletReachabilityPage } from "@/onchain-suite-website/components/landing/v2/wallet-reachability-page";

interface ToolDef {
  name: string;
  description: string;
  Component: ComponentType;
}

/** Live calculators keyed by slug. Cost per acquisition has its own route. */
const TOOLS: Record<string, ToolDef> = {
  "wallet-churn-rate": {
    name: "Wallet churn rate calculator",
    description:
      "Churn measured on wallets, not accounts. Enter one period and see what it compounds to over a year, and how long a wallet lasts at that rate.",
    Component: WalletChurnPage,
  },
  "wallet-reachability-score": {
    name: "Wallet reachability score",
    description:
      "Score how much of your base is addressable today across email, wallet inbox, push and socials, weighted by how durable each channel really is.",
    Component: WalletReachabilityPage,
  },
  "dormant-wallet-reactivation": {
    name: "Dormant wallet reactivation calculator",
    description:
      "Put a number on the revenue sitting in the wallets that stopped showing up, and see how much of it reachability is costing you.",
    Component: DormantWalletPage,
  },
};

export function generateStaticParams() {
  return Object.keys(TOOLS).map((slug) => ({ slug }));
}

const nameFor = (slug: string) =>
  TOOLS[slug]?.name ??
  slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = TOOLS[slug];
  return {
    title: `${nameFor(slug)} · OnchainSuite`,
    ...(tool ? { description: tool.description } : {}),
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = TOOLS[slug];
  if (tool) {
    const { Component } = tool;
    return <Component />;
  }
  return (
    <ComingSoonPage
      eyebrow="Free tools"
      title={nameFor(slug)}
      sub="This tool is on the way. In the meantime, try the cost-per-acquisition calculator or talk to us about your on-chain audience."
    />
  );
}
