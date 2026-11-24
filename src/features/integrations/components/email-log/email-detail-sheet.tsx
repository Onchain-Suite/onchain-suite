"use client";

import { useMemo, useState } from "react";

import { CopyButton } from "@/components/common/copy-button";
import { Skeleton } from "@/components/ui/skeleton";

import { formatDateTime } from "@/lib/date";

import type { EmailDetail, EmailRecipient } from "../../contracts/emails";
import { toEmailFailure } from "../../emails.service";
import { useEmailActions, useEmailDetail } from "../../hooks/use-email-log";
import {
  emailErrorCopy,
  emailStatusBadge,
  eventLabel,
  isActionable,
  recipientStatusBadge,
} from "../../utils/email-log";
import { ToneBadge } from "../developer/tone-badge";
import { CancelEmailDialog } from "./cancel-email-dialog";
import { RescheduleEmailDialog } from "./reschedule-email-dialog";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";

const SECTION =
  "text-[11px] font-semibold tracking-[0.3px] text-(--text-tertiary) uppercase";
const KIND: Record<EmailRecipient["kind"], string> = {
  to: "To",
  cc: "Cc",
  bcc: "Bcc",
};

/** Close the dialog when the answer means the action no longer applies. */
const closesDialog = (err: unknown): boolean => {
  const f = toEmailFailure(err);
  return f?.code === "EMAIL_NOT_SCHEDULED" || f?.status === 404;
};

function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11.5px] text-(--text-tertiary)">{label}</dt>
      <dd className="text-[13px] break-all text-(--text-primary)">
        {children}
      </dd>
    </div>
  );
}

