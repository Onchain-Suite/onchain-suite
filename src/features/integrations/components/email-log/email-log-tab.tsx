"use client";

import { Mail01Icon } from "@hugeicons/core-free-icons";
import { useCallback, useMemo, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import type { EmailSummary } from "../../contracts/emails";
import { toEmailFailure } from "../../emails.service";
import { useEmailLog } from "../../hooks/use-email-log";
import {
  emailErrorCopy,
  type EmailLogFilterInput,
  EMPTY_FILTERS,
  hasFilters,
  toListFilters,
} from "../../utils/email-log";
import { EventsPane } from "../events/events-pane";
import { EmailDetailSheet } from "./email-detail-sheet";
import { EmailLogFilters } from "./email-log-filters";
import { EmailLogTable } from "./email-log-table";
import { Button } from "@/shared/components/ui/button";

const BOX =
  "rounded-xl border border-dashed border-(--border-default) px-6 py-10 text-center text-[13px] leading-relaxed text-(--text-secondary)";

/**
 * Email logs (2.7): every email sent through the transactional Email API,
 * newest first, beside the keys and webhooks that send and report on it.
 * Filters narrow on the server; "Load more" follows the cursor. A row opens
 * the email, where a scheduled send can be moved or canceled.
 */
export function EmailLogTab() {
  const [input, setInput] = useState<EmailLogFilterInput>(EMPTY_FILTERS);
  const [openId, setOpenId] = useState<string | null>(null);
  const filters = useMemo(() => toListFilters(input), [input]);
  const query = useEmailLog(filters);
  const filtered = hasFilters(input);

  const emails = useMemo<EmailSummary[]>(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data]
  );
  const onOpen = useCallback((id: string) => setOpenId(id), []);
  const onClose = useCallback(() => setOpenId(null), []);
  const failure = query.isError ? toEmailFailure(query.error) : null;
  const errorCopy = query.isError ? emailErrorCopy(failure) : null;

  let body: React.ReactNode;
  if (!query.organizationId) {
    body = <div className={BOX}>Choose a workspace to see its emails.</div>;
  } else if (query.isPending) {
    body = (
      <div className="flex flex-col gap-2" aria-hidden="true">
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    );
  } else if (errorCopy) {
    const suspended = failure?.code === "SENDING_SUSPENDED";
    body = (
      <div
        role={suspended ? "alert" : undefined}
        className={
          suspended
            ? "rounded-xl border border-(--border-subtle) bg-(--status-error-bg) px-5 py-4 text-[13px] text-(--status-error-text)"
            : BOX
        }
      >
        <p className="font-medium">{errorCopy.title}</p>
        <p className="mt-1">{errorCopy.body}</p>
        {suspended || failure?.status === 403 ? null : (
          <Button
            className="mt-3"
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
          >
            Retry
          </Button>
        )}
      </div>
    );
  } else if (emails.length === 0) {
    body = filtered ? (
      <div className={BOX}>
        <p>No emails match these filters.</p>
        <Button
          className="mt-3"
          variant="outline"
          size="sm"
          onClick={() => setInput(EMPTY_FILTERS)}
        >
          Clear filters
        </Button>
      </div>
    ) : (
      <div className={BOX}>
        <p className="font-medium text-(--text-primary)">
          No emails sent through the API yet
        </p>
        <p className="mt-1">
          Create a key in the API tab and call{" "}
          <code className="font-mono">POST /emails</code> from your server. Each
          email, its recipients and every delivery event will show up here.
          Emails sent with a test key appear too, marked Test.
        </p>
      </div>
    );
  } else {
    body = (
      <EmailLogTable
        emails={emails}
        onOpen={onOpen}
        footer={
          query.hasNextPage ? (
            <div className="flex justify-center border-t border-(--border-subtle) p-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={query.isFetchingNextPage}
                onClick={() => query.fetchNextPage()}
              >
                {query.isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            </div>
          ) : null
        }
      />
    );
  }

  return (
    <EventsPane
      icon={Mail01Icon}
      title="Email logs"
      blurb="Every email sent through the Email API: who it went to, what happened to each recipient, and when. Wallet recipients show the wallet, never the address it resolved to."
    >
      <EmailLogFilters value={input} onChange={setInput} />
      {body}
      <EmailDetailSheet emailId={openId} onClose={onClose} />
    </EventsPane>
  );
}
