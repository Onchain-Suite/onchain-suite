import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { toIsoDate } from "@/onchain-suite-website/blog/blog.format";
import {
  buildBlogPostingJsonLd,
  getPostUrl,
} from "@/onchain-suite-website/blog/blog.seo";
import {
  getPostBySlug,
  listPublishedPostRefs,
} from "@/onchain-suite-website/blog/blog.service";
import { BlogPostView } from "@/onchain-suite-website/blog/components/blog-post-view";
import { SITE_CONFIG } from "@/onchain-suite-website/config/site";

type Props = {
  params: Promise<{ slug: string }>;
};

/**
 * Prerenders every published post at build time. Combined with the
 * revalidateTag/revalidatePath hook in src/payload/hooks/revalidate-post.ts,
 * posts are served as static HTML yet update within about a second of a publish.
 */
export async function generateStaticParams() {
  try {
    const refs = await listPublishedPostRefs();
    return refs.map((ref) => ({ slug: ref.slug }));
  } catch (error) {
    // An unreachable database must not fail the whole build. Returning no params
    // just means nothing is prerendered; posts still render on demand, because
    // `dynamicParams` defaults to true. This keeps CI (and frontend-only preview
    // deploys) buildable without DATABASE_URI.
    console.error("blog: could not prerender post params", error);
    return [];
  }
}

/**
 * NOTE: this is Next's route-level generateMetadata API. It is unrelated to the
 * plain helper of the same name exported from
 * @/onchain-suite-website/config/metadata, which must not be imported here.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return { title: "Post not found" };
  }

  const title = post.meta.title ?? post.title;
  const description = post.meta.description ?? post.excerpt;
  const image =
    post.meta.image?.url ?? post.coverImage?.url ?? SITE_CONFIG.ogImage;
  const url = getPostUrl(post.slug);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      images: [{ url: image }],
      publishedTime: toIsoDate(post.publishedAt),
      modifiedTime: toIsoDate(post.updatedAt),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <>
      <script
        type="application/ld+json"
        // Per-post BlogPosting, additive to the site-wide graph in the root layout.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildBlogPostingJsonLd(post)),
        }}
      />
      <BlogPostView post={post} />
    </>
  );
}
