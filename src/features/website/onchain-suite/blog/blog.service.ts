import config from "@payload-config";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";

import { toPost, toSummary } from "./blog.mappers";
import type { BlogCategory, BlogPost, BlogPostPage } from "./blog.types";
import { CATEGORIES_CACHE_TAG, POSTS_CACHE_TAG } from "@/payload/cache-tags";
import type { Post } from "@/payload-types";

/**
 * The blog's single data-access boundary (CLAUDE.md §3: one typed service per
 * domain, components consume typed data).
 *
 * Reads go through Payload's Local API rather than its REST API: because Payload
 * runs inside this same Next app, `getPayload()` talks straight to Postgres with
 * no HTTP hop, no serialisation round-trip and no second cold start. That is the
 * fastest read path available to a Server Component.
 *
 * Every cached read is tagged so the Payload afterChange hook in
 * src/payload/hooks/revalidate-post.ts can invalidate all of them at once.
 */

/** Posts per page on the index and category archives. */
export const POSTS_PER_PAGE = 12;

async function getClient() {
  return getPayload({ config });
}

/**
 * Published-only constraint, applied explicitly on every public read.
 *
 * This is not redundant with the collection's `access.read` rule: the Local API
 * defaults to `overrideAccess: true`, which bypasses access control entirely. So
 * the access rule protects REST/GraphQL, and this constraint protects the
 * server-rendered pages. Removing it would publish every draft.
 */
const publishedOnly = {
  _status: { equals: "published" },
} as const;

async function findPublishedPosts({
  page,
  limit,
  categorySlug,
}: {
  page: number;
  limit: number;
  categorySlug?: string;
}): Promise<BlogPostPage> {
  const payload = await getClient();

  const result = await payload.find({
    collection: "posts",
    // Pagination at the source (CLAUDE.md §4) — never fetch the whole dataset.
    page,
    limit,
    depth: 1,
    sort: "-publishedAt",
    where: categorySlug
      ? {
          and: [publishedOnly, { "categories.slug": { equals: categorySlug } }],
        }
      : publishedOnly,
  });

  return {
    posts: result.docs.map(toSummary),
    page: result.page ?? page,
    totalPages: result.totalPages,
    totalDocs: result.totalDocs,
    hasNextPage: result.hasNextPage,
    hasPrevPage: result.hasPrevPage,
  };
}

/** Paginated published posts, optionally filtered to one category. */
export const listPosts = unstable_cache(
  findPublishedPosts,
  ["blog", "posts", "list"],
  { tags: [POSTS_CACHE_TAG] }
);

/** One published post by slug. Returns null when missing or still a draft. */
export const getPostBySlug = unstable_cache(
  async (slug: string): Promise<BlogPost | null> => {
    const payload = await getClient();

    const result = await payload.find({
      collection: "posts",
      depth: 1,
      limit: 1,
      where: { and: [publishedOnly, { slug: { equals: slug } }] },
    });

    const doc = result.docs.at(0);
    return doc ? toPost(doc) : null;
  },
  ["blog", "posts", "detail"],
  { tags: [POSTS_CACHE_TAG] }
);

/** Slugs + timestamps for generateStaticParams, the sitemap and the RSS feed. */
export const listPublishedPostRefs = unstable_cache(
  async (): Promise<
    Array<{ slug: string; updatedAt: string; publishedAt: string | null }>
  > => {
    const payload = await getClient();

    const result = await payload.find({
      collection: "posts",
      depth: 0,
      // Bounded deliberately: generateStaticParams and the sitemap must not turn
      // into an unbounded scan as the blog grows. Older posts stay reachable and
      // render on demand; only their prerendering and sitemap entries are capped.
      limit: 1000,
      sort: "-publishedAt",
      where: publishedOnly,
      select: { slug: true, updatedAt: true, publishedAt: true },
    });

    return result.docs.map((doc) => ({
      slug: doc.slug ?? String(doc.id),
      updatedAt: doc.updatedAt,
      publishedAt: doc.publishedAt ?? null,
    }));
  },
  ["blog", "posts", "refs"],
  { tags: [POSTS_CACHE_TAG] }
);

/** All categories, for the index filter row. */
export const listCategories = unstable_cache(
  async (): Promise<BlogCategory[]> => {
    const payload = await getClient();

    const result = await payload.find({
      collection: "categories",
      depth: 0,
      limit: 100,
      sort: "title",
    });

    return result.docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      slug: doc.slug ?? null,
      description: doc.description ?? null,
    }));
  },
  ["blog", "categories", "list"],
  { tags: [CATEGORIES_CACHE_TAG] }
);

export const getCategoryBySlug = unstable_cache(
  async (slug: string): Promise<BlogCategory | null> => {
    const payload = await getClient();

    const result = await payload.find({
      collection: "categories",
      depth: 0,
      limit: 1,
      where: { slug: { equals: slug } },
    });

    const doc = result.docs.at(0);
    if (!doc) {
      return null;
    }

    return {
      id: doc.id,
      title: doc.title,
      slug: doc.slug ?? null,
      description: doc.description ?? null,
    };
  },
  ["blog", "categories", "detail"],
  { tags: [CATEGORIES_CACHE_TAG] }
);

/**
 * Draft-aware read for the preview route only.
 *
 * Returns the raw Payload document rather than a view model: live preview pushes
 * fresh documents to the browser over postMessage, so the client re-runs the same
 * mappers (blog.mappers.ts) on the same shape.
 *
 * Deliberately NOT cached and NOT filtered to published — preview must always
 * reflect the newest draft, and caching would leak unpublished content into the
 * shared cache.
 */
export async function getPreviewPostDocBySlug(
  slug: string
): Promise<Post | null> {
  const payload = await getClient();

  const result = await payload.find({
    collection: "posts",
    depth: 1,
    limit: 1,
    draft: true,
    where: { slug: { equals: slug } },
  });

  return result.docs.at(0) ?? null;
}
