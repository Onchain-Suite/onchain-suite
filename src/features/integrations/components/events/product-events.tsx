"use client";

import { SourceCodeIcon } from "@hugeicons/core-free-icons";

import { Skeleton } from "@/components/ui/skeleton";

import type { EventsCatalog } from "../../contracts/connections";
import { EventsApiPanel } from "../sources/events-api-panel";
import { EventsPane } from "./events-pane";
import { EventsEmpty, EventsRow, EventsTable } from "./events-table";

const fmt = new Intl.NumberFormat("en-US");

/**
 * Product events seen in the catalog's window, busiest first (the server caps
 * the list at 200). These are the names a Loop's custom-event trigger offers.
 * The whole list is shown: the table scrolls inside its own box.
 */
export function ProductEvents({
  catalog,
  isLoading,
  error,
}: {
  catalog: EventsCatalog | undefined;
  isLoading: boolean;
  error: string | null;
}) {
  const days = catalog?.windowDays ?? 30;
  const events = catalog?.events ?? [];
  return (
    <EventsPane
      icon={SourceCodeIcon}
      title="Product events"
      blurb="What customers do in your own app, sent through the SDK or the events API. The other half of every segment that crosses both lanes."
    >
      {isLoading ? (
        <div className="flex flex-col gap-2" aria-hidden="true">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ) : error ? (
        <EventsEmpty>{error}</EventsEmpty>
      ) : events.length === 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-(--border-default) p-4 md:overflow-y-auto">
          <p className="text-sm font-medium text-(--text-primary)">
            No product events in the last {days} days.
          </p>
          <EventsApiPanel />
        </div>
      ) : (
        <EventsTable
          columns="minmax(0,1fr) auto"
          head={
            <>
              <span>Event</span>
              <span>Last {days} days</span>
            </>
          }
        >
          {events.map((e) => (
            <EventsRow key={e.event}>
              <code className="truncate font-mono text-[13px] text-(--text-primary)">
                {e.event}
              </code>
              <span className="text-right tabular-nums">
                {fmt.format(e.count)}
              </span>
            </EventsRow>
          ))}
        </EventsTable>
      )}
    </EventsPane>
  );
}
