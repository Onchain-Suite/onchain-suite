import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StrategyGatePage } from "@/onchain-suite-website/components/retention-playbook/strategy-gate-page";
import { SITE_CONFIG_META } from "@/onchain-suite-website/config";
import { clientStrategy } from "@/onchain-suite-website/data/clients";
import { isGatedStrategy } from "@/onchain-suite-website/utils/strategy-gate";

/* src/proxy.ts rewrites a gated strategy's address here until its passcode is
   entered, so a link preview shows the title and nothing of the strategy. */

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ wrong?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const strategy = clientStrategy(slug);
  const title = strategy?.chapter.title ?? SITE_CONFIG_META.name;
  const description = "A private strategy. Enter the passcode to read it.";
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      siteName: SITE_CONFIG_META.name,
      images: [{ url: SITE_CONFIG_META.ogImage, width: 1200, height: 630 }],
    },
  };
}

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const strategy = clientStrategy(slug);
  if (!strategy || !isGatedStrategy(slug)) notFound();
  const { wrong } = await searchParams;
  return <StrategyGatePage strategy={strategy} wrong={wrong === "1"} />;
}
