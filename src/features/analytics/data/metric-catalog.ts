import type { ChartKind, MetricId } from "../contracts/dashboards";
import type { SourceId } from "../hooks/use-analytics-source";

/**
 * Every measure a chart can show, in the words the chart builder uses. Each
 * reads endpoints that exist today, so a saved chart always draws real
 * numbers; `utils/resolve-metric.ts` turns those responses into chart data.
 */
export interface MetricDef {
  id: MetricId;
  label: string;
  /** One line under the chart and in the builder. */
  description: string;
  group: "Reach" | "Engagement" | "Conversions" | "Audience" | "On-chain";
  sources: SourceId[];
  /** Charts that read well for this measure; the first is the default. */
  charts: ChartKind[];
  /** Follows the dashboard's period picker (false: a snapshot or a fixed window). */
  periodic: boolean;
}

const TIME: ChartKind[] = ["line", "area", "bar", "number", "table"];
const PARTS: ChartKind[] = ["hbar", "bar", "donut", "table"];

export const METRICS: MetricDef[] = [
  {
    id: "reach_over_time",
    label: "Wallets reached",
    description:
      "Distinct wallets a message was delivered to, per day or week.",
    group: "Reach",
    sources: ["timeseries", "overview"],
    charts: TIME,
    periodic: true,
  },
  {
    id: "messages_by_channel",
    label: "Messages sent by channel",
    description: "Email and in-app push sends in the period.",
    group: "Reach",
    sources: ["campaigns"],
    charts: ["bar", "hbar", "donut", "number", "table"],
    periodic: true,
  },
  {
    id: "engagement_rates",
    label: "Engagement rates",
    description:
      "Email open, push view, click and unsubscribe rates, over what was delivered.",
    group: "Engagement",
    sources: ["campaigns"],
    charts: ["hbar", "bar", "table"],
    periodic: true,
  },
  {
    id: "push_funnel",
    label: "In-app push delivery",
    description: "Queued, delivered, viewed and clicked in-app pushes.",
    group: "Engagement",
    sources: ["push"],
    charts: ["hbar", "bar", "table"],
    periodic: true,
  },
  {
    id: "segment_engagement",
    label: "Email engagement by segment",
    description: "Open and click rate of each segment's members.",
    group: "Engagement",
    sources: ["segments"],
    charts: ["hbar", "bar", "table"],
    periodic: false,
  },
  {
    id: "conversions_over_time",
    label: "On-chain conversions",
    description: "Conversion events, per day or week.",
    group: "Conversions",
    sources: ["timeseries", "overview"],
    charts: TIME,
    periodic: true,
  },
  {
    id: "conversion_rate_over_time",
    label: "Conversion rate",
    description: "Conversions as a share of wallets reached, per day or week.",
    group: "Conversions",
    sources: ["timeseries"],
    charts: ["line", "area", "bar", "table"],
    periodic: true,
  },
  {
    id: "conversions_by_event",
    label: "Conversions by event",
    description:
      "Conversions credited to a message, by the event that counted.",
    group: "Conversions",
    sources: ["attribution"],
    charts: PARTS,
    periodic: true,
  },
  {
    id: "new_contacts_by_week",
    label: "New contacts",
    description: "Contacts added each week.",
    group: "Audience",
    sources: ["audienceReport"],
    charts: ["bar", "line", "area", "number", "table"],
    periodic: false,
  },
  {
    id: "reachability",
    label: "Reachable by channel",
    description:
      "Contacts you can reach by email, by in-app push, by both, or by wallet only.",
    group: "Audience",
    sources: ["audienceReport"],
    charts: PARTS,
    periodic: false,
  },
  {
    id: "lifecycle",
    label: "Lifecycle stage",
    description: "Contacts that are active, cooling or cold.",
    group: "Audience",
    sources: ["audience"],
    charts: ["donut", "hbar", "bar", "table"],
    periodic: false,
  },
  {
    id: "cohort_retention",
    label: "Retention by week since joining",
    description:
      "Share of contacts still active, by weeks since they arrived, across recent cohorts.",
    group: "Audience",
    sources: ["cohorts"],
    charts: ["line", "area", "bar", "table"],
    periodic: false,
  },
  {
    id: "onchain_activity",
    label: "On-chain activity",
    description: "New holders and on-chain actions after a message.",
    group: "On-chain",
    sources: ["onchain"],
    charts: ["hbar", "bar", "table"],
    periodic: true,
  },
  {
    id: "holders_by_balance",
    label: "Holders by balance",
    description: "Wallets in each balance band across your indexed tokens.",
    group: "On-chain",
    sources: ["holders"],
    charts: ["bar", "hbar", "donut", "table"],
    periodic: false,
  },
];

export const METRIC_BY_ID = new Map(METRICS.map((m) => [m.id, m]));

export const metricDef = (id: MetricId): MetricDef =>
  METRIC_BY_ID.get(id) ?? (METRICS[0] as MetricDef);

export const CHART_LABEL: Record<ChartKind, string> = {
  line: "line chart",
  area: "area chart",
  bar: "bar chart",
  stacked: "stacked bar chart",
  hbar: "horizontal bars",
  donut: "donut",
  number: "single number",
  table: "table",
};
