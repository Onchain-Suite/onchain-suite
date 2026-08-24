import type { Metadata } from "next";

import { ComingSoonPage } from "@/onchain-suite-website/components/landing/v2/coming-soon-page";

const TOOL_NAMES: Record<string, string> = {
  "dormant-wallet-reactivation": "Dormant wallet reactivation",
  "wallet-reachability-score": "Wallet reachability score",
  "wallet-churn-rate": "Wallet churn rate",
};

const nameFor = (slug: string) =>
  TOOL_NAMES[slug] ??
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
  return { title: `${nameFor(slug)} · OnchainSuite` };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <ComingSoonPage
      eyebrow="Free tools"
      title={nameFor(slug)}
      sub="This tool is on the way. In the meantime, try the cost-per-acquisition calculator or talk to us about your on-chain audience."
    />
  );
}
