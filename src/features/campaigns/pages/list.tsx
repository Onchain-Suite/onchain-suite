"use client";

import { ChevronRightIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";

import { cn, getSelectedOrganizationId } from "@/lib/utils";

import { campaignsService } from "../campaigns.service";
import { CampaignsAnalyticsOverview } from "../components/analytics-overview";
import { CampaignDetailSheet } from "../components/campaign-detail-sheet";
import { CampaignsReferenceTable } from "../components/campaigns-reference-table";
import type { Campaign, CampaignStatus } from "../types/campaign";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

const CAMPAIGN_TYPE_LABEL: Record<string, string> = {
  "email-blast": "Email blast",
  newsletter: "Newsletter",
  "smart-sending": "Smart",
  automation: "Automation",
};

const campaignTypeLabel = (type: string) =>
  CAMPAIGN_TYPE_LABEL[type] ?? "Email";

/** Split a date into the little day/month badge used by the UPCOMING cards. */
const dateBadge = (date: Date) => ({
  day: date.getDate(),
  month: new Intl.DateTimeFormat("en-US", { month: "short" })
    .format(date)
    .toUpperCase(),
});

export function CampaignsListsView() {
  const [statusFilter, setStatusFilter] = useState<"all" | CampaignStatus>(
    "all"
  );
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const queryClient = useQueryClient();

  const campaignsQuery = useQuery({
    queryKey: ["campaigns", "list"],
    queryFn: () => campaignsService.listCampaigns({ page: 1, limit: 200 }),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      campaignsService.deleteCampaign(
        id,
        getSelectedOrganizationId() ?? undefined
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["campaigns", "list"] });
      toast.success("Campaign deleted");
      setDeleteTarget(null);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Couldn't delete campaign"),
  });

  const campaigns = useMemo(
    () => campaignsQuery.data ?? [],
    [campaignsQuery.data]
  );

  const filteredCampaigns = useMemo(
    () =>
      statusFilter === "all"
        ? campaigns
        : campaigns.filter((c) => c.status === statusFilter),
    [campaigns, statusFilter]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of campaigns) counts[c.status] = (counts[c.status] ?? 0) + 1;
    return counts;
  }, [campaigns]);

  // Always show the reference set; surface sending/failed only when they have
  // rows so the strip stays clean.
  const statusChips = useMemo(() => {
    const base: { key: "all" | CampaignStatus; label: string }[] = [
      { key: "all", label: "All" },
      { key: "sent", label: "Sent" },
      { key: "scheduled", label: "Scheduled" },
      { key: "draft", label: "Draft" },
      { key: "paused", label: "Paused" },
    ];
    if ((statusCounts.sending ?? 0) > 0)
      base.push({ key: "sending", label: "Sending" });
    if ((statusCounts.failed ?? 0) > 0)
      base.push({ key: "failed", label: "Failed" });
    return base;
  }, [statusCounts]);

  // Next scheduled sends, soonest first — powers the "UPCOMING" row.
  const upcomingCampaigns = useMemo(() => {
    const now = Date.now();
    return campaigns
      .filter(
        (c) =>
          c.status === "scheduled" &&
          c.scheduledFor instanceof Date &&
          c.scheduledFor.getTime() > now
      )
      .sort(
        (a, b) =>
          (a.scheduledFor?.getTime() ?? 0) - (b.scheduledFor?.getTime() ?? 0)
      )
      .slice(0, 2);
  }, [campaigns]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Campaigns
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search, filter, and manage all of your campaigns from one place.
          </p>
        </div>
        <Button asChild className="rounded-xl">
          <Link href={PRIVATE_ROUTES.NEW_CAMPAIGN} prefetch>
            <PlusIcon className="mr-2 size-4" aria-hidden="true" />
            Create campaign
          </Link>
        </Button>
      </div>

      <CampaignsAnalyticsOverview />

      {upcomingCampaigns.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Upcoming
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {upcomingCampaigns.map((c) => {
              const badge = c.scheduledFor ? dateBadge(c.scheduledFor) : null;
              const recipients =
                typeof c.recipients === "number"
                  ? `${c.recipients.toLocaleString()} recipients`
                  : "Audience pending";
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setDetailCampaign(c)}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  {badge ? (
                    <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 leading-none text-primary">
                      <span className="text-lg font-semibold">{badge.day}</span>
                      <span className="text-[10px] font-medium">
                        {badge.month}
                      </span>
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-foreground">
                      {c.name}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {campaignTypeLabel(c.type)} · {recipients}
                    </span>
                  </span>
                  <ChevronRightIcon
                    className="size-5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div
        role="tablist"
        aria-label="Filter campaigns by status"
        className="flex flex-wrap items-center gap-2"
      >
        {statusChips.map((chip) => {
          const count =
            chip.key === "all"
              ? campaigns.length
              : (statusCounts[chip.key] ?? 0);
          const active = statusFilter === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStatusFilter(chip.key)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {chip.label}
              <span
                className={cn(
                  "ml-1.5 tabular-nums",
                  active ? "text-primary" : "text-muted-foreground/70"
                )}
              >
                · {count}
              </span>
            </button>
          );
        })}
      </div>

      {campaignsQuery.isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading campaigns...
        </div>
      ) : filteredCampaigns.length > 0 ? (
        <CampaignsReferenceTable
          data={filteredCampaigns}
          onSelect={setDetailCampaign}
          onDelete={setDeleteTarget}
        />
      ) : campaigns.length > 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No campaigns match this filter.
        </div>
      ) : (
        // No campaigns to show — genuinely empty, or the request failed (data is
        // empty either way). Show the actionable empty state, plus a Retry when
        // it actually errored so a transient failure isn't a dead end.
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {campaignsQuery.isError
              ? "We couldn't load your campaigns just now — retry, or create a new one."
              : "No campaigns yet — create your first to start reaching wallets by email and in-app push."}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {campaignsQuery.isError ? (
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => campaignsQuery.refetch()}
              >
                Retry
              </Button>
            ) : null}
            <Button asChild className="rounded-xl">
              <Link href={PRIVATE_ROUTES.NEW_CAMPAIGN} prefetch>
                <PlusIcon className="mr-2 size-4" aria-hidden="true" />
                Create campaign
              </Link>
            </Button>
          </div>
        </div>
      )}

      <CampaignDetailSheet
        campaign={detailCampaign}
        onOpenChange={(o) => {
          if (!o) setDetailCampaign(null);
        }}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => {
          if (!o && !deleteMutation.isPending) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete campaign</DialogTitle>
            <DialogDescription>
              Delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name ?? "this campaign"}
              </span>
              ? This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
