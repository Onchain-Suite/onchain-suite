import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PlaybookChapterPage } from "@/onchain-suite-website/components/retention-playbook/playbook-chapter-page";
import { SITE_CONFIG_META } from "@/onchain-suite-website/config";
import { PLAYBOOK_CHAPTERS } from "@/onchain-suite-website/data/playbooks";
import type { PlaybookChapter } from "@/onchain-suite-website/types/retention-playbook";
import {
  categoryOfSlug,
  playbookPath,
} from "@/onchain-suite-website/utils/retention-playbook-params";

function chapterFor(slug: string): PlaybookChapter | undefined {
  const category = categoryOfSlug(slug);
  return category
    ? PLAYBOOK_CHAPTERS.find((c) => c.id === category)
    : undefined;
}

/** The three sector pages are known at build time, so they are prerendered. */
export function generateStaticParams() {
  return PLAYBOOK_CHAPTERS.map((c) => ({
    category: playbookPath(c.id).split("/").pop() as string,
  }));
}

/** Only the three sector slugs exist; anything else is a 404. */
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
    alternates: { canonical: playbookPath(chapter.id) },
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
  return <PlaybookChapterPage chapter={chapter} />;
}
