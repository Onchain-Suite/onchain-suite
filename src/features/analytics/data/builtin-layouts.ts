import type {
  BuiltInDashboardId,
  ChartKind,
  MetricId,
} from "../contracts/dashboards";

/**
 * What each built-in tab shows, in the reference dashboard's order. Measures
 * draw from the metric catalog; `special` cards have layouts of their own;
 * `missing` cards keep their place and say what they need from the backend.
 */
export type LayoutCard =
  | {
      kind: "metric";
      title: string;
      meta?: string;
      metric: MetricId;
      chart: ChartKind;
      span: 1 | 2 | "full";
      foot?: string;
    }
  | {
      kind: "special";
      card:
        | "kpis"
        | "funnel"
        | "push"
        | "efficiency"
        | "lifecycle"
        | "cohorts"
        | "attribution";
    }
  | {
      kind: "missing";
      title: string;
      meta?: string;
      shows: string;
      needs: string;
      span: 1 | 2 | "full";
    };

export const BUILT_IN_LAYOUTS: Record<BuiltInDashboardId, LayoutCard[]> = {
  overview: [
    { kind: "special", card: "kpis" },
    {
      kind: "metric",
      title: "Reach over time",
      meta: "Wallets a message reached",
      metric: "reach_over_time",
      chart: "area",
      span: 2,
    },
    {
      kind: "missing",
      title: "Reachable value",
      meta: "Holdings you can message",
      shows:
        "How much of your holders' value sits with wallets you can reach, by channel.",
      needs: "Needs per-wallet holding values joined to channel reachability.",
      span: 1,
    },
    {
      kind: "metric",
      title: "Messages sent by channel",
      meta: "This period",
      metric: "messages_by_channel",
      chart: "bar",
      span: 1,
    },
    {
      kind: "metric",
      title: "Conversion rate",
      meta: "% of wallets reached",
      metric: "conversion_rate_over_time",
      chart: "line",
      span: 1,
    },
    { kind: "special", card: "efficiency" },
  ],
  conversions: [
    {
      kind: "metric",
      title: "On-chain conversions",
      meta: "Over the period",
      metric: "conversions_over_time",
      chart: "area",
      span: 2,
    },
    {
      kind: "metric",
      title: "Conversions by event",
      meta: "Credited to a message",
      metric: "conversions_by_event",
      chart: "hbar",
      span: 1,
    },
    { kind: "special", card: "funnel" },
    {
      kind: "missing",
      title: "How each channel's conversions are credited",
      meta: "Direct vs influenced",
      shows:
        "Conversions per channel, split into direct (clicked, then converted) and influenced (saw it, converted later).",
      needs:
        "Needs per-channel attribution with a direct and an influenced window.",
      span: 1,
    },
    { kind: "special", card: "attribution" },
  ],
  engagement: [
    {
      kind: "missing",
      title: "Sending frequency vs. what it costs",
      meta: "Per wallet, per week",
      shows:
        "Conversion and unsubscribe rate by how many messages a wallet got each week, and where more starts to hurt.",
      needs:
        "Needs sends per wallet per week joined to conversions and unsubscribes.",
      span: 1,
    },
    {
      kind: "metric",
      title: "Off-chain engagement",
      meta: "% of delivered",
      metric: "engagement_rates",
      chart: "hbar",
      span: 1,
    },
    {
      kind: "metric",
      title: "On-chain activity",
      meta: "This period",
      metric: "onchain_activity",
      chart: "hbar",
      span: 1,
    },
    { kind: "special", card: "push" },
    {
      kind: "metric",
      title: "List growth",
      meta: "New contacts per week",
      metric: "new_contacts_by_week",
      chart: "bar",
      span: 1,
    },
    {
      kind: "metric",
      title: "Email engagement by segment",
      meta: "Open and click rate",
      metric: "segment_engagement",
      chart: "bar",
      span: 2,
    },
    {
      kind: "metric",
      title: "Reachable by channel",
      meta: "Contacts today",
      metric: "reachability",
      chart: "donut",
      span: 1,
    },
  ],
  retention: [
    { kind: "special", card: "lifecycle" },
    {
      kind: "missing",
      title: "Where wallets moved this week",
      meta: "Between lifecycle stages",
      shows:
        "How many wallets moved between stages this week, and between which ones.",
      needs: "Needs a daily snapshot of each contact's lifecycle stage.",
      span: 1,
    },
    {
      kind: "metric",
      title: "Still active, by week since joining",
      meta: "% of each cohort",
      metric: "cohort_retention",
      chart: "line",
      span: 1,
      foot: "Split into messaged and never-messaged wallets once the backend reports it.",
    },
    { kind: "special", card: "cohorts" },
  ],
};

/** Every measure a built-in tab draws, for its CSV export. */
export const layoutMetrics = (
  tab: BuiltInDashboardId
): Array<{ title: string; metric: MetricId }> =>
  BUILT_IN_LAYOUTS[tab].flatMap((c) =>
    c.kind === "metric" ? [{ title: c.title, metric: c.metric }] : []
  );
