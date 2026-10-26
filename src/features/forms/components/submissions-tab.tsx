"use client";

import {
  CheckBadgeIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

import { formsService, type FormSubmission } from "../forms.service";
import { useSubmissions } from "../hooks/use-forms";
import { FormPerformance } from "./form-performance";

const shorten = (v: string) =>
  /^0x[a-fA-F0-9]{8,}$/.test(v) ? `${v.slice(0, 6)}…${v.slice(-4)}` : v;

/** Readable label for a captured channel key. */
const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  x: "X",
  farcaster: "Farcaster",
  telegram: "Telegram",
  discord: "Discord",
  wallet: "Wallet",
};

const channelLabel = (c: string) =>
  CHANNEL_LABEL[c.toLowerCase()] ?? c.charAt(0).toUpperCase() + c.slice(1);

/** Deterministic hue for the wallet avatar, so each wallet looks consistent. */
function hue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1)
    h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

/** The email a submission captured, if any (keyed by the `email` field). */
function submissionEmail(sub: FormSubmission): string | null {
  const v = sub.data?.email;
  return typeof v === "string" && v.length > 0 ? v : null;
}

/** A display name the submission carried (ens / name field), if any. */
function submissionName(sub: FormSubmission): string | null {
  const candidate = sub.data?.ens ?? sub.data?.name;
  return typeof candidate === "string" && candidate.length > 0
    ? candidate
    : null;
}

export function SubmissionsTab({ formId }: { formId: string }) {
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const limit = 25;
  const { data, isLoading, isError } = useSubmissions(formId, page, limit);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const exportCsv = async () => {
    setExporting(true);
    try {
      const blob = await formsService.exportSubmissionsCsv(formId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `submissions-${formId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Couldn't export submissions."
      );
    } finally {
      setExporting(false);
    }
  };

  const copyWallet = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(address);
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      toast.error("Couldn't copy address.");
    }
  };

  return (
    <div className="space-y-6">
      <FormPerformance
        formId={formId}
        completionsFallback={total}
        onExport={exportCsv}
        exporting={exporting}
        exportDisabled={total === 0}
      />

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Recent submissions
        </h3>

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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="py-2.5 pr-4">Wallet</th>
                  <th className="px-4 py-2.5">Email</th>
                  <th className="px-4 py-2.5">Linked via</th>
                  <th className="px-4 py-2.5 text-right">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {items.map((sub) => {
                  const email = submissionEmail(sub);
                  const name = submissionName(sub);
                  const addr = sub.walletAddress;
                  return (
                    <tr
                      key={sub.id}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-2.5">
                          {addr ? (
                            <span
                              aria-hidden="true"
                              className="size-6 shrink-0 rounded-full"
                              style={{
                                background: `linear-gradient(135deg, hsl(${hue(
                                  addr
                                )} 70% 55%), hsl(${(hue(addr) + 40) % 360} 70% 45%))`,
                              }}
                            />
                          ) : null}
                          {name ? (
                            <span className="font-medium text-foreground">
                              {name}
                            </span>
                          ) : null}
                          <span className="font-mono text-xs text-muted-foreground">
                            {addr ? shorten(addr) : "No wallet"}
                          </span>
                          {addr ? (
                            <button
                              type="button"
                              onClick={() => copyWallet(addr)}
                              aria-label="Copy wallet address"
                              className="text-muted-foreground transition-colors hover:text-foreground"
                            >
                              {copied === addr ? (
                                <ClipboardDocumentCheckIcon className="size-3.5" />
                              ) : (
                                <ClipboardDocumentIcon className="size-3.5" />
                              )}
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {email ? (
                          <span
                            className="block max-w-[220px] truncate font-mono text-xs text-foreground"
                            title={email}
                          >
                            {email}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No email
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {sub.channels.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-foreground">
                            {sub.verified ? (
                              <CheckBadgeIcon
                                className="size-4 text-primary"
                                aria-hidden="true"
                              />
                            ) : null}
                            {sub.channels.map(channelLabel).join(" · ")}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right text-xs text-muted-foreground">
                        {sub.createdAt
                          ? formatDistanceToNow(new Date(sub.createdAt), {
                              addSuffix: true,
                            })
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)}{" "}
              of {total.toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
