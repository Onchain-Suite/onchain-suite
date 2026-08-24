import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  COMPARISON_SLUGS,
  COMPARISONS,
} from "@/onchain-suite-website/components/landing/v2/compare-data";
import { ComparePage } from "@/onchain-suite-website/components/landing/v2/compare-page";

export function generateStaticParams() {
  return COMPARISON_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = COMPARISONS[slug];
  if (!data) return { title: "Comparison · OnchainSuite" };
  return {
    title: `OnchainSuite vs ${data.name} · OnchainSuite`,
    description: data.intro,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = COMPARISONS[slug];
  if (!data) notFound();
  return <ComparePage data={data} />;
}
