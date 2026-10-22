"use client";

import {
  PencilSquareIcon,
  PlusIcon,
  Squares2X2Icon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

import type { Dashboard } from "../contracts/dashboards";
import type { AnalyticsPeriod } from "../contracts/org-analytics";
import { BUILT_IN } from "../utils/dashboards";

const PERIODS: Array<{ id: AnalyticsPeriod; label: string }> = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
];

/** The built-in tabs (or a custom dashboard's name), the period, and the dashboard actions. */
export function TabBar({
  current,
  period,
  dashboardCount,
  onPeriod,
  onAddChart,
  onNewDashboard,
  onRename,
  onDelete,
}: {
  /** The open dashboard; null on the index. */
  current: Dashboard | null;
  period: AnalyticsPeriod;
  dashboardCount: number;
  onPeriod: (p: AnalyticsPeriod) => void;
  onAddChart: (() => void) | null;
  onNewDashboard: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const custom = current && !current.builtIn;
  return (
    <nav className="an-tabs" aria-label="Analytics views">
      {custom ? (
        <>
          <span className="an-tab__name">{current.name}</span>
          <button type="button" className="an-tab__own" onClick={onRename}>
            <PencilSquareIcon aria-hidden="true" />
            Rename
          </button>
          <button
            type="button"
            className="an-tab__own an-tab__own--del"
            onClick={onDelete}
          >
            <TrashIcon aria-hidden="true" />
            Delete
          </button>
        </>
      ) : (
        BUILT_IN.map((t) => (
          <Link
            key={t.id}
            href={`/analytics/${t.id}`}
            aria-current={current?.id === t.id ? "page" : undefined}
            className={`an-tab${current?.id === t.id ? " is-on" : ""}`}
          >
            {t.name}
          </Link>
        ))
      )}
      <div className="an-tabs__right">
        {current ? (
          <select
            className="an-period"
            aria-label="Period"
            value={period}
            onChange={(e) => onPeriod(e.target.value as AnalyticsPeriod)}
          >
            {PERIODS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        ) : null}
        {onAddChart ? (
          <button type="button" className="an-tabs__btn" onClick={onAddChart}>
            <PlusIcon aria-hidden="true" />
            Add a chart
          </button>
        ) : null}
        <button type="button" className="an-tabs__btn" onClick={onNewDashboard}>
          <PlusIcon aria-hidden="true" />
          New dashboard
        </button>
        <Link href="/analytics/all" className="an-tabs__btn">
          <Squares2X2Icon aria-hidden="true" />
          All dashboards <i>{dashboardCount}</i>
        </Link>
      </div>
    </nav>
  );
}
