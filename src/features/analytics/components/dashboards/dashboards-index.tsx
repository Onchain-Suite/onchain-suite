"use client";

import Link from "next/link";
import { useState } from "react";

import type { DashboardSummary } from "../../contracts/dashboards";

/** Every dashboard: the built-in tabs, then the ones people made. */
export function DashboardsIndex({
  dashboards,
  onRename,
  onDuplicate,
  onDelete,
}: {
  dashboards: DashboardSummary[];
  onRename: (d: DashboardSummary) => void;
  onDuplicate: (d: DashboardSummary) => void;
  onDelete: (d: DashboardSummary) => void;
}) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const builtInCharts = dashboards
    .filter((d) => d.builtIn)
    .reduce((s, d) => s + d.chartCount, 0);
  const custom = dashboards.filter(
    (d) => !d.builtIn && d.name.toLowerCase().includes(term)
  );
  const showDefault = !term || "dashboard analytics".includes(term);

  return (
    <div className="an-dash">
      <div className="an-dash__bar">
        <p>
          The default dashboard has four tabs. Make your own for a team, a
          launch or a weekly review.
        </p>
        <input
          className="an-dash__search"
          aria-label="Search dashboards"
          placeholder="Search dashboards"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <table className="an-dash__table">
        <thead>
          <tr>
            <th scope="col">Dashboard</th>
            <th scope="col">Charts</th>
            <th scope="col">Created</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {showDefault ? (
            <tr>
              <td>
                <Link href="/analytics/overview">Dashboard</Link>
              </td>
              <td>
                4 tabs
                {builtInCharts ? ` · ${builtInCharts} of your charts` : ""}
              </td>
              <td>Default</td>
              <td />
            </tr>
          ) : null}
          {custom.map((d) => (
            <tr key={d.id}>
              <td>
                <Link href={`/analytics/${d.id}`}>{d.name}</Link>
              </td>
              <td>
                {d.chartCount === 0
                  ? "No charts yet"
                  : `${d.chartCount} chart${d.chartCount === 1 ? "" : "s"}`}
              </td>
              <td>
                {d.createdAt
                  ? new Date(d.createdAt).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "–"}
              </td>
              <td>
                <div className="an-dash__acts">
                  <button type="button" onClick={() => onRename(d)}>
                    Rename
                  </button>
                  <button type="button" onClick={() => onDuplicate(d)}>
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="is-danger"
                    onClick={() => onDelete(d)}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {!showDefault && custom.length === 0 ? (
            <tr>
              <td colSpan={4}>No dashboard matches “{q}”.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
