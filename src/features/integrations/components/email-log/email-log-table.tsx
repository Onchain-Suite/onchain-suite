"use client";

import { memo } from "react";

import { formatDateTime, formatRelativeTime } from "@/lib/date";

import type { EmailSummary } from "../../contracts/emails";
import { emailStatusBadge } from "../../utils/email-log";
import { ToneBadge } from "../developer/tone-badge";

/* Status, subject, from, recipients, environment, time. */
const COLUMNS =
  "[grid-template-columns:128px_minmax(160px,2fr)_minmax(140px,1.3fr)_88px_64px_150px]";
const HEAD = `sticky top-0 z-[1] grid ${COLUMNS} items-center gap-3.5 border-b border-(--border-subtle) bg-(--bg-shell) px-4 py-2.5 text-[11px] font-semibold tracking-[0.3px] text-(--text-tertiary) uppercase`;
const ROW = `grid w-full ${COLUMNS} items-center gap-3.5 border-b border-(--border-subtle) px-4 py-3 text-left text-[13px] text-(--text-secondary) transition-colors hover:bg-(--tint-hover) focus-visible:bg-(--tint-hover) focus-visible:outline-none`;

/** A scheduled email shows when it goes; anything else when it was made. */
function When({ email }: { email: EmailSummary }) {
  if (email.status === "scheduled" && email.scheduled_at) {
    return (
      <span className="flex flex-col leading-tight">
        <span className="text-[11px] text-(--text-tertiary)">Sends</span>
        <span className="text-(--text-primary)">
          {formatDateTime(email.scheduled_at)}
        </span>
      </span>
    );
  }
  return (
    <span title={formatDateTime(email.created_at)}>
      {formatRelativeTime(email.created_at)}
    </span>
  );
}

const EmailRow = memo(function EmailRow({
  email,
  onOpen,
}: {
  email: EmailSummary;
  onOpen: (id: string) => void;
}) {
  const status = emailStatusBadge(email.status);
  const n = email.recipient_count;
  return (
    <button type="button" className={ROW} onClick={() => onOpen(email.id)}>
      <span>
        <ToneBadge tone={status.tone} dot>
          {status.label}
        </ToneBadge>
      </span>
      <span className="truncate font-medium text-(--text-primary)">
        {email.subject || "(no subject)"}
      </span>
      <span className="truncate">{email.from}</span>
      <span className="tabular-nums">
        {n} {n === 1 ? "recipient" : "recipients"}
      </span>
      <span>
        <ToneBadge tone={email.environment === "live" ? "info" : "neutral"}>
          {email.environment === "live" ? "Live" : "Test"}
        </ToneBadge>
      </span>
      <When email={email} />
    </button>
  );
});

/**
 * The log as a table that scrolls inside its own box from md up, header
 * held. Narrower, it scrolls sideways rather than squeezing six columns.
 * Each row opens the email.
 */
export function EmailLogTable({
  emails,
  onOpen,
  footer,
}: {
  emails: EmailSummary[];
  onOpen: (id: string) => void;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-x-auto rounded-xl border border-(--border-subtle) bg-card md:overflow-y-auto">
      <div className="min-w-[760px]">
        <div className={HEAD}>
          <span>Status</span>
          <span>Subject</span>
          <span>From</span>
          <span>To</span>
          <span>Env</span>
          <span>When</span>
        </div>
        <ul className="[&>li:last-child>button]:border-0">
          {emails.map((e) => (
            <li key={e.id}>
              <EmailRow email={e} onOpen={onOpen} />
            </li>
          ))}
        </ul>
        {footer}
      </div>
    </div>
  );
}
