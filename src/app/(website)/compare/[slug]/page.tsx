import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  COMPARE_BY_SLUG,
  COMPARE_SLUGS,
} from "@/onchain-suite-website/components/site/compare-meta";
import { NsComparePage } from "@/onchain-suite-website/components/site/ns-compare-page";

// Only the known competitors render; any other slug 404s.
export const dynamicParams = false;

export function generateStaticParams() {
  return COMPARE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = COMPARE_BY_SLUG[slug];
  if (!c) return { title: "Comparison · OnchainSuite" };
  return {
    title: `OnchainSuite vs ${c.name} · OnchainSuite`,
    description: c.intro,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!COMPARE_BY_SLUG[slug]) notFound();
  return <NsComparePage slug={slug} />;
}
