"use client";

import {
  ArrowRight01Icon,
  ChartIncreaseIcon,
  Copy01Icon,
  Delete02Icon,
  Edit02Icon,
  HeartCheckIcon,
  MoreHorizontalIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { analyticsService } from "../../analytics.service";
import type { DashboardSummary } from "../../contracts/dashboards";
import {
  chartsLabel,
  DEFAULT_DASHBOARDS,
  type DefaultDashboard,
  headlineFor,
} from "../../utils/gallery";
import { Icon } from "@/shared/components/common/hugeicon";

/*
 * All dashboards, as a gallery (2.7, 7 Nov 2026). Analytics opens here, so it
 * is the front door to the numbers rather than a table. The defaults lead,
 * larger: what each answers, its headline for the last 30 days, a glimpse of
 * the trend, and a way straight into each tab. Dashboards people made follow
 * as cards, and a new one is a card in the same grid, where people look.
 */
export function DashboardGallery({
  dashboards,
  onNew,
  onRename,
  onDuplicate,
  onDelete,
}: {
  dashboards: DashboardSummary[];
  onNew: () => void;
  onRename: (d: DashboardSummary) => void;
  onDuplicate: (d: DashboardSummary) => void;
  onDelete: (d: DashboardSummary) => void;
}) {
  // Same key as Home's report line: one request serves both.
  const overview = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: () => analyticsService.getDashboardOverview(),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
  const own = dashboards.filter((d) => !d.builtIn);
  const trend = (overview.data?.messagesSent.series ?? []).map((p) => p.value);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-2">
        {DEFAULT_DASHBOARDS.map((d) => (
          <DefaultCard
            key={d.id}
            dashboard={d}
            headline={headlineFor(d.id, overview.data)}
            trend={d.id === "growth" ? trend : []}
          />
        ))}
      </div>

      <section aria-labelledby="own-dashboards" className="flex flex-col gap-3">
        <h2
          id="own-dashboards"
          className="text-sm font-semibold text-(--text-primary)"
        >
          Your dashboards
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {own.map((d) => (
            <OwnCard
              key={d.id}
              dashboard={d}
              onRename={() => onRename(d)}
              onDuplicate={() => onDuplicate(d)}
              onDelete={() => onDelete(d)}
            />
          ))}
          <button
            type="button"
            onClick={onNew}
            className="flex min-h-[132px] flex-col items-start justify-center gap-1.5 rounded-xl border border-dashed border-(--border-default) bg-transparent p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon icon={PlusSignIcon} className="size-4" />
            </span>
            <b className="text-sm font-semibold text-(--text-primary)">
              New dashboard
            </b>
            <span className="text-[13px] text-(--text-tertiary)">
              For a team, a launch or a weekly review, from the same measures.
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}

function DefaultCard({
  dashboard,
  headline,
  trend,
}: {
  dashboard: DefaultDashboard;
  headline: { value: string; label: string }[];
  trend: number[];
}) {
  const [first] = dashboard.tabs;
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-(--border-subtle) bg-card shadow-(--elevation-xs)">
      <div className="flex flex-1 flex-col gap-2 p-5">
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
          <Icon
            icon={
              dashboard.id === "growth" ? ChartIncreaseIcon : HeartCheckIcon
            }
            className="size-3"
          />
          Default
        </span>
        <h2 className="text-lg font-semibold tracking-tight text-(--text-primary)">
          {first ? (
            <Link href={`/analytics/${first.id}`} className="hover:underline">
              {dashboard.name}
            </Link>
          ) : (
            dashboard.name
          )}
        </h2>
        <p className="text-[13.5px] leading-relaxed text-(--text-secondary)">
          {dashboard.desc}
        </p>
        {headline.length > 0 ? (
          <p className="text-[13px] text-(--text-secondary)">
            {headline.map((h, i) => (
              <span key={h.label}>
                {i > 0 ? " · " : null}
                <b className="font-semibold text-(--text-primary) tabular-nums">
                  {h.value}
                </b>{" "}
                {h.label}
              </span>
            ))}
            <span className="text-(--text-tertiary)"> · last 30 days</span>
          </p>
        ) : null}
        {dashboard.tabs.length > 1 ? (
          <nav
            aria-label={`${dashboard.name} tabs`}
            className="mt-1 flex flex-wrap gap-1.5"
          >
            {dashboard.tabs.map((t) => (
              <Link
                key={t.id}
                href={`/analytics/${t.id}`}
                className="inline-flex items-center gap-1 rounded-md border border-(--border-subtle) px-2 py-1 text-xs font-medium text-(--text-secondary) transition-colors hover:border-primary/40 hover:text-primary"
              >
                {t.label}
                <Icon icon={ArrowRight01Icon} className="size-3" />
              </Link>
            ))}
          </nav>
        ) : first ? (
          <Link
            href={`/analytics/${first.id}`}
            className="mt-1 inline-flex w-fit items-center gap-1 text-[13px] font-medium text-primary hover:underline"
          >
            Open
            <Icon icon={ArrowRight01Icon} className="size-3.5" />
          </Link>
        ) : null}
      </div>
      {trend.length > 1 ? <Spark values={trend} /> : null}
    </article>
  );
}

/** A small line from a series: a glimpse, decorative; the card says the numbers. */
function Spark({ values }: { values: number[] }) {
  const w = 280;
  const h = 56;
  const hi = Math.max(...values, 1);
  const lo = Math.min(...values);
  const min = Math.max(0, lo - (hi - lo) * 0.6);
  const span = hi - min || 1;
  const points = values.map((v, i) => [
    (i / Math.max(values.length - 1, 1)) * w,
    h - 4 - ((v - min) / span) * (h - 10),
  ]);
  const line = points
    .map(([x, y], i) => `${i ? "L" : "M"}${x?.toFixed(1)} ${y?.toFixed(1)}`)
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className="h-14 w-full text-primary"
    >
      <path
        d={`${line} L${w} ${h} L0 ${h} Z`}
        fill="currentColor"
        opacity={0.08}
      />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function OwnCard({
  dashboard,
  onRename,
  onDuplicate,
  onDelete,
}: {
  dashboard: DashboardSummary;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const created = dashboard.createdAt
    ? new Date(dashboard.createdAt).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;
  return (
    <article className="relative flex min-h-[132px] flex-col gap-1.5 rounded-xl border border-(--border-subtle) bg-card p-4 shadow-(--elevation-xs) transition-[border-color,box-shadow] hover:border-(--border-default) hover:shadow-(--elevation-1)">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/analytics/${dashboard.id}`}
          className="min-w-0 truncate text-sm font-semibold text-(--text-primary) after:absolute after:inset-0 hover:underline"
        >
          {dashboard.name}
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`More for ${dashboard.name}`}
              className="relative z-10 -mt-1 -mr-1 flex size-7 items-center justify-center rounded-md text-(--text-tertiary) hover:bg-(--tint-hover) hover:text-(--text-primary)"
            >
              <Icon icon={MoreHorizontalIcon} className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRename}>
              <Icon icon={Edit02Icon} className="mr-2 size-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Icon icon={Copy01Icon} className="mr-2 size-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Icon icon={Delete02Icon} className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <span className="text-[13px] text-(--text-secondary)">
        {chartsLabel(dashboard.chartCount)}
      </span>
      {created ? (
        <span className="mt-auto text-xs text-(--text-tertiary)">
          Made {created}
        </span>
      ) : null}
    </article>
  );
}
