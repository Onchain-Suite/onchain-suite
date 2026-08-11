"use client";

import {
  ArrowDownTrayIcon,
  CheckBadgeIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

import { Button } from "@/ui/button";

import type { FormSubmission } from "../forms.service";
import { useSubmissions } from "../hooks/use-forms";

const shorten = (v: string) =>
  /^0x[a-fA-F0-9]{8,}$/.test(v) ? `${v.slice(0, 6)}…${v.slice(-4)}` : v;

/** Turn a submission's captured field values into a compact summary string. */
function fieldSummary(sub: FormSubmission): string {
  const entries = Object.entries(sub.data ?? {})
    .filter(([, v]) => v !== null && v !== undefined && String(v).length > 0)
    .map(([k, v]) => `${k}: ${shorten(String(v))}`);
  return entries.length > 0 ? entries.join(" · ") : "-";
}

export function SubmissionsTab({
  formId,
  csvUrl,
}: {
  formId: string;
  csvUrl: string;
}) {
  const [page, setPage] = useState(1);
  const limit = 25;
  const { data, isLoading, isError } = useSubmissions(formId, page, limit);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total.toLocaleString()} submission{total === 1 ? "" : "s"}
        </p>
        <Button variant="outline" size="sm" asChild>
          <a href={csvUrl} target="_blank" rel="noreferrer">
            <ArrowDownTrayIcon className="size-4" aria-hidden="true" />
            Export CSV
          </a>
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
          Loading submissions…
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
          Couldn&apos;t load submissions.
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-10 text-center">
          <InboxIcon
            className="size-8 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-foreground">
            No submissions yet
          </p>
          <p className="text-xs text-muted-foreground">
            Share the form link to start collecting wallet-first signups.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5">Wallet</th>
                  <th className="px-4 py-2.5">Channels</th>
                  <th className="px-4 py-2.5">Captured</th>
                  <th className="px-4 py-2.5">Verified</th>
                  <th className="px-4 py-2.5 text-right">When</th>
                </tr>
              </thead>
              <tbody>
                {items.map((sub) => (
                  <tr
                    key={sub.id}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-foreground">
                      {sub.walletAddress ? shorten(sub.walletAddress) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {sub.channels?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {sub.channels.map((c) => (
                            <span
                              key={c}
                              className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="max-w-[280px] truncate px-4 py-3 text-muted-foreground">
                      {fieldSummary(sub)}
                    </td>
                    <td className="px-4 py-3">
                      {sub.verified ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <CheckBadgeIcon
                            className="size-4"
                            aria-hidden="true"
                          />
                          Verified
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {sub.createdAt
                        ? formatDistanceToNow(new Date(sub.createdAt), {
                            addSuffix: true,
                          })
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
