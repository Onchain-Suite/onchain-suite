"use client";

import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

import {
  type EmailSaveBlock,
  saveBlockReason,
} from "../utils/email-save-block";
import { presendCopy } from "../utils/presend-copy";

/**
 * Persistent notice that the email editor's last save was refused, so what
 * the user sees in the editor is NOT what would be sent. Stays until the
 * editor reports the block cleared. Renders nothing without a block.
 */
export function EmailSaveBlockedBanner({
  block,
  className,
}: {
  block: EmailSaveBlock | null;
  className?: string;
}) {
  if (!block) return null;
  return (
    <div
      role="alert"
      data-testid="email-save-blocked-banner"
      className={`flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm ${className ?? ""}`}
    >
      <ExclamationTriangleIcon
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-destructive"
      />
      <div className="min-w-0 space-y-2">
        <p className="font-medium text-foreground">
          This email isn&apos;t saved: {saveBlockReason(block)}
        </p>
        {block.checks.length > 0 ? (
          <ul className="space-y-1.5">
            {block.checks.map((check) => (
              <li key={check.code} className="text-muted-foreground">
                <span className="font-medium text-foreground">
                  {presendCopy(check.code).title}.
                </span>{" "}
                {check.message}
                {check.fix ? (
                  <span className="block text-foreground">
                    <span className="font-medium">Fix: </span>
                    {check.fix}
                  </span>
                ) : null}
                {check.links && check.links.length > 0 ? (
                  <span className="block break-all font-mono text-xs">
                    {check.links.join(", ")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
