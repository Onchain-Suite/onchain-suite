"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

/**
 * Landing page the backend OAuth flow redirects the popup back to. It relays
 * the linked channel + handle to the opener window via postMessage, then
 * closes itself. Rendered with no chrome - the user only sees it for a blink.
 */
function CallbackInner() {
  const params = useSearchParams();

  useEffect(() => {
    const channel = params?.get("channel") ?? params?.get("provider") ?? "";
    const handle = params?.get("handle") ?? params?.get("username") ?? "";
    const status = params?.get("status") ?? "ok";
    if (window.opener && channel && status !== "error") {
      window.opener.postMessage(
        { type: "onchain-form-link", channel, handle },
        window.location.origin
      );
    }
    const t = setTimeout(() => window.close(), 400);
    return () => clearTimeout(t);
  }, [params]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0e0f12] text-sm text-white/60">
      Finishing up… you can close this window.
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  );
}
