"use client";

import type { ReactNode } from "react";

/**
 * Explains why the wrapped (disabled) action is unavailable. A disabled button
 * gets no pointer events, so the hover target is this wrapper, not the button.
 * Without a reason it renders the child untouched.
 */
export function SaveBlockedReason({
  reason,
  children,
}: {
  reason: string | null | undefined;
  children: ReactNode;
}) {
  if (!reason) return <>{children}</>;
  return (
    <span
      className="inline-flex cursor-not-allowed"
      title={reason}
      data-save-blocked-reason={reason}
    >
      {children}
    </span>
  );
}
