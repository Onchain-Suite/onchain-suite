import type { Metadata } from "next";

import { RetentionPlaybookPage } from "@/onchain-suite-website/components/retention-playbook/retention-playbook-page";
import { SITE_CONFIG_META } from "@/onchain-suite-website/config";
import { HERO, META } from "@/onchain-suite-website/data/retention-playbook";
import {
  parseCategory,
  sanitizeClientName,
} from "@/onchain-suite-website/utils/retention-playbook-params";

// Sales collateral sent to prospects by link: keep it out of search results,
// but give the link a proper preview card when it is pasted into a chat.
export const metadata: Metadata = {
  title: META.title,
  description: META.description,
  robots: { index: false, follow: false },
  alternates: { canonical: "/retention-playbook" },
  openGraph: {
    title: HERO.title,
    description: HERO.subtitle,
    siteName: SITE_CONFIG_META.name,
    type: "website",
    images: [{ url: SITE_CONFIG_META.ogImage, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: HERO.title,
    description: HERO.subtitle,
    images: [SITE_CONFIG_META.twitterImage],
  },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <RetentionPlaybookPage
      client={sanitizeClientName(params.client)}
      category={parseCategory(params.category)}
    />
  );
}
