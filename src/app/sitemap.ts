import type { MetadataRoute } from "next";

import { SITE_CONFIG } from "@/features/website/onchain-suite/config/site";

// Same canonical host the pages' <link rel="canonical"> uses, so the sitemap, the
// canonical and the served page all agree on ONE host. The old base pointed at
// the Vercel domain (onchain-suite.vercel.app), which 308-redirects to www — that
// is what produced Search Console's "Page with redirect" and "Alternate page with
// proper canonical" on every entry, plus a 404 for a /products page that no longer
// exists.
const baseUrl = SITE_CONFIG.url;

type Freq = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

/**
 * Static, indexable marketing pages. Authenticated app routes (/campaigns,
 * /audience, /settings, …) and noindex pages (/retention-playbook) are excluded
 * here and the app routes are also disallowed in robots.ts. Dynamic blog /
 * compare / tools detail pages are not enumerated yet — add them by fetching
 * their lists (see the RSS route for the blog data source).
 */
const PAGES: Array<{ path: string; priority: number; changeFrequency: Freq }> =
  [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
    { path: "/platform/audience", priority: 0.8, changeFrequency: "weekly" },
    { path: "/platform/segments", priority: 0.8, changeFrequency: "weekly" },
    { path: "/platform/loops", priority: 0.8, changeFrequency: "weekly" },
    { path: "/platform/data", priority: 0.8, changeFrequency: "weekly" },
    {
      path: "/platform/intelligence-mcp",
      priority: 0.8,
      changeFrequency: "weekly",
    },
    { path: "/compare", priority: 0.7, changeFrequency: "weekly" },
    { path: "/blog", priority: 0.7, changeFrequency: "daily" },
    {
      path: "/for/blockchain-companies",
      priority: 0.7,
      changeFrequency: "weekly",
    },
    {
      path: "/for/mainstream-companies",
      priority: 0.7,
      changeFrequency: "weekly",
    },
    { path: "/tools", priority: 0.6, changeFrequency: "weekly" },
    {
      path: "/tools/cost-per-acquisition",
      priority: 0.6,
      changeFrequency: "monthly",
    },
    { path: "/retention-proposal", priority: 0.5, changeFrequency: "monthly" },
    { path: "/security", priority: 0.6, changeFrequency: "monthly" },
    { path: "/team", priority: 0.5, changeFrequency: "monthly" },
    { path: "/hypothesis", priority: 0.5, changeFrequency: "monthly" },
    { path: "/early-access", priority: 0.5, changeFrequency: "weekly" },
    { path: "/refer", priority: 0.4, changeFrequency: "monthly" },
    { path: "/legal", priority: 0.2, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
    { path: "/cookies", priority: 0.2, changeFrequency: "yearly" },
    { path: "/dpa", priority: 0.2, changeFrequency: "yearly" },
    { path: "/data-transfers", priority: 0.2, changeFrequency: "yearly" },
    { path: "/subprocessors", priority: 0.2, changeFrequency: "yearly" },
  ];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const pages: MetadataRoute.Sitemap = PAGES.map((p) => ({
    url: p.path === "/" ? baseUrl : `${baseUrl}${p.path}`,
    lastModified,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  return [
    ...pages,
    {
      url: "https://docs.onchainsuite.com",
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
