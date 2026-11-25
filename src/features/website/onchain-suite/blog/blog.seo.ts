import { toIsoDate } from "./blog.format";
import type { BlogPost } from "./blog.types";
import { SITE_CONFIG } from "@/onchain-suite-website/config/site";

/**
 * Canonical site origin for SEO (canonical tags, JSON-LD, RSS links).
 *
 * Always SITE_CONFIG.url (https://www.onchainsuite.com), the host the site is
 * served on. It used to read NEXT_PUBLIC_SERVER_URL first, which Vercel sets to
 * the apex https://onchainsuite.com (Payload may rely on that), so blog
 * canonicals pointed at a host that 308-redirects to www.
 */
export function getSiteUrl(): string {
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
