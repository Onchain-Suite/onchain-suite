import type { ChartData } from "../contracts/dashboards";
import type { OrgAnalyticsOverview } from "../contracts/org-analytics";
import { formatValue } from "./format";

/** CSV export of what a dashboard shows. Pure. */

const cell = (v: string) =>
  /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

export const toCsv = (rows: string[][]) =>
  rows.map((r) => r.map(cell).join(",")).join("\n");

/** One section per chart: its title, then a row per category and series. */
export function chartRows(title: string, data: ChartData): string[][] {
  if (data.emptyReason || data.rows.length === 0)
    return [[title, "", data.emptyReason ?? "No data"]];
  return data.rows.flatMap((r) =>
    data.series.map((s) => [
      title,
      `${String(r[data.categoryKey] ?? "")}${data.series.length > 1 ? ` · ${s.label}` : ""}`,
      formatValue(
        typeof r[s.key] === "number" ? (r[s.key] as number) : null,
        data.unit
      ),
    ])
  );
}

export function kpiRows(o: OrgAnalyticsOverview | undefined): string[][] {
  if (!o) return [];
  const k = o.kpis;
  const rate = (v: number | null) => formatValue(v, "percent");
  const n = (v: number | null) => formatValue(v, "count");
  return [
    ["Headline", "Wallets reached", n(k.walletsReached.value)],
    ["Headline", "Email open rate", rate(k.emailOpenRate.value)],
    ["Headline", "Push view rate", rate(k.pushViewRate.value)],
    ["Headline", "Active wallets", n(k.activeWallets.value)],
    ["Headline", "On-chain conversions", n(k.onChainConversions.value)],
  ];
}
