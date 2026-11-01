"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";

import { cn } from "@/lib/utils";

import {
  type AuditEntry,
  auditService,
} from "@/features/settings/audit.service";
import { SettingsCard } from "@/features/settings/components/settings-card";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

/** Human labels for the area filter chips (ids come from the backend). */
const AREA_LABEL: Record<string, string> = {
  access: "Team and access",
  settings: "Settings",
  billing: "Billing",
  integrations: "Integrations",
  automation: "Loops",
  exports: "Exports",
  contacts: "Contacts",
  lists: "Lists",
  segments: "Segments",
};

function timeAgo(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(then).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

/**
 * Settings → Audit log: every workspace change, who made it and when. Read-only
 * and newest-first, filterable by area. Owner/admin only (the backend 403s
 * otherwise; the page hides the tab for members).
 */
export function AuditLog() {
  const [area, setArea] = useState<string | null>(null);

  const query = useInfiniteQuery({
    queryKey: ["organization", "audit", area ?? "all"],
    queryFn: ({ pageParam }) =>
      auditService.list({
        area: area ?? undefined,
        cursor: pageParam ?? undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const entries: AuditEntry[] = query.data?.pages.flatMap((p) => p.items) ?? [];
  const areas = query.data?.pages[0]?.areas ?? [];

  return (
    <SettingsCard
      title="Audit log"
      description="Every change to the workspace: who made it and when. Read-only and newest first."
    >
      {areas.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <Chip active={area === null} onClick={() => setArea(null)}>
            All
          </Chip>
          {areas.map((a) => (
            <Chip key={a} active={area === a} onClick={() => setArea(a)}>
              {AREA_LABEL[a] ?? a}
            </Chip>
          ))}
        </div>
      ) : null}

      {query.isPending ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <p className="text-sm text-amber-500">
          Couldn&apos;t load the audit log.{" "}
          <button
            type="button"
            onClick={() => query.refetch()}
            className="font-medium text-primary hover:underline"
          >
            Retry
          </button>
        </p>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground">
            No activity recorded yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Changes to the team, settings and access will show up here as they
            happen.
          </p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border/60">
            {entries.map((e) => (
              <li key={e.id} className="flex items-start gap-3 py-3">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary"
                  aria-hidden="true"
                >
                  {initials(e.actorLabel)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{e.actorLabel}</span>{" "}
                    <span className="text-muted-foreground">{e.action}</span>
                    {e.target ? (
                      <>
                        {" "}
                        <span className="font-medium">{e.target.label}</span>
                      </>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {AREA_LABEL[e.area] ?? e.area}
                    <span className="mx-1.5 opacity-50">·</span>
                    {timeAgo(e.at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {query.hasNextPage ? (
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                disabled={query.isFetchingNextPage}
                onClick={() => query.fetchNextPage()}
              >
                {query.isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </SettingsCard>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export default AuditLog;
