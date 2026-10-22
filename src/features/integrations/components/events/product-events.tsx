"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { connectionsService } from "../../connections.service";
import { EventsApiPanel } from "../sources/events-api-panel";

const FIRST = 25;
const fmt = new Intl.NumberFormat("en-US");

/**
 * Product events seen in the last 30 days, busiest first (the server caps the
 * catalog at 200). These are the names a Loop's custom-event trigger offers.
 */
export function ProductEvents({ orgId }: { orgId: string | null }) {
  const [all, setAll] = useState(false);
  const query = useQuery({
    queryKey: ["events", "catalog", orgId],
    enabled: Boolean(orgId),
    retry: false,
    staleTime: 5 * 60_000,
    queryFn: () => connectionsService.eventsCatalog(orgId ?? undefined),
  });

  const events = query.data?.events;
  const shown = useMemo(
    () => (all ? events : events?.slice(0, FIRST)) ?? [],
    [all, events]
  );

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    );
  }

  if (query.error) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
        {query.error.message}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="space-y-3 rounded-xl border border-dashed border-border bg-muted/20 p-4">
        <p className="text-sm font-medium text-foreground">
          No product events in the last {query.data?.windowDays ?? 30} days.
        </p>
        <EventsApiPanel />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-border bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
          <span>Event</span>
          <span>Last {query.data?.windowDays ?? 30} days</span>
        </div>
        {shown.map((e) => (
          <div
            key={e.event}
            className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border px-4 py-2.5 last:border-0"
          >
            <code className="truncate text-sm text-foreground">{e.event}</code>
            <span className="text-sm tabular-nums text-muted-foreground">
              {fmt.format(e.count)}
            </span>
          </div>
        ))}
      </div>
      {events.length > FIRST ? (
        <Button size="sm" variant="ghost" onClick={() => setAll((v) => !v)}>
          {all ? "Show fewer" : `Show all ${events.length}`}
        </Button>
      ) : null}
    </div>
  );
}
