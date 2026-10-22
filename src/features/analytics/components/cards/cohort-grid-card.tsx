"use client";

import { useAnalyticsSource } from "../../hooks/use-analytics-source";
import { cohortGrid } from "../../utils/cohorts";
import { formatCount } from "../../utils/format";
import {
  AnalyticsCard,
  CardEmpty,
  CardError,
  CardLoading,
} from "../analytics-card";

const WEEKS = 8;

/** Contacts still active, by the week they arrived. */
export function CohortGridCard() {
  const q = useAnalyticsSource("cohorts", "30d");
  const rows = q.data ? cohortGrid(q.data, WEEKS) : [];
  return (
    <AnalyticsCard
      title="Cohort retention"
      meta="Still active, by week they arrived"
      span={2}
    >
      {q.isLoading ? (
        <CardLoading />
      ) : q.error ? (
        <CardError error={q.error as Error} />
      ) : rows.length === 0 ? (
        <CardEmpty reason="No cohorts yet. Contacts need a week to form one." />
      ) : (
        <div className="an-cohort-wrap">
          <table className="an-cohort">
            <thead>
              <tr>
                <th scope="col">Arrived</th>
                <th scope="col">Contacts</th>
                {Array.from({ length: WEEKS }, (_, k) => (
                  <th key={k} scope="col">
                    {k === 0 ? "Week 0" : `+${k}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  <td className="an-cohort__n">{formatCount(r.size)}</td>
                  {r.cells.map((v, k) =>
                    v === null ? (
                      // Cells are positional weeks.
                      // eslint-disable-next-line react/no-array-index-key
                      <td key={k} className="an-cohort__c">
                        <span
                          className="an-cohort__future"
                          aria-label="Not yet"
                        />
                      </td>
                    ) : (
                      // eslint-disable-next-line react/no-array-index-key
                      <td key={k} className="an-cohort__c">
                        <span
                          style={{
                            background: `color-mix(in srgb, var(--action-primary) ${Math.round(v * 0.85)}%, transparent)`,
                            color: v > 55 ? "#fff" : undefined,
                          }}
                        >
                          {Math.round(v)}%
                        </span>
                      </td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AnalyticsCard>
  );
}
