"use client";

import {
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { isJsonObject } from "@/lib/utils";

import {
  automationService,
  type AutomationsListParams,
} from "../automation.service";
import { useDeleteAutomation } from "../hooks/use-automations";
import { ContractAddressNudge } from "@/features/settings/components/contract-address-nudge";
import { PageHeader } from "@/shared/components/page/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";

type Status = "active" | "paused" | "draft";

interface Row {
  id: string;
  name: string;
  triggerLabel: string;
  status: Status;
  entries: number;
  conversions: number;
  lastTriggered: string;
}

const asString = (v: unknown) => (typeof v === "string" ? v : "");
const asNumber = (v: unknown) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const pick = (res: unknown): unknown[] => {
  if (Array.isArray(res)) return res;
  if (isJsonObject(res)) {
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res.data)) return res.data;
  }
  return [];
};

/** Read the backend's total-item count from a paginated response's `meta`.
 *  Undefined when the endpoint returns a bare array / omits meta - the UI then
 *  falls back to page-relative controls. */
const readTotal = (res: unknown): number | undefined => {
  if (isJsonObject(res) && isJsonObject(res.meta)) {
    const m = res.meta as Record<string, unknown>;
    const t = m.totalItems ?? m.total;
    if (typeof t === "number" && Number.isFinite(t)) return t;
  }
  return undefined;
};

const humanizeTrigger = (type: string) => {
  if (!type || type === "onchain") return "On-chain event";
  return type.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());
};

const toRow = (input: unknown): Row | null => {
  if (!isJsonObject(input)) return null;
  const id =
    asString(input.id) ||
    asString(input.automationId) ||
    asString(input.automation_id);
  if (!id) return null;
  const trigger = isJsonObject(input.trigger) ? input.trigger : {};
  const type =
    asString(trigger.type) || asString(input.triggerType) || "onchain";
  const event = asString(trigger.event) || asString(input.triggerEvent);
  let triggerLabel = humanizeTrigger(type);
  if (event && event !== "-" && event.toLowerCase() !== "any event") {
    triggerLabel += ` · ${event}`;
  }
  const rawStatus = asString(input.status);
  const status: Status =
    rawStatus === "active"
      ? "active"
      : rawStatus === "paused"
        ? "paused"
        : "draft";
  return {
    id,
    name: asString(input.name) || "Untitled automation",
    triggerLabel,
    status,
    entries: asNumber(input.entries ?? input.entryCount),
    conversions: asNumber(input.conversions ?? input.conversionCount),
    lastTriggered: asString(
      input.lastTriggered ?? input.last_triggered ?? input.updatedAt
    ),
  };
};

/** Format an ISO/relative timestamp into a compact "12 min ago" label. */
const relativeTime = (value: string): string => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const diffMs = Date.now() - parsed.getTime();
  if (diffMs < 0) return "just now";
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return parsed.toLocaleDateString();
};

const STATUS_TABS: { id: "all" | Status; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "paused", label: "Paused" },
  { id: "draft", label: "Draft" },
];

const statusPill: Record<Status, string> = {
  active: "text-emerald-500",
  paused: "text-amber-500",
  draft: "text-muted-foreground",
};

const PER_PAGE = 10;

