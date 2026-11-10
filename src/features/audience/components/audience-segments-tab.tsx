"use client";

import { ChevronRightIcon, PlusIcon } from "@heroicons/react/24/outline";
import { FilterIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

import { formatRelativeTime } from "@/lib/date";

import { AudienceTableSkeleton } from "./audience-table-skeleton";
import {
  type IntelligenceSegment,
  intelligenceService,
} from "@/features/intelligence/intelligence.service";
import { EmptyState } from "@/shared/components/common/empty-state";
import { Icon } from "@/shared/components/common/hugeicon";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

/** Shared query key so the tab count (fetched in the parent) and this body
 *  read the same cached list. */
export const AUDIENCE_SEGMENTS_QUERY_KEY = ["intelligence", "segments", "list"];

/** `listSegments` may return an array or a `{ items }` envelope; normalize. */
export const segmentItems = (data: unknown): IntelligenceSegment[] => {
  if (Array.isArray(data)) return data as IntelligenceSegment[];
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { items?: unknown }).items)
  ) {
    return (data as { items: IntelligenceSegment[] }).items;
  }
  return [];
};

const sizeLabel = (seg: IntelligenceSegment): string => {
  if (typeof seg.matchCount === "number")
    return seg.matchCount.toLocaleString();
  if (typeof seg.size === "number") return seg.size.toLocaleString();
  // Rule-based segments are resolved lazily on use - say so rather than "0".
  return "Resolved on use";
};

/**
 * The Segments tab in Audience: the org's dynamic, rule-based segments (from
 * Intelligence), distinct from Lists (manual / form / CSV memberships). Read
 * oriented - building and editing rules stays in Intelligence, linked from here.
 */
export function AudienceSegmentsTab() {
  const router = useRouter();
  const segmentsQuery = useQuery({
    queryKey: AUDIENCE_SEGMENTS_QUERY_KEY,
    queryFn: () => intelligenceService.listSegments(),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const items = segmentItems(segmentsQuery.data);

  if (segmentsQuery.isLoading) {
    return <AudienceTableSkeleton />;
  }

  if (segmentsQuery.isError) {
    return (
      <p className="rounded-xl border border-border px-5 py-10 text-center text-sm text-amber-500">
        Couldn&apos;t load segments.{" "}
        <button
          type="button"
          onClick={() => segmentsQuery.refetch()}
          className="font-medium text-primary hover:underline"
        >
          Retry
        </button>
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        className="rounded-xl border border-border"
        icon={FilterIcon}
        title="No segments yet"
        description="A segment holds whoever matches its rules today, and updates itself as people start and stop matching. Target it from a campaign or a Loop."
        action={
          <Button asChild size="sm">
            <Link href={PRIVATE_ROUTES.INTELLIGENCE_SEGMENTS}>
              <Icon icon={PlusSignIcon} className="mr-1.5 size-4" />
              New segment
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <p className="text-sm font-medium text-foreground">
          Dynamic segments update themselves as wallets qualify.
        </p>
        <Button asChild variant="outline" size="sm" className="rounded-lg">
          <Link href={PRIVATE_ROUTES.INTELLIGENCE_SEGMENTS}>
            <PlusIcon aria-hidden="true" className="mr-1.5 size-4" />
            New segment
          </Link>
        </Button>
      </div>
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-5 py-3 font-medium">Segment</th>
            <th className="px-4 py-3 text-right font-medium">Size</th>
            <th className="px-4 py-3 font-medium">Updated</th>
            <th className="w-8 py-3" aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {items.map((seg) => (
            <tr
              key={seg.id}
              role="button"
              tabIndex={0}
              onClick={() =>
                router.push(PRIVATE_ROUTES.INTELLIGENCE_SEGMENT(seg.id))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  router.push(PRIVATE_ROUTES.INTELLIGENCE_SEGMENT(seg.id));
              }}
              className="cursor-pointer border-b border-border outline-none last:border-0 hover:bg-muted/40 focus-visible:bg-muted/40"
            >
              <td className="px-5 py-4 font-medium text-foreground">
                {seg.name}
              </td>
              <td className="px-4 py-4 text-right tabular-nums text-foreground">
                {sizeLabel(seg)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">
                {seg.updatedAt ? formatRelativeTime(seg.updatedAt) : "-"}
              </td>
              <td className="py-4 pr-3 text-right">
                <ChevronRightIcon
                  aria-hidden="true"
                  className="ml-auto size-4 text-muted-foreground"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AudienceSegmentsTab;
