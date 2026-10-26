import type { MetadataRoute } from "next";

import { SITE_CONFIG } from "@/features/website/onchain-suite/config/site";

// Same canonical host as the sitemap and canonical tags (was the Vercel domain).
const baseUrl = SITE_CONFIG.url;

/**
 * The authenticated app and account flows render at the ROOT of this same domain
 * (the (dashboard) route group adds no path segment), so Googlebot was crawling
 * them and getting 401s ("Blocked due to unauthorized request") and "Crawled —
 * currently not indexed". Disallow them explicitly — robots is the right tool
 * because a 401 means Google can't even see a noindex tag. None of these prefixes
 * collide with a marketing route (/platform, /pricing, /blog, /compare, /for, …).
 */
const DISALLOW = [
  "/api/",
  "/admin/",
  // authenticated app
  "/dashboard",
  "/audience",
  "/automations",
  "/campaigns",
  "/forms",
  "/inbox",
  "/intelligence",
  "/settings",
  "/new-dashboard",
  // account / auth / billing flows
  "/auth/",
  "/onboarding",
  "/verify-email",
  "/billing",
  "/payment",
  "/invite",
  "/invites",
  "/thank-you",
  // per-token hosted capture forms — thin, not for search
  "/f/",
];

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
