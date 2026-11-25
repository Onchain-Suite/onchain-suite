import type { MetadataRoute } from "next";

import { TOOL_SLUGS } from "./(website)/tools/[slug]/page";
import {
  listCategories,
  listPublishedPostRefs,
} from "@/onchain-suite-website/blog/blog.service";
import { COMPARE_META } from "@/onchain-suite-website/components/site/compare-meta";
import { SITE_CONFIG } from "@/onchain-suite-website/config/site";

// Same canonical host the pages' <link rel="canonical"> uses, so the sitemap, the
// canonical and the served page all agree on ONE host. The old base pointed at
// the Vercel domain (onchain-suite.vercel.app), which 308-redirects to www — that
// is what produced Search Console's "Page with redirect" and "Alternate page with
// proper canonical" on every entry, plus a 404 for a /products page that no longer
// exists.
const baseUrl = SITE_CONFIG.url;

/**
 * When each page's content last changed (YYYY-MM-DD). Edit by hand when you
 * change what a page says; a deploy alone is not a change. Sending the deploy
 * time for every page teaches Google to ignore lastModified. Seeded on
 * 2026-11-25 from git history of each page's component. Compare pages use
 * `updated` in compare-meta.ts instead; blog entries use Payload's updatedAt.
 */
const LAST_MODIFIED: Record<string, string> = {
  "/": "2026-11-22",
  "/pricing": "2026-11-15",
  "/platform/audience": "2026-11-05",
  "/platform/segments": "2026-11-05",
  "/platform/loops": "2026-11-05",
  "/platform/data": "2026-11-22",
  "/platform/intelligence-mcp": "2026-11-05",
  "/compare": "2026-11-04",
  "/for/blockchain-companies": "2026-11-05",
  "/for/mainstream-companies": "2026-11-04",
  "/tools": "2026-11-22",
  "/tools/cost-per-acquisition": "2026-11-04",
  "/security": "2026-08-24",
  "/team": "2026-11-05",
  "/about": "2026-11-25",
  "/hypothesis": "2026-11-04",
  "/refer": "2026-11-22",
  "/legal": "2026-11-04",
  "/privacy": "2026-11-04",
  "/terms": "2026-11-04",
  "/cookies": "2026-11-04",
  "/dpa": "2026-11-05",
  "/data-transfers": "2026-11-04",
  "/subprocessors": "2026-11-04",
};
/** Free-tool calculators under /tools/[slug] share one date until they diverge. */
const TOOLS_LAST_MODIFIED = "2026-11-22";

type Freq = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

/**
 * Static, indexable marketing pages (section indexes included). Authenticated app
 * routes (/campaigns, /audience, /settings, …) and noindex pages
 * (/retention-playbook) are excluded here and the app routes are also disallowed
 * in robots.ts. Per-item detail pages (blog posts, compare, tools) are appended
 * dynamically in the default export below.
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
    { path: "/security", priority: 0.6, changeFrequency: "monthly" },
    { path: "/team", priority: 0.5, changeFrequency: "monthly" },
    { path: "/about", priority: 0.5, changeFrequency: "monthly" },
    { path: "/hypothesis", priority: 0.5, changeFrequency: "monthly" },
    { path: "/refer", priority: 0.4, changeFrequency: "monthly" },
    { path: "/legal", priority: 0.2, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
    { path: "/cookies", priority: 0.2, changeFrequency: "yearly" },
    { path: "/dpa", priority: 0.2, changeFrequency: "yearly" },
    { path: "/data-transfers", priority: 0.2, changeFrequency: "yearly" },
    { path: "/subprocessors", priority: 0.2, changeFrequency: "yearly" },
  ];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = PAGES.map((p) => ({
    url: p.path === "/" ? baseUrl : `${baseUrl}${p.path}`,
    // /blog has no entry: it changes with each post, so it keeps "now".
    lastModified: LAST_MODIFIED[p.path] ? new Date(LAST_MODIFIED[p.path]) : now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  // Compare + tools detail pages come from static data (COMPARE_META / TOOL_SLUGS),
  // so they are always available — no DB, no try/catch needed.
  const compareEntries: MetadataRoute.Sitemap = COMPARE_META.map((c) => ({
    url: `${baseUrl}/compare/${c.slug}`,
    lastModified: new Date(c.updated),
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  const toolEntries: MetadataRoute.Sitemap = TOOL_SLUGS.map((slug) => ({
    url: `${baseUrl}/tools/${slug}`,
    lastModified: new Date(TOOLS_LAST_MODIFIED),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  // Blog posts + categories come from Payload. This file is evaluated during
  // `next build`, which must not fail when no database is configured, so the DB
  // reads are wrapped and fall back to no dynamic blog entries (same guard the
  // RSS route uses).
  let postEntries: MetadataRoute.Sitemap = [];
  let categoryEntries: MetadataRoute.Sitemap = [];
  try {
    const posts = await listPublishedPostRefs();
    postEntries = posts.map((p) => ({
      url: `${baseUrl}/blog/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
      changeFrequency: "monthly",
      priority: 0.6,
    }));
    const categories = await listCategories();
    categoryEntries = categories.map((c) => ({
      url: `${baseUrl}/blog/category/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.4,
    }));
  } catch (error) {
    console.error("sitemap: could not load blog entries", error);
  }

  return [
    ...staticEntries,
    ...compareEntries,
    ...toolEntries,
    ...postEntries,
    ...categoryEntries,
    {
      url: "https://docs.onchainsuite.com",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
