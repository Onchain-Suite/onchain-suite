"use client";

import { ArrowLeftIcon, UsersIcon } from "@heroicons/react/24/outline";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import type {
  AudienceSegment,
  AudienceSegmentMember,
} from "../audience.service";
import { audienceService } from "../audience.service";
import { MemberTable, toDetailMemberFromSegment } from "./member-table";

const MEMBERS_PER_PAGE = 25;

/**
 * In-page detail for a single list/segment (reached from the Lists table).
 * Mirrors the reference: back link, a header with contact + email-reachable
 * counts, the ZK-privacy note, and the member table.
 *
 * Members come from `GET /audience/segments/{id}` (paginated); the first page
 * (up to 200) is shown here.
 */
export function AudienceListDetail({
  segment,
  onBack,
}: {
  segment: AudienceSegment;
  onBack: () => void;
}) {
  const [page, setPage] = useState(1);

  const detailQuery = useQuery({
    queryKey: ["audience", "segment-members", segment.id, page],
    queryFn: () =>
      audienceService.getSegment(segment.id, {
        page,
        limit: MEMBERS_PER_PAGE,
      }),
    placeholderData: keepPreviousData,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const members = useMemo(() => {
    const raw = detailQuery.data?.members;
    const list = (raw?.data ?? raw?.items ?? []) as AudienceSegmentMember[];
    return list.map(toDetailMemberFromSegment);
  }, [detailQuery.data]);

  const membersMeta = detailQuery.data?.members?.meta;
  const count =
    detailQuery.data?.count ??
    membersMeta?.totalItems ??
    (typeof segment.count === "number" ? segment.count : members.length);
  const totalPages = Math.max(
    1,
    membersMeta?.totalPages ?? Math.ceil(count / MEMBERS_PER_PAGE)
  );
  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        Back to lists
      </button>

      <div>
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {segment.name}
          </h2>
          <span className="text-sm text-muted-foreground">
            List · {count.toLocaleString()} contact{count === 1 ? "" : "s"}
          </span>
        </div>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Every wallet in this list. Addresses show only for imported contacts -
          ZK-linked emails stay protected, so you can message them without ever
          seeing who they are.
        </p>
      </div>

      {detailQuery.isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading members...
        </div>
      ) : members.length > 0 ? (
        <>
          <MemberTable members={members} />
          {totalPages > 1 ? (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {(page - 1) * MEMBERS_PER_PAGE + 1}–
                {Math.min(page * MEMBERS_PER_PAGE, count)} of{" "}
                {count.toLocaleString()}
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
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <UsersIcon className="size-5" aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm font-semibold text-foreground">
            No members yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Contacts will appear here as they join.
          </p>
        </div>
      )}
    </div>
  );
}
