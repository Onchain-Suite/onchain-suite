import { toIsoDate } from "./blog.format";
import type { BlogPost } from "./blog.types";
import { SITE_CONFIG } from "@/onchain-suite-website/config/site";

/**
 * Canonical site origin, resolved in one place.
 *
 * Previously sitemap.ts and robots.ts hardcoded "onchain-suite.vercel.app" while
 * SITE_CONFIG.url said "onchainsuite.com" - two different canonical hosts, which
 * is actively harmful for SEO once per-post canonical URLs exist.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SERVER_URL;

  if (configured && configured.trim().length > 0) {
    return configured.replace(/\/$/, "");
  }

  return SITE_CONFIG.url.replace(/\/$/, "");
}

export function getPostUrl(slug: string): string {
  return `${getSiteUrl()}/blog/${slug}`;
}

/**
 * schema.org BlogPosting for a single post.
 *
 * The site already emits Organization/WebSite/SoftwareApplication JSON-LD from
 * the root layout (components/meta/structured-data.tsx); this is per-post and
 * additive, so search engines can surface the article itself.
 */
export function buildBlogPostingJsonLd(post: BlogPost) {
  const url = getPostUrl(post.slug);

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.meta.title ?? post.title,
    description: post.meta.description ?? post.excerpt,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: toIsoDate(post.publishedAt),
    dateModified: toIsoDate(post.updatedAt) ?? toIsoDate(post.publishedAt),
    image: post.meta.image?.url ?? post.coverImage?.url ?? SITE_CONFIG.ogImage,
    keywords: post.tags.length > 0 ? post.tags.join(", ") : undefined,
    articleSection:
      post.categories.length > 0
        ? post.categories.map((category) => category.title).join(", ")
        : undefined,
    author:
      post.authors.length > 0
        ? post.authors.map((author) => ({
            "@type": "Person",
            name: author.name,
          }))
        : [{ "@type": "Organization", name: SITE_CONFIG.name }],
    publisher: {
      "@type": "Organization",
      name: SITE_CONFIG.name,
      logo: { "@type": "ImageObject", url: SITE_CONFIG.logo },
    },
  };
}
