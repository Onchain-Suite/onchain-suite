"use client";

import { Cancel01Icon, Clock01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useSendingApproval } from "../../hooks/use-sending-approval";
import {
  approvalApplies,
  SENDING_APPROVAL_HREF,
} from "../../utils/sending-approval";
import { Icon } from "@/shared/components/common/hugeicon";

const DISMISS_KEY = "onchain.sending-approval-banner.dismissed";

const readDismissed = (): string | null => {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
};

/**
 * App-wide strip while the workspace waits for sending approval. Dismissing
 * hides it for this browser session only, so the limit is never forgotten
 * for good. The settings page keeps the full status either way.
 */
export function SendingApprovalAppBanner() {
  const query = useSendingApproval();
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => setDismissed(readDismissed() === "1"), []);

  const a = query.data;
  if (!a || !approvalApplies(a) || a.status !== "pending_review" || dismissed)
    return null;

  const cap =
    a.limits.dailyMarketingCap ?? a.limits.pendingDailyMarketingCap ?? 500;

  return (
    <div
      role="status"
      className="flex items-center gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-800 dark:text-amber-300"
    >
      <Icon icon={Clock01Icon} className="size-4 shrink-0" />
      <p className="min-w-0 flex-1">
        You can send up to {cap.toLocaleString()} marketing emails a day until
        we approve your account.{" "}
        <Link href={SENDING_APPROVAL_HREF} className="font-medium underline">
          Complete your sending profile
        </Link>
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        className="shrink-0 rounded p-1 hover:bg-amber-500/20"
        onClick={() => {
          try {
            window.sessionStorage.setItem(DISMISS_KEY, "1");
          } catch {
            // Private mode: dismiss for this render only.
          }
          setDismissed(true);
        }}
      >
        <Icon icon={Cancel01Icon} className="size-4" />
      </button>
    </div>
  );
}
