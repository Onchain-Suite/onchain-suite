import type { MetadataRoute } from "next";

import { SITE_CONFIG } from "@/features/website/onchain-suite/config/site";

// Same canonical host as the sitemap and canonical tags (was the Vercel domain).
const baseUrl = SITE_CONFIG.url;

/**
 * Only the API and admin are blocked. The authenticated app and account flows
 * (/dashboard, /automations, /auth/…, /f/…) are deliberately NOT disallowed: they
 * send an `X-Robots-Tag: noindex, nofollow` header (next.config.ts headers()), and
 * Google can only read that header on a page it is allowed to crawl. Blocking them
 * here as well kept them listed in Search Console instead of dropping them.
 */
const DISALLOW = ["/api/", "/admin/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
