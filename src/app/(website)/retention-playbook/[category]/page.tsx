import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PlaybookChapterPage } from "@/onchain-suite-website/components/retention-playbook/playbook-chapter-page";
import { SITE_CONFIG_META } from "@/onchain-suite-website/config";
import { CLIENT_STRATEGIES } from "@/onchain-suite-website/data/clients";
import { PLAYBOOK_CHAPTERS } from "@/onchain-suite-website/data/playbooks";
import type { Chapter } from "@/onchain-suite-website/types/retention-playbook";
import {
  categoryOfSlug,
  playbookPath,
  strategyPathForSlug,
} from "@/onchain-suite-website/utils/retention-playbook-params";

/** A slug names a sector strategy, or a client's, or nothing. */
function chapterFor(slug: string): Chapter | undefined {
  const category = categoryOfSlug(slug);
  if (category) {
    return PLAYBOOK_CHAPTERS.find((c) => c.id === category);
  }
  return CLIENT_STRATEGIES.find((s) => s.slug === slug)?.chapter;
}

/** Every strategy page is known at build time, so all are prerendered. */
export function generateStaticParams() {
  return [
    ...PLAYBOOK_CHAPTERS.map(
      (c) => playbookPath(c.id).split("/").pop() as string
    ),
    ...CLIENT_STRATEGIES.map((s) => s.slug),
  ].map((category) => ({ category }));
}

/** Only those slugs exist; anything else is a 404. */
export const dynamicParams = false;

// Same as the landing page: out of search results, but a proper preview card
// when the link is pasted into a chat. Each sector gets its own card.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const chapter = chapterFor(category);
  if (!chapter) {
    return { robots: { index: false, follow: false } };
  }
  return {
    title: chapter.title,
    description: chapter.dek,
    robots: { index: false, follow: false },
    alternates: { canonical: strategyPathForSlug(category) },
    openGraph: {
      title: chapter.title,
      description: chapter.dek,
      siteName: SITE_CONFIG_META.name,
      type: "article",
      images: [{ url: SITE_CONFIG_META.ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: chapter.title,
      description: chapter.dek,
      images: [SITE_CONFIG_META.twitterImage],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const chapter = chapterFor(category);
  if (!chapter) {
    notFound();
  }
  return <PlaybookChapterPage chapter={chapter} slug={category} />;
}
