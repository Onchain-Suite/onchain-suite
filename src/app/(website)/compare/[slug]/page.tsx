import type { Metadata } from "next";

import { ComingSoonPage } from "@/onchain-suite-website/components/landing/v2/coming-soon-page";

const COMPETITOR_NAMES: Record<string, string> = {
  "customer-io": "Customer.io",
  braze: "Braze",
  dotdigital: "Dotdigital",
  emailoctopus: "EmailOctopus",
  sendgrid: "SendGrid",
  brevo: "Brevo",
  formo: "Formo",
  addressable: "Addressable",
  galxe: "Galxe",
};

const nameFor = (slug: string) =>
  COMPETITOR_NAMES[slug] ??
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
  return { title: `OnchainSuite vs ${nameFor(slug)} · OnchainSuite` };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const name = nameFor(slug);
  return (
    <ComingSoonPage
      eyebrow="Compare"
      title={`OnchainSuite vs ${name}`}
      sub={`A detailed side-by-side of OnchainSuite and ${name} is being written. Talk to us about what you're evaluating and we'll map it for your stack.`}
    />
  );
}
