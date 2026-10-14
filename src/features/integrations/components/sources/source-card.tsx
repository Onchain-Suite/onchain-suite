"use client";

import { CheckCircleIcon } from "@heroicons/react/24/outline";

import { Badge } from "@/components/ui/badge";

import { cn } from "@/lib/utils";

import { LANE_LABEL } from "../../data/sources";
import type { DataSource } from "../../types/sources";
import { FreshChip, SourceMark } from "./source-visuals";

/** One connector in the directory grid. Names who maintains it, because a
 *  connector we own and one the vendor owns fail on different timescales. */
export function SourceCard({
  source,
  onOpen,
}: {
  source: DataSource;
  onOpen: (source: DataSource) => void;
}) {
  const soon = source.status === "soon";
  const connected = source.status === "connected";

  return (
    <button
      type="button"
      onClick={() => onOpen(source)}
      className={cn(
        "flex h-full flex-col gap-2 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-border/80 hover:bg-muted/30",
        soon && "opacity-70"
      )}
    >
      <div className="flex items-start gap-3">
        <SourceMark source={source} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-sm font-medium text-foreground">
            <span className="truncate">{source.name}</span>
            {connected ? (
              <CheckCircleIcon
                aria-hidden="true"
                className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
              />
            ) : null}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            By {source.by ?? "OnchainSuite"}
          </span>
        </span>
        {soon ? (
          <Badge variant="outline" className="shrink-0 text-muted-foreground">
            Soon
          </Badge>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">{source.gives}</p>

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <FreshChip freshness={source.freshness} />
        <span className="text-[11px] text-muted-foreground">
          {LANE_LABEL[source.lane]}
        </span>
      </div>
    </button>
  );
}
