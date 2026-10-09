import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { FC } from "react";

import { NsStandalone } from "@/onchain-suite-website/components/site/ns-standalone";
import {
  ChurnCalculatorPage,
  DormantPage,
  LtvCalculatorPage,
  ReachabilityPage,
  WalletChurnRatePage,
} from "@/onchain-suite-website/components/site/site-bundle";

export const dynamicParams = false;

interface ToolDef {
  name: string;
  description: string;
  Component: FC;
}

/** Free-tool calculators keyed by slug (cost-per-acquisition has its own route). */
const TOOLS: Record<string, ToolDef> = {
  "churn-calculator": {
    name: "Wallet churn cost calculator",
    description:
      "What the wallets you lose each month cost you in revenue over a year.",
    Component: ChurnCalculatorPage,
  },
  "ltv-calculator": {
    name: "Wallet lifetime value calculator",
    description:
      "Lifetime value per wallet, and how much it rises when retention improves.",
    Component: LtvCalculatorPage,
  },
  "wallet-churn-rate": {
    name: "Wallet churn rate calculator",
    description:
      "One cohort over one period, then the compounding annual rate and the wallet lifespan it implies.",
    Component: WalletChurnRatePage,
  },
  "wallet-reachability-score": {
    name: "Wallet reachability score",
    description:
      "How much of your base you can message by email, in-app and socials, with each person counted once.",
    Component: ReachabilityPage,
  },
  "dormant-wallet-reactivation": {
    name: "Dormant wallet reactivation calculator",
    description:
      "Put a number on the revenue sitting in the wallets that stopped showing up.",
    Component: DormantPage,
  },
};

export function generateStaticParams() {
  return Object.keys(TOOLS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = TOOLS[slug];
  if (!tool) return { title: "Free tools · OnchainSuite" };
  return {
    title: `${tool.name} · OnchainSuite`,
    description: tool.description,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = TOOLS[slug];
  if (!tool) notFound();
  const { Component } = tool;
  return (
    <NsStandalone>
      <Component />
    </NsStandalone>
  );
}
