"use client";

import {
  ArrowRight01Icon,
  Copy01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

import {
  LOOP_STATUS_LABEL,
  type LoopRow,
  type LoopStatus,
  relativeTime,
} from "../utils/loop-rows";
import { Icon } from "@/shared/components/common/hugeicon";

const BADGE: Record<LoopStatus, string> = {
  active:
    "border-(--status-success-border) bg-(--status-success-bg) text-(--status-success-text)",
  paused:
    "border-(--status-warning-border) bg-(--status-warning-bg) text-(--status-warning-text)",
  draft: "border-(--border-subtle) bg-card text-(--text-secondary)",
};

export function LoopStatusBadge({ status }: { status: LoopStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        BADGE[status]
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {LOOP_STATUS_LABEL[status]}
    </span>
  );
}

const TH = "px-4 py-3 text-xs font-medium text-(--text-tertiary)";
const TD = "px-4 py-3.5";

// Hidden until the row is hovered or focused; always shown where there is no
// hover to reveal them (touch).
const ROW_ACTION =
  "rounded-md p-1 text-(--text-tertiary) opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed [@media(hover:none)]:opacity-100";

/**
 * The Loops list (2.7 columns). A row opens its Loop: click, or J/K to reach
 * it and Enter. Duplicate and Delete stay on the row, behind their own buttons.
 */
export function LoopsTable({
  rows,
  onDuplicate,
  onDelete,
  duplicatingId = null,
}: {
  rows: LoopRow[];
  onDuplicate: (row: LoopRow) => void;
  onDelete: (row: LoopRow) => void;
  /** The Loop being copied right now, so it cannot be copied twice. */
  duplicatingId?: string | null;
}) {
  const router = useRouter();
  const open = (id: string) => router.push(`/automations/${id}`);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-(--border-subtle) bg-(--bg-shell)/40 text-left">
            <th className={cn(TH, "pl-5")}>Loop</th>
            <th className={TH}>Status</th>
            <th className={cn(TH, "text-right")}>Entered, 30 days</th>
            <th className={cn(TH, "text-right")}>Completed</th>
            <th
              className={cn(TH, "text-right")}
              title="People who converted after a message from the Loop"
            >
              Converted
            </th>
            <th className={cn(TH, "text-right")}>Last triggered</th>
            <th className="w-28 px-4 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            // Entries include double-opt-in confirmations still pending: they
            // become entries on confirm, so the figure reconciles with Forms.
            const entered = row.entries + row.optInEmailsSent;
            const ran = entered > 0;
            return (
              <tr
                key={row.id}
                tabIndex={0}
                onClick={() => open(row.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.target === e.currentTarget)
                    open(row.id);
                }}
                className="group cursor-pointer border-b border-(--border-subtle) transition-colors last:border-0 hover:bg-(--tint-hover) focus-visible:bg-(--tint-hover) focus-visible:outline-none"
              >
                <td className={cn(TD, "pl-5")}>
                  <Link
                    href={`/automations/${row.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="block font-medium text-(--text-primary)"
                  >
                    {row.name}
                  </Link>
                  <span className="mt-0.5 block text-xs text-(--text-tertiary)">
                    {row.triggerLabel}
                  </span>
                </td>
                <td className={TD}>
                  <LoopStatusBadge status={row.status} />
                </td>
                <td className={cn(TD, "text-right tabular-nums")}>
                  {ran ? entered.toLocaleString() : "-"}
                </td>
                <td className={cn(TD, "text-right tabular-nums")}>
                  {/* Completion (reached the end of the flow), not conversion. */}
                  {ran ? `${row.completionRate.toFixed(1)}%` : "-"}
                </td>
                <td className={cn(TD, "text-right tabular-nums")}>
                  {ran ? row.conversions.toLocaleString() : "-"}
                </td>
                <td className={cn(TD, "text-right text-(--text-secondary)")}>
                  {ran ? relativeTime(row.lastTriggered) : "Never"}
                </td>
                <td className={cn(TD, "text-right")}>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      disabled={duplicatingId !== null}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate(row);
                      }}
                      aria-label={`Duplicate ${row.name}`}
                      title="Duplicate Loop"
                      className={cn(
                        ROW_ACTION,
                        "hover:bg-(--tint-hover) hover:text-(--text-primary)",
                        duplicatingId === row.id && "opacity-100"
                      )}
                    >
                      <Icon icon={Copy01Icon} className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(row);
                      }}
                      aria-label={`Delete ${row.name}`}
                      title="Delete Loop"
                      className={cn(
                        ROW_ACTION,
                        "hover:bg-destructive/10 hover:text-destructive"
                      )}
                    >
                      <Icon icon={Delete02Icon} className="size-4" />
                    </button>
                    <Icon
                      icon={ArrowRight01Icon}
                      className="size-4 text-(--text-tertiary)"
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