export function AutomationsListView() {
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const deleteAutomation = useDeleteAutomation(() => setPendingDelete(null));

  // Debounce the search so we don't fire a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Any filter/search change starts back at page 1.
  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  // Server-side page: the backend does the filtering + slicing. Search uses the
  // dedicated /automations/search endpoint (status tabs don't apply mid-search);
  // otherwise the status/tab param drives it. keepPreviousData avoids a flash
  // between pages.
  const listQuery = useQuery({
    queryKey: ["automations", "list", { filter, search, page }],
    queryFn: () => {
      if (search) {
        return automationService.searchAutomations({
          q: search,
          page,
          limit: PER_PAGE,
        });
      }
      const params: AutomationsListParams = { page, limit: PER_PAGE };
      if (filter === "draft") params.tab = "drafts";
      else if (filter !== "all") params.status = filter;
      return automationService.listAutomations(params);
    },
    placeholderData: keepPreviousData,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const rows = useMemo(
    () =>
      pick(listQuery.data)
        .map(toRow)
        .filter((r): r is Row => r !== null),
    [listQuery.data]
  );
  const total = useMemo(() => readTotal(listQuery.data), [listQuery.data]);
  const totalPages =
    total !== undefined ? Math.max(1, Math.ceil(total / PER_PAGE)) : undefined;
  const hasPrev = page > 1;
  // When the backend reports a total we page by it; otherwise a full page is a
  // signal there may be more.
  const hasNext =
    totalPages !== undefined ? page < totalPages : rows.length >= PER_PAGE;

  // Stat cards from the org-wide metrics aggregate (server-side, not derived
  // from the current page).
  const metricsQuery = useQuery({
    queryKey: ["automations", "metrics"],
    queryFn: () => automationService.getMetrics(),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
  const m = metricsQuery.data;
  const statCards = [
    { label: "Active flows", value: m ? m.active.toLocaleString() : "-" },
    { label: "Entries · 30d", value: m ? m.entries.toLocaleString() : "-" },
    {
      label: "Avg completion",
      value: m
        ? `${(m.entries > 0 ? (m.conversions / m.entries) * 100 : 0).toFixed(1)}%`
        : "-",
    },
    {
      label: "On-chain conversions",
      value: m ? m.conversions.toLocaleString() : "-",
    },
  ];

  // Per-status counts for the tab chips - one cheap meta read per status (the
  // list endpoint's total), cached. Hidden gracefully if the backend omits the
  // total. Independent of the search term (counts are global).
  const countsQuery = useQuery({
    queryKey: ["automations", "counts"],
    queryFn: async () => {
      const totalFor = (p: AutomationsListParams) =>
        automationService
          .listAutomations({ ...p, page: 1, limit: 1 })
          .then(readTotal)
          .catch(() => undefined);
      const [all, active, paused, draft] = await Promise.all([
        totalFor({}),
        totalFor({ status: "active" }),
        totalFor({ status: "paused" }),
        totalFor({ tab: "drafts" }),
      ]);
      return { all, active, paused, draft };
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
  const counts = countsQuery.data;
  const countFor = (id: "all" | Status): number | undefined =>
    id === "all"
      ? counts?.all
      : id === "active"
        ? counts?.active
        : id === "paused"
          ? counts?.paused
          : counts?.draft;

  const showingFrom = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const showingTo =
    total !== undefined
      ? Math.min(page * PER_PAGE, total)
      : (page - 1) * PER_PAGE + rows.length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title="Automations"
        actions={
          <Button asChild>
            <Link href="/automations/new">
              <PlusIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
              New automation
            </Link>
          </Button>
        }
      />

      <ContractAddressNudge context="automation" />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/60 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-card px-5 py-4">
            <div className="text-sm text-muted-foreground">{card.label}</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {metricsQuery.isLoading ? "-" : card.value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search automations…"
          className="h-9 w-64 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => {
            const active = filter === tab.id;
            const c = countFor(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                aria-pressed={active}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {typeof c === "number" ? (
                  <span
                    className={
                      active
                        ? "ml-1.5 text-primary"
                        : "ml-1.5 text-muted-foreground/70"
                    }
                  >
                    · {c}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3">Automation</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Entries · 30d</th>
                <th className="px-4 py-3 text-right">Completed</th>
                <th className="px-4 py-3 text-right">Conversions</th>
                <th className="px-4 py-3 text-right">Last triggered</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const hasData = row.entries > 0;
                const completion = hasData
                  ? `${((row.conversions / row.entries) * 100).toFixed(1)}%`
                  : "-";
                return (
                  <tr
                    key={row.id}
                    className="group border-b border-border transition-colors last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-5 py-4">
                      <Link href={`/automations/${row.id}`} className="block">
                        <div className="font-medium text-foreground">
                          {row.name}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {row.triggerLabel}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium capitalize ${statusPill[row.status]}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums text-foreground">
                      {hasData ? row.entries.toLocaleString() : "-"}
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums text-foreground">
                      {completion}
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums text-foreground">
                      {hasData ? row.conversions.toLocaleString() : "-"}
                    </td>
                    <td className="px-4 py-4 text-right text-muted-foreground">
                      {hasData ? relativeTime(row.lastTriggered) : "-"}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setPendingDelete(row)}
                          aria-label={`Delete ${row.name}`}
                          title="Delete automation"
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <TrashIcon aria-hidden="true" className="h-4 w-4" />
                        </button>
                        <Link
                          href={`/automations/${row.id}`}
                          aria-label={`Open ${row.name}`}
                          className="inline-flex text-muted-foreground transition-colors group-hover:text-foreground"
                        >
                          <ChevronRightIcon
                            aria-hidden="true"
                            className="h-4 w-4"
                          />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {hasPrev || hasNext ? (
          <div className="flex items-center justify-between pt-4 text-sm text-muted-foreground">
            <span>
              {total !== undefined ? (
                <>
                  Showing {showingFrom.toLocaleString()}–
                  {showingTo.toLocaleString()} of {total.toLocaleString()}
                </>
              ) : (
                <>Page {page}</>
              )}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg"
                disabled={!hasPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg"
                disabled={!hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}

        {!listQuery.isLoading && rows.length === 0 ? (
          <div className="rounded-xl border border-border px-5 py-16 text-center">
            <p className="text-sm font-semibold text-foreground">
              {search || filter !== "all"
                ? "No matching automations"
                : "No automations yet"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {search || filter !== "all"
                ? "Try a different search or filter."
                : "Create your first automation to trigger personalized flows."}
            </p>
          </div>
        ) : null}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteAutomation.isPending) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete automation?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes{" "}
              <span className="font-medium text-foreground">
                {pendingDelete?.name}
              </span>{" "}
              and stops all of its active triggers. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAutomation.isPending}>
              Keep automation
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteAutomation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete) deleteAutomation.mutate(pendingDelete.id);
              }}
            >
              {deleteAutomation.isPending ? "Deleting…" : "Delete automation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AutomationsListView;
