"use client";

import { ChevronRightIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

import { isJsonObject } from "@/lib/utils";

import { automationService } from "../automation.service";
import { PageHeader } from "@/shared/components/page/page-header";
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
  if (event && event !== "—" && event.toLowerCase() !== "any event") {
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
  if (!value) return "—";
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

export function AutomationsListView() {
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [search, setSearch] = useState("");

  const listQuery = useQuery({
    queryKey: ["automations", "list-all"],
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const [active, paused, drafts] = await Promise.all([
        automationService.listAutomations({ status: "active" }).catch(() => []),
        automationService.listAutomations({ status: "paused" }).catch(() => []),
        automationService.listAutomations({ tab: "drafts" }).catch(() => []),
      ]);
      const byId = new Map<string, Row>();
      for (const raw of [...pick(active), ...pick(paused), ...pick(drafts)]) {
        const row = toRow(raw);
        if (row && !byId.has(row.id)) byId.set(row.id, row);
      }
      return [...byId.values()];
    },
  });

  const rows = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      active: rows.filter((r) => r.status === "active").length,
      paused: rows.filter((r) => r.status === "paused").length,
      draft: rows.filter((r) => r.status === "draft").length,
    }),
    [rows]
  );

  const stats = useMemo(() => {
    const withEntries = rows.filter((r) => r.entries > 0);
    const entries = rows.reduce((sum, r) => sum + r.entries, 0);
    const conversions = rows.reduce((sum, r) => sum + r.conversions, 0);
    const avgCompletion =
      withEntries.length > 0
        ? withEntries.reduce(
            (sum, r) => sum + (r.conversions / r.entries) * 100,
            0
          ) / withEntries.length
        : 0;
    return {
      activeFlows: counts.active,
      entries,
      avgCompletion,
      conversions,
    };
  }, [rows, counts.active]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (q && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, filter, search]);

  const statCards = [
    { label: "Active flows", value: stats.activeFlows.toLocaleString() },
    { label: "Entries · 30d", value: stats.entries.toLocaleString() },
    { label: "Avg completion", value: `${stats.avgCompletion.toFixed(1)}%` },
    {
      label: "On-chain conversions",
      value: stats.conversions.toLocaleString(),
    },
  ];

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

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/60 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-card px-5 py-4">
            <div className="text-sm text-muted-foreground">{card.label}</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {listQuery.isLoading ? "—" : card.value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search automations…"
          className="h-9 w-64 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => {
            const active = filter === tab.id;
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
                {tab.label} · {counts[tab.id]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
              {visibleRows.map((row) => {
                const hasData = row.entries > 0;
                const completion = hasData
                  ? `${((row.conversions / row.entries) * 100).toFixed(1)}%`
                  : "—";
                return (
                  <tr
                    key={row.id}
                    className="group border-b border-border/40 last:border-0 transition-colors hover:bg-muted/40"
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
                      {hasData ? row.entries.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums text-foreground">
                      {completion}
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums text-foreground">
                      {hasData ? row.conversions.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-4 text-right text-muted-foreground">
                      {hasData ? relativeTime(row.lastTriggered) : "—"}
                    </td>
                    <td className="px-4 py-4 text-right">
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!listQuery.isLoading && visibleRows.length === 0 ? (
          <div className="px-5 py-16 text-center">
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
    </div>
  );
}

export default AutomationsListView;
