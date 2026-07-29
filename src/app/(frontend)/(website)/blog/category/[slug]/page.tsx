import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getSiteUrl } from "@/onchain-suite-website/blog/blog.seo";
import {
  getCategoryBySlug,
  listCategories,
  listPosts,
  POSTS_PER_PAGE,
} from "@/onchain-suite-website/blog/blog.service";
import { BlogIndexView } from "@/onchain-suite-website/blog/components/blog-index-view";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateStaticParams() {
  try {
    const categories = await listCategories();

    return categories
      .filter((category): category is typeof category & { slug: string } =>
        Boolean(category.slug)
      )
      .map((category) => ({ slug: category.slug }));
  } catch (error) {
    // See the same guard on blog/[slug]: a missing database degrades to
    // on-demand rendering rather than a failed build.
    console.error("blog: could not prerender category params", error);
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    return { title: "Category not found" };
  }

  return {
    title: `${category.title} · Blog`,
    description:
      category.description ??
      `OnchainSuite blog posts filed under ${category.title}.`,
    alternates: { canonical: `${getSiteUrl()}/blog/category/${slug}` },
  };
}

export default async function BlogCategoryPage({
  params,
  searchParams,
}: Props) {
  const [{ slug }, { page: pageParam }] = await Promise.all([
    params,
    searchParams,
  ]);

  const parsed = Number(pageParam);
  const page = Number.isInteger(parsed) && parsed > 0 ? parsed : 1;

  const [category, result, categories] = await Promise.all([
    getCategoryBySlug(slug),
    listPosts({ page, limit: POSTS_PER_PAGE, categorySlug: slug }),
    listCategories(),
  ]);

  if (!category) {
    notFound();
  }

  return (
    <BlogIndexView
      result={result}
      categories={categories}
      activeCategorySlug={slug}
      basePath={`/blog/category/${slug}`}
      eyebrow="Blog"
      heading={
        <>
          <span className="grad">{category.title}</span>
        </>
      }
      intro={
        category.description ??
        `Everything we have published under ${category.title}.`
      }
    />
  );
}
