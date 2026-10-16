"use client";

import {
  ChatBubbleLeftRightIcon,
  CodeBracketIcon,
  PresentationChartLineIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";

import { isJsonObject } from "@/lib/utils";

import { intelligenceService } from "../../intelligence.service";
import { ReportView } from "../query/report-view";

const asNumber = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length > 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const asString = (v: unknown): string => (typeof v === "string" ? v : "");

const formatDate = (v: unknown): string => {
  const raw = asString(v);
  if (raw.length > 0) return raw;
  const n = asNumber(v);
  if (n === null) return "-";
  const d = new Date(n);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
};

// A query saved via POST /intelligence/query/{queryId}/save ("Save Report" in
// the agent chat / SQL editor). The documented surface for saved runs is
// GET /intelligence/query/history, where saving writes the report `name` onto
// the run's history row. Rows without a name are ordinary (unsaved) runs.
export type SavedQueryReport = {
  queryId: string;
  name: string;
  /** SQL text for SQL runs, the prompt for agent runs; "" when omitted. */
  query: string;
  isAgent: boolean;
  savedAt: string;
  summary: string;
};

const toSavedQueryReport = (input: unknown): SavedQueryReport | null => {
  if (!isJsonObject(input)) return null;
  const r = input as Record<string, unknown>;
  const name = asString(r.name).trim();
  if (name.length === 0) return null;
  const queryId = asString(r.queryId) || asString(r.id);
  if (queryId.length === 0) return null;
  const provider = asString(r.provider).toLowerCase();
  return {
    queryId,
    name,
    query: asString(r.query),
    // Backend `provider` is now "alchemy"/"agent"; older saved runs still read
    // "goldrush"/"mcp". Match all so re-run routes to chat vs SQL correctly.
    isAgent:
      provider.includes("agent") ||
      provider.includes("alchemy") ||
      provider.includes("goldrush") ||
      provider.includes("mcp"),
    savedAt: formatDate(r.createdAt ?? r.timestamp ?? r.updatedAt),
    summary: asString(r.resultSummary) || asString(r.summary),
  };
};

interface ReportsTabProps {
  /**
   * Re-open the selected report's source: SQL runs load into the SQL editor
   * (results refetched by queryId), agent runs pre-fill the chat composer.
   */
  onOpenSavedQuery?: (item: SavedQueryReport) => void;
}

/**
 * One unified reports surface: pick any saved query, see its charts, stats,
 * and CSV export inline. Saving happens in the SQL editor / chat ("Save
 * report"); this tab only visualizes.
 */
export function ReportsTab({ onOpenSavedQuery }: ReportsTabProps = {}) {
  // Keyed under ["intelligence","reports",…] - not the chat's history key -
  // so the save mutation's invalidation of ["intelligence","reports"] makes a
  // fresh save visible the moment this tab mounts, despite the 5-minute
  // global staleTime.
  const savedQueriesQuery = useQuery({
    queryKey: ["intelligence", "reports", "saved-queries"],
    queryFn: async () => {
      const res = await intelligenceService.getQueryHistory();
      const items = Array.isArray(res)
        ? res
        : ((res as { items?: unknown[] }).items ?? []);
      return (Array.isArray(items) ? items : [])
        .map(toSavedQueryReport)
        .filter((r): r is SavedQueryReport => !!r);
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const saved = savedQueriesQuery.data ?? [];
  const [selectedQueryId, setSelectedQueryId] = useState("");
  const effectiveQueryId =
    selectedQueryId.length > 0 ? selectedQueryId : (saved[0]?.queryId ?? "");
  const selected = saved.find((item) => item.queryId === effectiveQueryId);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Reports</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Charts and stats for any saved query.
          </p>
        </div>
        {saved.length > 0 ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={effectiveQueryId} onValueChange={setSelectedQueryId}>
              <SelectTrigger
                className="w-full sm:w-72"
                aria-label="Choose a report"
              >
                <SelectValue placeholder="Choose a report" />
              </SelectTrigger>
              <SelectContent>
                {saved.map((item) => (
                  <SelectItem key={item.queryId} value={item.queryId}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {onOpenSavedQuery && selected ? (
              <button
                type="button"
                onClick={() => onOpenSavedQuery(selected)}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted/40"
              >
                {selected.isAgent ? (
                  <ChatBubbleLeftRightIcon
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                ) : (
                  <CodeBracketIcon className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {selected.isAgent ? "Re-run in chat" : "Open in SQL"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        {savedQueriesQuery.isPending ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Loading reports…
          </div>
        ) : saved.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground">
              <PresentationChartLineIcon
                className="h-5 w-5"
                aria-hidden="true"
              />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">
              No reports yet
            </h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Run a query in the SQL editor or the chat, then hit “Save report”
              - its charts will show up here.
            </p>
          </div>
        ) : effectiveQueryId ? (
          <ReportView queryId={effectiveQueryId} compact />
        ) : null}
      </div>
    </div>
  );
}
