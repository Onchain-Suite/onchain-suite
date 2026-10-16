"use client";

import Script from "next/script";

/**
 * Microsoft Clarity (session replay + heatmaps). Loads only when
 * NEXT_PUBLIC_CLARITY_PROJECT_ID is set, so local/dev and any environment
 * without the id render nothing. Set the id in the Vercel project env to turn
 * it on. Uses `afterInteractive` so it never blocks first paint.
 */
export function ClarityAnalytics() {
  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  if (!projectId) return null;

  return (
    <Script id="ms-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "${projectId}");`}
    </Script>
  );
}

export default ClarityAnalytics;
