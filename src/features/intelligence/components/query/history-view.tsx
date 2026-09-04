"use client";

import {
  ArrowUturnLeftIcon,
  ClockIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { cn } from "@/lib/utils";

import type { QueryHistoryItem } from "@/features/intelligence/utils/query-history";

/**
 * Full-surface History view: replaces the chat thread when the tab-row History
 * control is active, so past runs get their own screen instead of a panel under
 * the conversation. Selecting a run replays it (the parent reloads the prompt or
 * re-opens the SQL) and closes the view.
 */
export function HistoryView({
  items,
  chatFill = false,
  onSelect,
  onClose,
}: {
  items: QueryHistoryItem[];
  /** Stretch to fill the chat surface (scroll the list) rather than flow. */
  chatFill?: boolean;
  onSelect: (item: QueryHistoryItem) => void;
  onClose: () => void;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card",
        chatFill && "flex min-h-0 flex-1 flex-col"
      )}
    >
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <ClockIcon
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <span className="flex min-w-0 flex-col">
          <span className="text-sm font-medium text-foreground">History</span>
          <span className="text-xs text-muted-foreground">
            Agent &amp; SQL runs
          </span>
        </span>
        <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {items.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close history"
          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          <XMarkIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-muted-foreground">
          No past runs yet.
        </div>
      ) : (
        <ul
          className={cn(
            "space-y-1.5 overflow-y-auto p-3",
            chatFill ? "min-h-0 flex-1" : "max-h-[520px]"
          )}
        >
          {items.map((it) => {
            const ok = it.status === "completed";
            const failed = it.status === "failed";
            return (
              <li key={it.qid}>
                <button
                  type="button"
                  className="group flex w-full items-start gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-background"
                  onClick={() => onSelect(it)}
                >
                  <span
                    className={cn(
                      "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                      ok
                        ? "bg-emerald-500"
                        : failed
                          ? "bg-rose-500"
                          : "bg-amber-500"
                    )}
                  />
                  <span className="mt-0.5 shrink-0 rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {it.isAgent ? "Agent" : "SQL"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-xs text-foreground">
                      {it.q.replace(/\s+/g, " ").trim()}
                    </span>
                    {it.createdAt ? (
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {new Date(it.createdAt).toLocaleString()}
                      </span>
                    ) : null}
                  </span>
                  <ArrowUturnLeftIcon
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default HistoryView;