function Recipients({ recipients }: { recipients: EmailRecipient[] }) {
  if (recipients.length === 0) {
    return <p className="text-[13px] text-(--text-tertiary)">No recipients.</p>;
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {recipients.map((r) => {
        const s = recipientStatusBadge(r.status);
        return (
          <li
            key={r.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-(--border-subtle) bg-card px-3 py-2"
          >
            <span className="w-8 shrink-0 text-[11.5px] text-(--text-tertiary)">
              {KIND[r.kind]}
            </span>
            {/* A wallet recipient's address IS the wallet; the email it resolved to never reaches us. */}
            <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-(--text-primary)">
              {r.address}
            </code>
            {r.type === "wallet" ? (
              <ToneBadge tone="neutral">Wallet</ToneBadge>
            ) : null}
            <ToneBadge tone={s.tone} dot>
              {s.label}
            </ToneBadge>
          </li>
        );
      })}
    </ul>
  );
}

function Timeline({ email }: { email: EmailDetail }) {
  const byId = useMemo(
    () => new Map(email.recipients.map((r) => [r.id, r.address])),
    [email.recipients]
  );
  if (email.events.length === 0) {
    return (
      <p className="text-[13px] text-(--text-tertiary)">
        {email.status === "scheduled"
          ? "Nothing yet: events start when it is released for sending."
          : email.status === "canceled"
            ? "Canceled before sending. Nothing was sent."
            : "No events yet. They arrive as the provider reports them."}
      </p>
    );
  }
  return (
    <ol className="flex flex-col">
      {/* One event per recipient per type, so the pair is a stable key. */}
      {email.events.map((ev) => (
        <li
          key={`${ev.recipient_id}-${ev.type}`}
          className="flex gap-3 border-l border-(--border-subtle) pb-3 pl-3 last:pb-0"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-(--text-primary)">
              {eventLabel(ev)}
            </p>
            <p className="truncate font-mono text-[11.5px] text-(--text-tertiary)">
              {byId.get(ev.recipient_id) ?? ev.recipient_id}
            </p>
          </div>
          <time
            dateTime={ev.created_at}
            className="shrink-0 text-[11.5px] text-(--text-tertiary)"
          >
            {formatDateTime(ev.created_at)}
          </time>
        </li>
      ))}
    </ol>
  );
}

/**
 * One email: who it went to and how each fared, what happened in order, and
 * for a scheduled send, Reschedule and Cancel. The body is never returned.
 */
export function EmailDetailSheet({
  emailId,
  onClose,
}: {
  emailId: string | null;
  onClose: () => void;
}) {
  const query = useEmailDetail(emailId);
  const { reschedule, cancel } = useEmailActions();
  const [dialog, setDialog] = useState<"reschedule" | "cancel" | null>(null);
  const email = query.data;
  const status = email ? emailStatusBadge(email.status) : null;
  const errorCopy = query.isError
    ? emailErrorCopy(toEmailFailure(query.error))
    : null;

  return (
    <Sheet
      open={emailId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        <SheetHeader className="border-b border-(--border-subtle) p-5 pr-12">
          <SheetTitle className="text-base">
            {email ? email.subject || "(no subject)" : "Email"}
          </SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-2">
            {status ? (
              <ToneBadge tone={status.tone} dot>
                {status.label}
              </ToneBadge>
            ) : null}
            {email ? (
              <ToneBadge
                tone={email.environment === "live" ? "info" : "neutral"}
              >
                {email.environment === "live" ? "Live" : "Test"}
              </ToneBadge>
            ) : null}
          </SheetDescription>
        </SheetHeader>

        {query.isPending ? (
          <div className="flex flex-col gap-3 p-5" aria-hidden="true">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
        ) : errorCopy ? (
          <div className="flex flex-col items-start gap-2 p-5">
            <p className="text-sm font-medium text-(--text-primary)">
              {errorCopy.title}
            </p>
            <p className="text-[13px] text-(--text-secondary)">
              {errorCopy.body}
            </p>
            <Button variant="outline" size="sm" onClick={() => query.refetch()}>
              Retry
            </Button>
          </div>
        ) : email ? (
          <div className="flex flex-col gap-6 p-5">
            {isActionable(email.status) ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-(--border-subtle) bg-(--status-info-bg) px-3 py-2.5 text-[13px] text-(--status-info-text)">
                <span className="min-w-0 flex-1">
                  Sends {formatDateTime(email.scheduled_at)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDialog("reschedule")}
                >
                  Reschedule
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDialog("cancel")}
                >
                  Cancel
                </Button>
              </div>
            ) : null}

            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Meta label="From">{email.from}</Meta>
              <Meta label="Created">{formatDateTime(email.created_at)}</Meta>
              {email.scheduled_at ? (
                <Meta label="Scheduled for">
                  {formatDateTime(email.scheduled_at)}
                </Meta>
              ) : null}
              <Meta label="Email id">
                <span className="inline-flex items-center gap-1">
                  <code className="font-mono text-[12px]">{email.id}</code>
                  <CopyButton value={email.id} label="Copy email id" />
                </span>
              </Meta>
              {email.tags.length > 0 ? (
                <Meta label="Tags">
                  <span className="flex flex-wrap gap-1">
                    {email.tags.map((t) => (
                      <ToneBadge key={t.name} tone="neutral">
                        {t.name}: {t.value}
                      </ToneBadge>
                    ))}
                  </span>
                </Meta>
              ) : null}
            </dl>

            <section className="flex flex-col gap-2">
              <h3 className={SECTION}>
                Recipients ({email.recipients.length})
              </h3>
              <Recipients recipients={email.recipients} />
            </section>

            <section className="flex flex-col gap-2">
              <h3 className={SECTION}>Timeline</h3>
              <Timeline email={email} />
            </section>
          </div>
        ) : null}

        {email ? (
          <>
            <RescheduleEmailDialog
              open={dialog === "reschedule"}
              scheduledAt={email.scheduled_at}
              pending={reschedule.isPending}
              onClose={() => setDialog(null)}
              onConfirm={(iso) =>
                reschedule.mutate(
                  { id: email.id, scheduledAt: iso },
                  {
                    onSuccess: () => setDialog(null),
                    onError: (err) => {
                      if (closesDialog(err)) setDialog(null);
                    },
                  }
                )
              }
            />
            <CancelEmailDialog
              open={dialog === "cancel"}
              subject={email.subject}
              recipientCount={email.recipients.length}
              pending={cancel.isPending}
              onClose={() => setDialog(null)}
              onConfirm={() =>
                cancel.mutate(email.id, {
                  onSuccess: () => setDialog(null),
                  onError: (err) => {
                    if (closesDialog(err)) setDialog(null);
                  },
                })
              }
            />
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
