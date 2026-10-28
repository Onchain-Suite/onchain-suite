"use client";

import { Databuddy } from "@databuddy/sdk/react";
import { usePathname } from "next/navigation";

/**
 * Databuddy analytics + session replay. Loads only when
 * NEXT_PUBLIC_DATABUDDY_CLIENT_ID is set, so local/dev and any environment
 * without the id record nothing (dev sessions never reach the prod project).
 * Set the id in the Vercel project env to turn it on.
 *
 * Session replay masks page text and ALWAYS masks typed input before anything
 * leaves the browser (Databuddy default - we never unmask). Elements that show
 * personal data (account details, payment forms) carry `data-replay-block` so
 * they are left out of recordings entirely.
 *
 * Never mounts on the public hosted capture form (`/f/*`): that page collects
 * PII and ships a strict, exfiltration-proof CSP of its own, so it must not load
 * a third-party recorder.
 */
export function DatabuddyAnalytics() {
  const pathname = usePathname();
  const clientId = process.env.NEXT_PUBLIC_DATABUDDY_CLIENT_ID;
  if (!clientId || pathname?.startsWith("/f/")) return null;

  return (
    <Databuddy clientId={clientId} replay trackOutgoingLinks trackWebVitals />
  );
}

export default DatabuddyAnalytics;
