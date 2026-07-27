"use client";

import {
  CpuChipIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/ui/alert-dialog";

import { formatDateTime, formatRelativeTime } from "@/lib/date";
import { isJsonObject } from "@/lib/utils";

import {
  type IntelligenceSegment,
  intelligenceService,
} from "../../intelligence.service";
import { type Segment } from "../../types";
import { isSyntheticWalletEmail } from "@/features/audience/utils";

interface SegmentsTabProps {
  openEmailComposer: (recipient: unknown | null) => void;
  savedSegments?: Segment[];
  onDeleteSegment?: (segmentId: string) => void;
}

const toUiSegment = (input: IntelligenceSegment): Segment => {
  // `size` comes derived on the list response: a number for wallet-list
  // segments, `null` for rule segments resolved lazily on use.
  const size =
    input.size === null
      ? null
      : typeof input.size === "number"
        ? input.size
        : typeof input.matchCount === "number"
          ? input.matchCount
          : undefined;
  const lastUpdated =
    typeof input.updatedAt === "string"
      ? input.updatedAt
      : typeof input.lastUsedAt === "string"
        ? input.lastUsedAt
        : undefined;
  const raw = input as unknown as Record<string, unknown>;
  return {
    id:
      typeof input.id === "string" && input.id.length > 0
        ? input.id
        : typeof raw.segmentId === "string"
          ? (raw.segmentId as string)
          : typeof raw._id === "string"
            ? (raw._id as string)
            : "",
    name:
      typeof input.name === "string" && input.name.length > 0
        ? input.name
        : typeof raw.title === "string" && (raw.title as string).length > 0
          ? (raw.title as string)
          : "Untitled segment",
    size,
    sourceQueryId:
      typeof input.sourceQueryId === "string" && input.sourceQueryId.length > 0
        ? input.sourceQueryId
        : undefined,
    matchCount: typeof size === "number" ? size : undefined,
    lastUpdated,
    isEmailable: true,
  };
};

/** "N members" for wallet-list segments, "Resolved on use" for rule segments. */
const formatSegmentSize = (size: number | null | undefined): string =>
  size === null ? "Resolved on use" : `${(size ?? 0).toLocaleString()} members`;

/** How many members we inspect when deriving the segment's email match. */
const EMAIL_MATCH_SAMPLE = 200;

/**
 * A member counts as email-reachable only with a real address — wallet-only
 * contacts carry a synthetic `…@wallet.onchainsuite.local` placeholder, which
 * is not an email channel.
 */
const hasEmailChannel = (row: unknown): boolean => {
  if (!isJsonObject(row)) return false;
  const email = typeof row.email === "string" ? row.email.trim() : "";
  return email.length > 0 && !isSyntheticWalletEmail(email);
};

export function SegmentsTab({ openEmailComposer }: SegmentsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(
    null
  );

  const queryClient = useQueryClient();
  const normalizedSearch = searchQuery.trim();

  const segmentsQuery = useQuery({
    queryKey: ["intelligence", "segments", { search: normalizedSearch }],
    queryFn: async () => {
      const res = await intelligenceService.listSegments({
        search: normalizedSearch.length > 0 ? normalizedSearch : undefined,
        page: 1,
        limit: 100,
      });
      // The list arrives in several envelope shapes depending on backend
      // version ({items}, {segments}, {data}, {data:{items}}, bare array) —
      // accepting them all is what makes the section actually render.
      const r = res as Record<string, unknown>;
      const nested =
        r && typeof r === "object" && !Array.isArray(res)
          ? ((r.items ?? r.segments ?? r.data) as unknown)
          : res;
      const nestedObj = nested as Record<string, unknown> | unknown[];
      const list = Array.isArray(res)
        ? res
        : Array.isArray(nested)
          ? nested
          : nestedObj &&
              typeof nestedObj === "object" &&
              Array.isArray((nestedObj as Record<string, unknown>).items)
            ? ((nestedObj as Record<string, unknown>).items as unknown[])
            : [];
      return (list as IntelligenceSegment[])
        .map(toUiSegment)
        .filter((seg) => seg.id.length > 0);
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const selectedSegment = useMemo(
    () => segmentsQuery.data?.find((seg) => seg.id === selectedSegmentId),
    [segmentsQuery.data, selectedSegmentId]
  );

  // There is no server-side email-match count (GET /intelligence/segments/
  // {id}/profiles is the only member source), so derive it from the members
  // themselves. Wallet-first segments legitimately have zero email channels.
  const selectedProfilesQuery = useQuery({
    queryKey: [
      "intelligence",
      "segments",
      selectedSegmentId,
      "profiles",
      { page: 1, limit: EMAIL_MATCH_SAMPLE },
    ],
    queryFn: () =>
      intelligenceService.getSegmentProfiles(selectedSegmentId ?? "", {
        page: 1,
        limit: EMAIL_MATCH_SAMPLE,
      }),
    enabled: Boolean(selectedSegmentId),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const {
    data: selectedProfilesData,
    isPending: isProfilesPending,
    isError: isProfilesError,
  } = selectedProfilesQuery;

  const emailMatch = useMemo(() => {
    const items = Array.isArray(selectedProfilesData?.items)
      ? selectedProfilesData.items
      : [];
    const count = items.reduce(
      (n, row) => (hasEmailChannel(row) ? n + 1 : n),
      0
    );
    const total =
      typeof selectedProfilesData?.total === "number" &&
      selectedProfilesData.total >= 0
        ? selectedProfilesData.total
        : items.length;
    return {
      count,
      // Only a partial view when the segment has more members than we sampled.
      isPartial: total > items.length,
      isLoading: isProfilesPending,
      isError: isProfilesError,
    };
  }, [selectedProfilesData, isProfilesPending, isProfilesError]);

  // Only block sending on a confident zero: loaded cleanly, and no email
  // channel anywhere in the segment.
  const canSendEmail =
    emailMatch.isLoading || emailMatch.isError || emailMatch.count > 0;

  const deleteMutation = useMutation({
    mutationFn: async (segmentId: string) => {
      await intelligenceService.deleteSegment(segmentId);
    },
    onSuccess: async () => {
      setSelectedSegmentId(null);
      await queryClient.invalidateQueries({
        queryKey: ["intelligence", "segments"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["intelligence", "segments", "metrics"],
      });
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Failed to delete segment";
      toast.error(message);
    },
  });

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-64">
            <MagnifyingGlassIcon
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search segments..."
              className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Link
            href="/intelligence/segments/create"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg sm:self-auto"
          >
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            New segment
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Saved Segments</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {(segmentsQuery.data?.length ?? 0).toLocaleString()} results
                </span>
              </div>
            </div>
          </div>

          {(segmentsQuery.data?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground">
                <CpuChipIcon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                No segments yet
              </h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                {searchQuery.length > 0
                  ? "Try a different search term."
                  : "Create your first segment to start targeting the right users."}
              </p>
              {searchQuery.length === 0 && (
                <Link
                  href="/intelligence/segments/create"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <PlusIcon className="h-4 w-4" aria-hidden="true" />
                  New segment
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Mobile: stacked list (the table below is hidden under md). */}
              <ul className="divide-y divide-border/50 md:hidden">
                {(segmentsQuery.data ?? []).map((segment) => (
                  <li key={segment.id} className="flex items-start gap-3 p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <CpuChipIcon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/intelligence/segments/detail/${segment.id}`}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {segment.name}
                      </Link>
                      <p
                        className="mt-0.5 text-xs text-muted-foreground"
                        title={formatDateTime(segment.lastUpdated)}
                      >
                        {formatSegmentSize(segment.size)}
                        {formatRelativeTime(segment.lastUpdated)
                          ? ` · updated ${formatRelativeTime(segment.lastUpdated)}`
                          : ""}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                          Segment
                        </span>
                        <span className="inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground">
                          Emailable
                        </span>
                        {segment.sourceQueryId && (
                          <span
                            className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
                            title={`Created from query ${segment.sourceQueryId}`}
                          >
                            From query
                          </span>
                        )}
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          disabled={deleteMutation.isPending}
                          aria-label={`Delete segment ${segment.name}`}
                          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <TrashIcon className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete segment</AlertDialogTitle>
                          <AlertDialogDescription>
                            Delete segment &quot;{segment.name}&quot;? This
                            cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(segment.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </li>
                ))}
              </ul>
              <table className="w-full hidden md:table">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Profiles</th>
                    <th className="px-4 py-3">Match Rate</th>
                    <th className="px-4 py-3">Revenue</th>
                    <th className="px-4 py-3">Last Updated</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(segmentsQuery.data ?? []).map((segment) => (
                    <tr
                      key={segment.id}
                      className={`border-b border-border/50 transition-colors ${
                        selectedSegmentId === segment.id
                          ? "bg-primary/5"
                          : "hover:bg-secondary/30"
                      } cursor-pointer`}
                      onClick={() => setSelectedSegmentId(segment.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setSelectedSegmentId(segment.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <CpuChipIcon
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          </div>
                          <div>
                            <Link
                              href={`/intelligence/segments/detail/${segment.id}`}
                              className="text-sm font-medium hover:underline"
                            >
                              {segment.name}
                            </Link>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">
                                Segment
                              </span>
                              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground">
                                Emailable
                              </span>
                              {segment.sourceQueryId && (
                                <span
                                  className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground"
                                  title={`Created from query ${segment.sourceQueryId}`}
                                >
                                  From query
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            segment.size === null
                              ? "text-sm text-muted-foreground"
                              : "text-sm font-medium text-foreground"
                          }
                        >
                          {formatSegmentSize(segment.size)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-secondary">
                            <div className="h-full rounded-full bg-primary" />
                          </div>
                          <span className="text-sm font-medium text-primary">
                            —
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-primary">
                          {segment.revenue ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs text-muted-foreground"
                          title={formatDateTime(segment.lastUpdated)}
                        >
                          {formatDateTime(segment.lastUpdated) || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              disabled={deleteMutation.isPending}
                              className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            >
                              <TrashIcon
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete segment
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Delete segment &quot;{segment.name}&quot;? This
                                cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  deleteMutation.mutate(segment.id)
                                }
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      {selectedSegment && (
        <div className="w-full space-y-4 lg:w-[360px] lg:shrink-0">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold text-foreground">
              {selectedSegment.name}
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Profiles</p>
                <p
                  className={
                    selectedSegment.size === null
                      ? "text-sm font-medium text-muted-foreground"
                      : "text-xl font-semibold"
                  }
                >
                  {selectedSegment.size === null
                    ? "Resolved on use"
                    : (selectedSegment.size ?? 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email Match</p>
                <p className="text-xl font-semibold text-secondary-foreground">
                  {emailMatch.isLoading
                    ? "—"
                    : emailMatch.isError
                      ? "—"
                      : `${emailMatch.count.toLocaleString()}${
                          emailMatch.isPartial ? "+" : ""
                        }`}
                </p>
              </div>
            </div>
            <div className="mt-4">
              {canSendEmail ? (
                <button
                  onClick={() => openEmailComposer(null)}
                  disabled={emailMatch.isLoading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
                >
                  <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />
                  {emailMatch.isLoading
                    ? "Checking email match…"
                    : "Send Campaign"}
                </button>
              ) : (
                // Wallet-first: no email channel here, so an email campaign
                // has nobody to send to. Point at the channel that does reach
                // them instead of offering a send that would go nowhere.
                <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-3 text-center">
                  <p className="text-sm font-medium text-foreground">
                    No email-reachable members
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    These wallets have no email channel yet — reach them with an
                    in-app push from{" "}
                    <Link
                      href="/automations"
                      className="font-medium text-primary hover:underline"
                    >
                      Automations
                    </Link>
                    .
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
