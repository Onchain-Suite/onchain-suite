"use client";

import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { isJsonObject } from "@/lib/utils";

import { intelligenceService } from "../../intelligence.service";
import {
  deriveDisplayName,
  extractWalletFields,
} from "@/features/audience/utils";

const asNumber = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length > 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const asString = (v: unknown): string => (typeof v === "string" ? v : "");

export function SegmentDetailPage() {
  const params = useParams() as { id?: string } | null;
  const segmentId = typeof params?.id === "string" ? params.id : "";
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 25;
  const [nameDraft, setNameDraft] = useState("");

  const segmentQuery = useQuery({
    queryKey: ["intelligence", "segments", segmentId],
    queryFn: () => intelligenceService.getSegment(segmentId),
    enabled: typeof segmentId === "string" && segmentId.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const profilesQuery = useQuery({
    queryKey: [
      "intelligence",
      "segments",
      segmentId,
      "profiles",
      { page, limit },
    ],
    queryFn: () =>
      intelligenceService.getSegmentProfiles(segmentId, { page, limit }),
    enabled: typeof segmentId === "string" && segmentId.length > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const refreshMutation = useMutation({
    mutationFn: async () => intelligenceService.refreshSegment(segmentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["intelligence", "segments", segmentId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["intelligence", "segments", segmentId, "profiles"],
      });
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Failed to refresh segment";
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (nextName: string) => {
      const trimmed = nextName.trim();
      if (trimmed.length === 0) throw new Error("Segment name is required");
      await intelligenceService.updateSegment(segmentId, { name: trimmed });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["intelligence", "segments", segmentId],
      });
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Failed to update segment";
      toast.error(message);
    },
  });

  const markUsedMutation = useMutation({
    mutationFn: async () => intelligenceService.markSegmentUsed(segmentId),
    onError: () => {},
  });

  useEffect(() => {
    if (!segmentId) return;
    markUsedMutation.mutate();
  }, [markUsedMutation, segmentId]);

  const segment = segmentQuery.data ?? null;
  useEffect(() => {
    if (!segment) return;
    setNameDraft(segment.name ?? "");
  }, [segment]);

  // `size` is derived server-side: a number for wallet-list segments, `null`
  // for rule segments that are lazily resolved on use.
  const size: number | null =
    segment?.size === null
      ? null
      : typeof segment?.size === "number"
        ? segment.size
        : typeof segment?.matchCount === "number"
          ? segment.matchCount
          : 0;
  const sourceQueryId =
    typeof segment?.sourceQueryId === "string" &&
    segment.sourceQueryId.length > 0
      ? segment.sourceQueryId
      : null;

  const profiles = useMemo(() => {
    const items = profilesQuery.data?.items ?? [];
    return Array.isArray(items) ? items : [];
  }, [profilesQuery.data?.items]);

  const totalProfiles =
    asNumber(
      (profilesQuery.data as Record<string, unknown> | undefined)?.total
    ) ?? profiles.length;
  const pageCount = Math.max(1, Math.ceil(Math.max(0, totalProfiles) / limit));

  if (!segment) {
    if (segmentQuery.isFetching) {
      return (
        <div className="flex h-[50vh] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          Loading segment…
        </div>
      );
    }
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-semibold">Segment not found</h2>
        <Link href="/intelligence" className="text-primary hover:underline">
          Back to Intelligence
        </Link>
      </div>
    );
  }

  const segmentName = segment.name ?? "";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <Link
          href="/intelligence"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-secondary"
        >
          <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold tracking-tight">
            {segmentName}
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">Segment Details</p>
            {sourceQueryId && (
              <span
                className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground"
                title={`Created from query ${sourceQueryId}`}
              >
                From query
              </span>
            )}
          </div>
        </div>
        <div className="ml-auto">
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

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              Profiles
            </h3>
            <UserGroupIcon
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {size === null ? (
              <span className="text-lg font-semibold text-muted-foreground">
                Resolved on use
              </span>
            ) : (
              <span className="text-2xl font-bold">
                {size.toLocaleString()}
              </span>
            )}
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
            <span className="text-2xl font-bold text-primary">
              {asString((segment as Record<string, unknown>)?.revenue) || "$0"}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-medium text-foreground">Settings</h3>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="text-sm font-medium">Name</label>
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => updateMutation.mutate(nameDraft)}
            disabled={
              updateMutation.isPending ||
              nameDraft.trim().length === 0 ||
              nameDraft.trim() === segmentName
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {updateMutation.isPending ? (
              <ArrowPathIcon
                className="h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            ) : null}
            Save
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-3">
          <h3 className="font-medium text-foreground">Profiles</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              Page {page} of {pageCount}
            </span>
            <span>{totalProfiles.toLocaleString()} total</span>
          </div>
        </div>

        {profilesQuery.isFetching && profiles.length === 0 ? (
          <div className="flex items-center justify-center px-6 py-10 text-sm text-muted-foreground">
            Loading profiles…
          </div>
        ) : profiles.length === 0 ? (
          // A wallet-list segment can hold wallets that aren't linked to a
          // contact profile yet. "No profiles found" reads as an empty
          // segment, so only say that when the segment really is empty.
          <div className="flex flex-col items-center justify-center gap-1 px-6 py-10 text-center text-sm text-muted-foreground">
            {size === null ? (
              <>
                <span className="font-medium text-foreground">
                  This segment resolves on use.
                </span>
                <span>
                  Its members are matched when the segment is applied to a
                  campaign or automation.
                </span>
              </>
            ) : size > 0 ? (
              <>
                <span className="font-medium text-foreground">
                  {size.toLocaleString()} wallet{size === 1 ? "" : "s"} in this
                  segment, not linked to contact profiles yet.
                </span>
                <span>
                  They&apos;ll appear here once matched. You can still reach
                  them with an in-app push.
                </span>
              </>
            ) : (
              <span>No profiles found for this segment.</span>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Wallet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profiles.map((row, idx) => {
                  const rec = isJsonObject(row)
                    ? (row as Record<string, unknown>)
                    : {};
                  const name = deriveDisplayName({
                    name: rec.name,
                    fullName: rec.fullName,
                    email: rec.email,
                    wallet: rec.wallet,
                    walletAddress: rec.walletAddress,
                  });
                  const email = asString(rec.email) || "—";
                  const wallet = extractWalletFields(rec).wallet || "—";
                  const { walletFull } = extractWalletFields(rec);
                  return (
                    <tr
                      key={asString(rec.id) || `${idx}`}
                      className="hover:bg-secondary/20"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {name}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {email}
                      </td>
                      <td
                        className="px-4 py-3 text-sm text-muted-foreground"
                        title={walletFull}
                      >
                        {wallet}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={page >= pageCount}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
