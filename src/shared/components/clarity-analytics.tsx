"use client";

import Script from "next/script";

import { useConsent } from "@/shared/components/cookie-consent";

/**
 * Microsoft Clarity (session replay + heatmaps). Loads only when
 * NEXT_PUBLIC_CLARITY_PROJECT_ID is set AND the visitor accepted "Session
 * recordings" in the cookie banner: Clarity sets cookies, so under PECR it
 * must not load before consent. Withdrawing consent reloads the page (see
 * saveConsent), so a loaded Clarity never keeps running after a "no".
 */
export function ClarityAnalytics() {
  const consent = useConsent();
  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  if (!projectId || consent?.recordings !== true) return null;

  return (
    <Script id="ms-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "${projectId}");window.clarity("consent");`}
    </Script>
  );
}

export default ClarityAnalytics;
