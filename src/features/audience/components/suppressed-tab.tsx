"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import type { AudienceSuppression } from "../audience.service";
import { audienceService } from "../audience.service";

const PAGE_SIZE = 50;

/** Map the normalized suppression reason to a human label + the channel it hit. */
function describeReason(reason?: string): { label: string; channel: string } {
  switch ((reason ?? "").toLowerCase()) {
    case "unsubscribe":
      return { label: "Unsubscribed", channel: "Email" };
    case "hard_bounce":
    case "soft_bounce":
      return { label: "Bounced", channel: "Email" };
    case "complaint":
      return { label: "Complaint", channel: "Email" };
    case "manual":
      return { label: "Manual", channel: "Email" };
    default:
      return {
        label: reason ? reason.replace(/_/g, " ") : "Suppressed",
        channel: "Email",
      };
  }
}

function formatSince(value?: string): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function contactLabel(item: AudienceSuppression): string {
  const wallet =
    typeof item.walletAddress === "string"
      ? item.walletAddress
      : typeof item.wallet === "string"
        ? item.wallet
        : "";
  if (wallet) {
    return wallet.length > 12
      ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}`
      : wallet;
  }
  if (item.email) return item.email;
  return `${item.contactId.slice(0, 6)}…${item.contactId.slice(-4)}`;
}

export function SuppressedTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["audience", "suppressions", { page, limit: PAGE_SIZE }],
    queryFn: () => audienceService.listSuppressions({ page, limit: PAGE_SIZE }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const reinstateMutation = useMutation({
    mutationFn: (contactId: string) =>
      audienceService.reinstateSuppression(contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audience", "suppressions"] });
      queryClient.invalidateQueries({ queryKey: ["audience", "overview"] });
      toast.success("Contact reinstated - they can be messaged again.");
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error ? e.message : "Failed to reinstate contact"
      ),
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? items.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (query.isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        Loading suppression list...
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        Failed to load the suppression list.
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
        No suppressed contacts - everyone&apos;s reachable.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Channel</th>
              <th className="px-4 py-3 font-medium">Since</th>
              <th
                className="px-4 py-3 text-right font-medium"
                aria-hidden="true"
              />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const { label, channel } = describeReason(item.reason);
              return (
                <tr
                  key={item.contactId}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-5 py-4 font-mono text-foreground">
                    {contactLabel(item)}
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                      <span className="size-1.5 rounded-full bg-destructive" />
                      {label}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{channel}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">
                    {formatSince(item.suppressedAt)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      disabled={
                        reinstateMutation.isPending &&
                        reinstateMutation.variables === item.contactId
                      }
                      onClick={() => reinstateMutation.mutate(item.contactId)}
                    >
                      Reinstate
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between pt-1 text-sm text-muted-foreground">
          <span>
            {total.toLocaleString()} suppressed contact
            {total === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-lg"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-lg"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
