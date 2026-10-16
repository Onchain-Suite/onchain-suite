"use client";

import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

import type { InAppReadiness } from "../../utils/inapp-readiness";

/** Deep-link to Settings -> Integrations, where in-app keys/origins and mobile
 *  push credentials are set up. */
const SETUP_HREF = "/settings?tab=integrations";

interface InAppReadinessNoticeProps {
  readiness: InAppReadiness;
  /** True when the chosen placement is the mobile OS notification. */
  isMobile: boolean;
  isLoading?: boolean;
}

/**
 * Tells the sender whether the workspace can actually deliver the chosen in-app
 * placement, and links them to set it up before they send. Web placements need
 * the SDK key + an allow-listed origin; the mobile placement needs a verified
 * APNs (iOS) or FCM (Android) credential. An "unknown" channel (e.g. a non-admin
 * who can't read the setup) shows a soft hint, never a hard warning.
 */
export function InAppReadinessNotice({
  readiness,
  isMobile,
  isLoading,
}: InAppReadinessNoticeProps) {
  if (isLoading) return null;

  const channel = isMobile ? readiness.mobile : readiness.web;

  const setupLink = (label: string) => (
    <Link
      href={SETUP_HREF}
      className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
    >
      {label}
      <ArrowTopRightOnSquareIcon aria-hidden="true" className="h-3.5 w-3.5" />
    </Link>
  );

  if (channel.state === "ready") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
        <CheckCircleIcon aria-hidden="true" className="h-5 w-5 shrink-0" />
        <span>
          {isMobile
            ? "Mobile push is set up - this campaign can be delivered."
            : "In-app push is set up - this campaign can be delivered."}
        </span>
      </div>
    );
  }

  if (channel.state === "not-ready") {
    const missing = isMobile
      ? "Add a mobile push credential - APNs for iOS, FCM for Android"
      : [
          !readiness.web.hasKey && "install the web SDK key",
          !readiness.web.hasOrigin && "allow-list your dApp origin",
        ]
          .filter(Boolean)
          .join(" and ");

    return (
      <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
        <ExclamationTriangleIcon
          aria-hidden="true"
          className="h-5 w-5 shrink-0"
        />
        <div className="space-y-1">
          <p className="font-medium">
            {isMobile
              ? "Mobile push isn't set up yet"
              : "In-app push isn't set up yet"}
          </p>
          <p>
            {isMobile
              ? "Before you can send an OS notification, add a verified push credential. "
              : `Before you can send, ${missing}. `}
            {setupLink("Set it up in Settings")}
          </p>
        </div>
      </div>
    );
  }

  // Unknown: we couldn't read the setup (often a non-admin sender). Soft hint.
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
      <ExclamationTriangleIcon
        aria-hidden="true"
        className="h-5 w-5 shrink-0"
      />
      <p>
        {isMobile
          ? "Mobile push needs APNs (iOS) or FCM (Android) credentials. "
          : "In-app push needs the web SDK key and an allow-listed origin. "}
        Ask a workspace owner to {setupLink("check the setup")} if this campaign
        doesn&apos;t deliver.
      </p>
    </div>
  );
}
