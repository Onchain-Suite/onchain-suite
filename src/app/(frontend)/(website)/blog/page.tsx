import type { Metadata } from "next";

import { getSiteUrl } from "@/onchain-suite-website/blog/blog.seo";
import {
  listCategories,
  listPosts,
  POSTS_PER_PAGE,
} from "@/onchain-suite-website/blog/blog.service";
import { BlogIndexView } from "@/onchain-suite-website/blog/components/blog-index-view";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Onchain retention, wallet-first identity and multi-channel messaging - notes from the team building OnchainSuite.",
  alternates: { canonical: `${getSiteUrl()}/blog` },
};

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const parsed = Number(pageParam);
  const page = Number.isInteger(parsed) && parsed > 0 ? parsed : 1;

  // Parallel, not sequential: the two reads are independent, so waterfalling
  // them would double the latency for nothing (CLAUDE.md §3).
  const [result, categories] = await Promise.all([
    listPosts({ page, limit: POSTS_PER_PAGE }),
    listCategories(),
  ]);

  return (
    <BlogIndexView
      result={result}
      categories={categories}
      basePath="/blog"
      eyebrow="Blog"
      heading={
        <>
          Notes on <span className="grad">onchain retention.</span>
        </>
      }
      intro="How wallet behaviour turns into messaging that works - product updates, engineering notes and what we learn running retention for onchain teams."
    />
  );
}
