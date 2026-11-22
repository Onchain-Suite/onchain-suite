"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type {
  ExportRequest,
  ExportRequestFilter,
} from "../../contracts/export-requests";
import { exportRequestsService } from "../../export-requests.service";
import {
  EXPORT_STATUS_LABEL,
  exportDecisionError,
} from "../../utils/export-requests";
import { useMyOrgRole } from "@/shared/hooks/client/use-my-org-role";

const FILTERS: { value: ExportRequestFilter; label: string }[] = [
  { value: "pending", label: "Waiting" },
  { value: "all", label: "All" },
];

const when = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(iso))
    : "-";

function RequestRow({
  r,
  canDecide,
  onDecided,
}: {
  r: ExportRequest;
  canDecide: boolean;
  onDecided: () => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const onError = (e: unknown) => {
    toast.error(exportDecisionError(e));
    if (e && typeof e === "object" && (e as { status?: number }).status === 409)
      onDecided();
  };
  const approve = useMutation({
    mutationFn: () => exportRequestsService.approve(r.id),
    onSuccess: () => {
      toast.success("Approved. The export is running now.");
      onDecided();
    },
    onError,
  });
  const reject = useMutation({
    mutationFn: () =>
      exportRequestsService.reject(r.id, reason.trim() || undefined),
    onSuccess: () => {
      toast.success("Export rejected.");
      setRejecting(false);
      onDecided();
    },
    onError,
  });
  const busy = approve.isPending || reject.isPending;
  const pending = r.status === "pending_approval";

  return (
    <li className="space-y-2 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 text-sm">
          <p className="font-medium text-foreground">
            {r.estimatedRows !== null
              ? `${r.estimatedRows.toLocaleString()} contacts`
              : "Contact export"}{" "}
            <span className="font-normal text-muted-foreground">
              · {r.format.toUpperCase()} · {when(r.createdAt)}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {EXPORT_STATUS_LABEL[r.status]}
            {r.decisionReason ? ` · ${r.decisionReason}` : ""}
            {r.ip ? ` · from ${r.ip}` : ""}
          </p>
        </div>
        {pending && canDecide ? (
          <div className="flex shrink-0 gap-2">
            <Button size="sm" disabled={busy} onClick={() => approve.mutate()}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setRejecting((v) => !v)}
            >
              Reject
            </Button>
          </div>
        ) : null}
      </div>
      {rejecting ? (
        <div className="flex gap-2">
          <Input
            aria-label="Reason for rejecting (optional)"
            placeholder="Reason (optional)"
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => reject.mutate()}
          >
            Reject export
          </Button>
        </div>
      ) : null}
    </li>
  );
}

/**
 * Exports over the threshold (10,000 contacts) wait here for a second owner
 * or admin. Everyone can see the list; only owners and admins get the
 * buttons, and the backend refuses the requester approving their own.
 */
export function ExportRequestsPanel() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<ExportRequestFilter>("pending");
  const { role } = useMyOrgRole();
  const canDecide = role === "OWNER" || role === "ADMIN";
  const key = ["audience", "export-requests", filter];

  const query = useQuery({
    queryKey: key,
    queryFn: () => exportRequestsService.list(filter),
    retry: false,
    staleTime: 15_000,
  });
  const refresh = () =>
    qc.invalidateQueries({ queryKey: ["audience", "export-requests"] });

  const { data } = query;
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Export requests
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            An export of more than{" "}
            {(data?.threshold ?? 10_000).toLocaleString()} contacts needs a
            second owner or admin to approve it before the file is made.
          </p>
        </div>
        <div className="inline-flex rounded-lg bg-muted p-1 text-sm">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={
                filter === f.value
                  ? "rounded-md bg-background px-3 py-1 font-medium text-foreground shadow-sm"
                  : "rounded-md px-3 py-1 text-muted-foreground hover:text-foreground"
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <div className="h-20 animate-pulse rounded-xl bg-muted/60" />
      ) : query.isError ? (
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={() => query.refetch()}
        >
          Couldn&apos;t load export requests. Retry
        </button>
      ) : !data || data.requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {filter === "pending"
            ? "No exports are waiting for approval."
            : "No export requests yet."}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {data.requests.map((r) => (
            <RequestRow
              key={r.id}
              r={r}
              canDecide={canDecide}
              onDecided={refresh}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
