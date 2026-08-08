"use client";

import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  CursorArrowRaysIcon,
  EyeIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { isJsonObject } from "@/lib/utils";

import { intelligenceService } from "../../intelligence.service";
import { ReportView } from "../query/report-view";

const asNumber = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length > 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const asString = (v: unknown): string => (typeof v === "string" ? v : "");

const normalizeRate = (v: unknown): number => {
  const n = asNumber(v);
  if (n === null) return 0;
  if (n <= 1 && n >= 0) return Math.round(n * 100);
  return Math.round(n);
};

const formatDate = (v: unknown): string => {
  const raw = asString(v);
  if (raw.length > 0) return raw;
  const n = asNumber(v);
  if (n === null) return "-";
  const d = new Date(n);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
};

const formatMoney = (v: unknown): string => {
  if (typeof v === "string" && v.trim().length > 0) return v;
  const n = asNumber(v);
  if (n === null) return "-";
  return `$${Math.round(n).toLocaleString()}`;
};

export function ReportDetailPage() {
  const params = useParams();
  const reportId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? (params.id[0] ?? "")
        : "";
  const queryClient = useQueryClient();

  const reportQuery = useQuery({
    queryKey: ["intelligence", "reports", reportId],
    queryFn: () => intelligenceService.getReport(reportId),
    enabled: typeof reportId === "string" && reportId.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const refreshMutation = useMutation({
    mutationFn: async () => intelligenceService.refreshReport(reportId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["intelligence", "reports"],
      });
      await reportQuery.refetch();
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Failed to refresh report";
      toast.error(message);
    },
  });

  const report = reportQuery.data;
  const rec = isJsonObject(report) ? (report as Record<string, unknown>) : {};

  const name =
    asString(rec.name) ||
    asString(rec.title) ||
    asString(rec.subject) ||
    "Report";
  const sentDate =
    formatDate(rec.sentDate) ||
    formatDate(rec.sentAt) ||
    formatDate(rec.createdAt) ||
    "-";
  const status = asString(rec.status) || asString(rec.state) || "-";

  const recipients =
    asNumber(rec.recipients) ??
    asNumber(rec.recipientCount) ??
    asNumber(rec.audienceSize) ??
    0;
  const openRate = normalizeRate(
    rec.openRate ?? rec.open_rate ?? rec.openRatio
  );
  const clickRate = normalizeRate(
    rec.clickRate ?? rec.click_rate ?? rec.clickRatio
  );
  const revenue = formatMoney(rec.revenueUsd ?? rec.revenue);
  // Saved reports carry the source query - the visual report layer (charts,
  // typed table, CSV export) reads GET /intelligence/query/:id/report-data.
  const sourceQueryId =
    asString(rec.sourceQueryId) ||
    asString(rec.queryId) ||
    asString(rec.query_id);

  if (!report && !reportQuery.isFetching) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-semibold">Report not found</h2>
        <Link href="/intelligence" className="text-primary hover:underline">
          Back to Intelligence
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link
          href="/intelligence"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-secondary"
        >
          <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" aria-hidden="true" />
              {sentDate}
            </span>
            <span>•</span>
            <span className="capitalize">{status}</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-50"
          >
            {refreshMutation.isPending ? (
              <ArrowPathIcon
                className="h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
            )}
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              Recipients
            </h3>
            <UserGroupIcon
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {recipients.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              Open Rate
            </h3>
            <EyeIcon
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-secondary">
              {openRate}%
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              Click Rate
            </h3>
            <CursorArrowRaysIcon
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold">{clickRate}%</span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              Revenue
            </h3>
            <ArrowTrendingUpIcon
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{revenue}</span>
          </div>
        </div>
      </div>

      {sourceQueryId ? <ReportView queryId={sourceQueryId} /> : null}
    </div>
  );
}
