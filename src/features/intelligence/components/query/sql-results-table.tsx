"use client";

import {
  ClipboardDocumentIcon,
  EnvelopeIcon,
  InformationCircleIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion } from "framer-motion";
import { memo, useMemo, useRef } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";

import { isJsonObject } from "@/lib/utils";

import {
  dropFormattedSiblingColumns,
  preferFormattedCell,
} from "@/features/intelligence/utils";

export interface SqlResultsTableProps {
  rows: Array<Record<string, unknown>>;
  columns: string[];
  columnLabels: Map<string, string>;
  selectedRows: string[];
  onToggleAll: () => void;
  onToggleRow: (idx: string) => void;
  onClearSelection: () => void;
  totalRows: number;
  winbackPotential?: string;
  queryId: string | null;
  status: string;
  page: number;
  pageCount: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onSaveReport: () => void;
  onCreateSegment: () => void;
  onCreateCampaign: () => void;
  savePending: boolean;
  segmentPending: boolean;
  campaignPending: boolean;
  onEmail: (email: string) => void;
}

// ISO 8601 date-times (e.g. 2026-07-12T05:55:31.554Z) as returned by the API.
const ISO_TIMESTAMP_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/;

const formatCell = (v: unknown): string => {
  if (typeof v === "string" && ISO_TIMESTAMP_RE.test(v)) {
    const parsed = new Date(v);
    if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleString();
  }
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return "[array]";
  if (isJsonObject(v)) return "[object]";
  return String(v);
};

const ROW_HEIGHT = 45;

/**
 * Virtualized SQL results table. Only the rows in view are rendered (via
 * @tanstack/react-virtual), so a full 500-row result stays cheap. Extracted out
 * of the large query view and memoized so editor keystrokes don't re-render it.
 */
function SqlResultsTableImpl({
  rows,
  columns,
  columnLabels,
  selectedRows,
  onToggleAll,
  onToggleRow,
  onClearSelection,
  totalRows,
  winbackPotential,
  queryId,
  status,
  page,
  pageCount,
  onPrevPage,
  onNextPage,
  onSaveReport,
  onCreateSegment,
  onCreateCampaign,
  savePending,
  segmentPending,
  campaignPending,
  onEmail,
}: SqlResultsTableProps) {
  const cols = useMemo(
    () => dropFormattedSiblingColumns(columns).slice(0, 8),
    [columns]
  );
  const colSpan = cols.length + 2;
  // Give each data column a readable floor so many-column results scroll
  // horizontally inside this container instead of squishing at phone widths.
  // (44px checkbox col + 128px actions col + ~120px per data column.)
  const tableStyle = useMemo(
    () => ({ minWidth: `${44 + 128 + cols.length * 120}px` }),
    [cols.length]
  );

  const parentRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });
  const items = virtualizer.getVirtualItems();
  const total = virtualizer.getTotalSize();
  const paddingTop = items.length > 0 ? items[0].start : 0;
  const paddingBottom =
    items.length > 0 ? total - items[items.length - 1].end : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/30 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-sm font-medium text-foreground">
            {totalRows.toLocaleString()} results
          </span>
          {winbackPotential ? (
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              Win-back potential:{" "}
              <span className="font-medium text-primary">
                {winbackPotential}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="What is win-back potential?"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <InformationCircleIcon
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  Estimated value of re-engaging the dormant contacts in this
                  result - how much activity could be recovered with a win-back
                  campaign.
                </TooltipContent>
              </Tooltip>
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedRows.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              {selectedRows.length} selected
              <button
                type="button"
                onClick={onClearSelection}
                className="ml-2 inline-flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-muted/40"
              >
                <XMarkIcon className="h-3 w-3" aria-hidden="true" />
                Clear
              </button>
            </span>
          ) : null}
          {queryId ? (
            <>
              <button
                type="button"
                onClick={onSaveReport}
                disabled={savePending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40 disabled:opacity-50"
              >
                Save report
              </button>
              <button
                type="button"
                onClick={onCreateSegment}
                disabled={segmentPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:shadow-[0_0_16px_rgba(var(--primary),0.4)] disabled:opacity-50"
              >
                <PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Create segment
              </button>
              <button
                type="button"
                onClick={onCreateCampaign}
                disabled={campaignPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40 disabled:opacity-50"
              >
                <EnvelopeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Create campaign
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div ref={parentRef} className="max-h-[480px] overflow-auto">
        <table className="w-full table-fixed text-sm" style={tableStyle}>
          <colgroup>
            <col className="w-11" />
            {cols.map((c) => (
              <col key={c} />
            ))}
            <col className="w-32" />
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-muted/60 text-left text-xs font-medium text-muted-foreground backdrop-blur">
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={
                    rows.length > 0 && selectedRows.length === rows.length
                  }
                  onChange={onToggleAll}
                />
              </th>
              {cols.map((c) => (
                <th key={c} className="truncate px-4 py-3">
                  {columnLabels.get(c) ?? c}
                </th>
              ))}
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paddingTop > 0 ? (
              <tr style={{ height: paddingTop }}>
                <td colSpan={colSpan} />
              </tr>
            ) : null}
            {items.map((vi) => {
              const idx = vi.index;
              const row = rows[idx];
              const email = typeof row.email === "string" ? row.email : "";
              const key =
                typeof row.id === "string" && row.id.length > 0
                  ? row.id
                  : String(idx);
              return (
                <tr
                  key={key}
                  style={{ height: ROW_HEIGHT }}
                  className="border-b border-border/50 transition-colors hover:bg-muted/50"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(String(idx))}
                      onChange={() => onToggleRow(String(idx))}
                    />
                  </td>
                  {cols.map((c) => (
                    <td
                      key={c}
                      className="truncate px-4 py-3"
                      title={formatCell(preferFormattedCell(row, c))}
                    >
                      {formatCell(preferFormattedCell(row, c))}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      {email.length > 0 ? (
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                          onClick={() => onEmail(email)}
                        >
                          <EnvelopeIcon
                            className="mr-1 inline-block h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          Email
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                        onClick={() =>
                          navigator.clipboard.writeText(
                            JSON.stringify(row, null, 2)
                          )
                        }
                      >
                        <ClipboardDocumentIcon
                          className="mr-1 inline-block h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                        Copy
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {paddingBottom > 0 ? (
              <tr style={{ height: paddingBottom }}>
                <td colSpan={colSpan} />
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {queryId && status === "completed" && pageCount > 1 ? (
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrevPage}
              disabled={page <= 1}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground disabled:opacity-50"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={onNextPage}
              disabled={page >= pageCount}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}

export const SqlResultsTable = memo(SqlResultsTableImpl);
export default SqlResultsTable;
