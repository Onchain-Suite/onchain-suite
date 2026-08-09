/**
 * Shared Next.js cache tags for CMS content.
 *
 * Kept in a dependency-free module because both sides of the cache contract
 * import it: the read path (`blog.service.ts`, wrapping Local API queries in
 * `unstable_cache`) and the write path (Payload collection hooks calling
 * `revalidateTag`). A typo in one half would silently stop invalidation, so
 * there is exactly one definition.
 */

/** Covers every cached read of blog posts: index, detail, category, sitemap, RSS. */
export const POSTS_CACHE_TAG = "posts";

/** Covers cached reads of the category list. */
export const CATEGORIES_CACHE_TAG = "categories";
