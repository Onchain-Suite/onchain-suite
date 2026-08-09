import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/onchain-suite-website/blog/blog.seo";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          // Payload admin panel and its REST/GraphQL API (routes.api in
          // payload.config.ts).
          "/admin/",
          "/cms-api/",
          // Draft previews of unpublished posts.
          "/blog/preview/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
