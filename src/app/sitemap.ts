import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/onchain-suite-website/blog/blog.seo";
import { listPublishedPostRefs } from "@/onchain-suite-website/blog/blog.service";

/**
 * Async so blog posts come from the CMS. Reads through the same tagged, cached
 * service as the blog routes, so publishing a post refreshes this too.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/security`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/early-access`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/legal`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: "https://docs.onchainsuite.com",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // A missing DATABASE_URI (or an unreachable database) must not fail the whole
  // sitemap - the static marketing routes still deserve to be indexed.
  let postRoutes: MetadataRoute.Sitemap = [];

  try {
    const posts = await listPublishedPostRefs();

    postRoutes = posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch (error) {
    console.error("sitemap: failed to load blog posts", error);
  }

  return [...staticRoutes, ...postRoutes];
}
