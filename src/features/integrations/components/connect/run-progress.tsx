"use client";

import { ArrowPathIcon, StopIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";

import type { RunStatus } from "../../hooks/use-paged-run";

export interface RunStat {
  label: string;
  value: number;
}

const fmt = new Intl.NumberFormat("en-US");

/**
 * The running tally of a long operation (migration, sync, member import) with
 * a Stop control while it runs and the outcome once it ends.
 */
export function RunProgress({
  status,
  stats,
  running,
  done,
  error,
  notes,
  onStop,
}: {
  status: RunStatus;
  stats: RunStat[];
  /** e.g. "Importing from Mailchimp…" */
  running: string;
  /** e.g. "Done. Contacts landed in "Imported from Mailchimp"." */
  done: string;
  error: string | null;
  notes?: string[];
  onStop?: () => void;
}) {
  if (status === "idle") return null;
  return (
    <div
      className="space-y-3 rounded-lg border border-border bg-muted/20 p-3"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-sm">
        {status === "running" ? (
          <ArrowPathIcon
            aria-hidden="true"
            className="size-4 animate-spin text-muted-foreground"
          />
        ) : null}
        <span className="min-w-0 flex-1 text-foreground">
          {status === "running"
            ? running
            : status === "stopped"
              ? "Stopped. What came across so far stays; run it again to carry on."
              : status === "error"
                ? "It didn't finish."
                : done}
        </span>
        {status === "running" && onStop ? (
          <Button size="sm" variant="outline" onClick={onStop}>
            <StopIcon aria-hidden="true" className="mr-1.5 size-4" />
            Stop
          </Button>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd className="text-sm font-medium tabular-nums text-foreground">
              {fmt.format(s.value)}
            </dd>
          </div>
        ))}
      </dl>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {notes && notes.length > 0 ? (
        <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
