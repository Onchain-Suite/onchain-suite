"use client";

import {
  ArrowPathIcon,
  ChevronDownIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { memo, useState } from "react";

import { cn } from "@/lib/utils";

import type { BuilderIssue } from "@/features/automation/utils/builder-issues";

interface BuilderIssuesPanelProps {
  issues: BuilderIssue[];
  /** Human name of the step an issue points at, for issues that carry a nodeId. */
  labelForNode: (nodeId: string) => string;
  /** Select + centre the step on the canvas so the fix is one click away. */
  onFocusNode: (nodeId: string) => void;
  /** Re-run the backend validation pass. */
  onRecheck: () => void;
  checking?: boolean;
  /** The graph changed since the backend last checked it. */
  stale?: boolean;
}

const SEVERITY_STYLES = {
  error: {
    row: "border-red-500/30 bg-red-500/5 hover:border-red-500/50",
    icon: "text-red-500",
  },
  warning: {
    row: "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50",
    icon: "text-amber-500",
  },
} as const;

/**
 * The builder's "what's wrong and where" list. It exists because the backend
 * rejects a graph with a single opaque line ("Automation builder graph is
 * invalid"); every issue here names the offending step and jumps to it.
 */
export const BuilderIssuesPanel = memo(function BuilderIssuesPanel({
  issues,
  labelForNode,
  onFocusNode,
  onRecheck,
  checking = false,
  stale = false,
}: BuilderIssuesPanelProps) {
  const [open, setOpen] = useState(true);

  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  // Rendered only when there is something to say - a panel announcing
  // "0 issues" is noise, and the header badge already carries the clean state.
  if (issues.length === 0) return null;

  return (
    <section
      aria-label="Automation issues"
      className={cn(
        "rounded-xl border bg-card",
        errors.length > 0 ? "border-red-500/30" : "border-amber-500/30"
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          {errors.length > 0 ? (
            <ExclamationCircleIcon
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-red-500"
            />
          ) : (
            <ExclamationTriangleIcon
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-amber-500"
            />
          )}
          <span className="min-w-0 truncate text-sm font-medium text-foreground">
            {[
              errors.length > 0
                ? `${errors.length} ${errors.length === 1 ? "issue blocks" : "issues block"} go-live`
                : "",
              warnings.length > 0
                ? `${warnings.length} ${warnings.length === 1 ? "warning" : "warnings"}`
                : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
          {stale ? (
            <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Graph changed
            </span>
          ) : null}
          <ChevronDownIcon
            aria-hidden="true"
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open ? "" : "-rotate-90"
            )}
          />
        </button>

        <button
          type="button"
          onClick={onRecheck}
          disabled={checking}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
        >
          <ArrowPathIcon
            aria-hidden="true"
            className={cn("h-3.5 w-3.5", checking ? "animate-spin" : "")}
          />
          {checking ? "Checking…" : "Re-check"}
        </button>
      </div>

      {open ? (
        <ul className="space-y-1.5 border-t border-border px-3 py-3">
          {issues.map((issue) => {
            const styles = SEVERITY_STYLES[issue.severity];
            const stepName = issue.nodeId ? labelForNode(issue.nodeId) : "";
            const Icon =
              issue.severity === "error"
                ? ExclamationCircleIcon
                : ExclamationTriangleIcon;
            const body = (
              <>
                <Icon
                  aria-hidden="true"
                  className={cn("mt-0.5 h-4 w-4 shrink-0", styles.icon)}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {stepName || "Whole flow"}
                    </span>
                    {issue.code && !issue.code.startsWith("local.") ? (
                      <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {issue.code}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-sm text-foreground">
                    {issue.message}
                  </span>
                  {issue.hint ? (
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {issue.hint}
                    </span>
                  ) : null}
                </span>
                {issue.nodeId ? (
                  <span className="shrink-0 self-center text-xs font-medium text-primary">
                    Fix
                  </span>
                ) : null}
              </>
            );

            return (
              <li key={issue.id}>
                {issue.nodeId ? (
                  <button
                    type="button"
                    onClick={() => onFocusNode(issue.nodeId as string)}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
                      styles.row
                    )}
                  >
                    {body}
                  </button>
                ) : (
                  <div
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2",
                      styles.row
                    )}
                  >
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
});
