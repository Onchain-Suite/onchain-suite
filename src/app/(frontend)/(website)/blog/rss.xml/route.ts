import { getSiteUrl } from "@/onchain-suite-website/blog/blog.seo";
import {
  listPosts,
  POSTS_PER_PAGE,
} from "@/onchain-suite-website/blog/blog.service";
import { SITE_CONFIG } from "@/onchain-suite-website/config/site";

/**
 * RSS 2.0 feed. Hand-built rather than pulling in a feed library - the format is
 * a dozen lines of XML and CLAUDE.md §7 asks for a dependency check first.
 */

/** XML-escape. Unescaped titles containing & or < produce an invalid feed. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const siteUrl = getSiteUrl();

  // Feed readers only ever show recent items; one page is the right bound.
  // Wrapped because this route is evaluated during `next build`, which must not
  // fail when no database is configured - an empty channel is a valid feed.
  let posts: Awaited<ReturnType<typeof listPosts>>["posts"] = [];

  try {
    ({ posts } = await listPosts({ page: 1, limit: POSTS_PER_PAGE }));
  } catch (error) {
    console.error("blog: could not build RSS feed", error);
  }

  const items = posts
    .map((post) => {
      const url = `${siteUrl}/blog/${post.slug}`;
      const pubDate = post.publishedAt
        ? new Date(post.publishedAt).toUTCString()
        : undefined;

      return [
        "    <item>",
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `      <description>${escapeXml(post.excerpt)}</description>`,
        pubDate ? `      <pubDate>${pubDate}</pubDate>` : "",
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_CONFIG.name)} Blog</title>
    <link>${escapeXml(`${siteUrl}/blog`)}</link>
    <description>${escapeXml(SITE_CONFIG.description)}</description>
    <language>en</language>
    <atom:link href="${escapeXml(`${siteUrl}/blog/rss.xml`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
