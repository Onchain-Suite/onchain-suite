"use client";

import { GoogleAnalytics as NextGoogleAnalytics } from "@next/third-parties/google";
import { usePathname } from "next/navigation";

/**
 * Consent Mode v2 defaults, pushed before gtag.js loads (root layout,
 * inline in <head>). With everything denied, GA4 sets no cookies and sends
 * only cookieless pings. The site has no cookie-consent banner yet, and the
 * cookie policy (/cookies) says no analytics cookies are set without consent,
 * so storage stays denied until a banner calls:
 *
 *   gtag("consent", "update", { analytics_storage: "granted" });
 */
const CONSENT_DEFAULTS = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("consent","default",{ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied",analytics_storage:"denied"});`;

export function GoogleConsentDefaults() {
  if (!process.env.NEXT_PUBLIC_GA_ID) return null;
  // A plain inline script in <head>, so it runs before gtag.js is fetched.
  return (
    <script
      id="ga-consent-default"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULTS }}
    />
  );
}

/**
 * Google Analytics 4. Loads only when NEXT_PUBLIC_GA_ID (the G- measurement id)
 * is set, so local/dev and any environment without it send nothing. Like
 * Databuddy, never mounts on the public hosted capture form (`/f/*`), which
 * collects PII under a strict CSP of its own.
 */
export function GoogleAnalytics() {
  const pathname = usePathname();
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (!gaId || pathname?.startsWith("/f/")) return null;
  return <NextGoogleAnalytics gaId={gaId} />;
}

export default GoogleAnalytics;
