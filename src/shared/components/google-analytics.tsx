"use client";

import { GoogleAnalytics as NextGoogleAnalytics } from "@next/third-parties/google";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import {
  CONSENT_DEFAULTS_SCRIPT,
  useConsent,
} from "@/shared/components/cookie-consent";

/**
 * Consent Mode v2 defaults, inline in <head> so they run before gtag.js.
 * Analytics storage starts "denied" and becomes "granted" only if the visitor
 * accepted analytics in the cookie banner (read from the `ocs_consent` cookie,
 * so a returning visitor who accepted is counted from the first hit).
 */
export function GoogleConsentDefaults() {
  if (!process.env.NEXT_PUBLIC_GA_ID) return null;
  return (
    <script
      id="ga-consent-default"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULTS_SCRIPT }}
    />
  );
}

/**
 * Google Analytics 4. Loads only when NEXT_PUBLIC_GA_ID (the G- measurement id)
 * is set. Until analytics is accepted it runs in Consent Mode with storage
 * denied (no cookies, cookieless pings only); accepting pushes a consent
 * update, so the same page view starts counting. Never mounts on the hosted
 * capture form (`/f/*`), which collects PII under a strict CSP of its own.
 */
export function GoogleAnalytics() {
  const pathname = usePathname();
  const consent = useConsent();
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const granted = consent?.analytics === true;

  useEffect(() => {
    if (!gaId) return;
    const w = window as unknown as { gtag?: (...args: unknown[]) => void };
    w.gtag?.("consent", "update", {
      analytics_storage: granted ? "granted" : "denied",
    });
  }, [gaId, granted]);

  if (!gaId || pathname?.startsWith("/f/")) return null;
  return <NextGoogleAnalytics gaId={gaId} />;
}

export default GoogleAnalytics;
