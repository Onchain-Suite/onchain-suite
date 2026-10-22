/**
 * `GET /organization/analytics/*` (onchain-backend `org-analytics`).
 *
 * Every endpoint takes `?period=7d|30d|90d` and compares against the window of
 * equal length immediately before it. Two conventions hold everywhere here:
 *
 * - **Rates are percentages** with one decimal (`42.3` means 42.3%), unlike the
 *   `/analytics/reports/*` family, which returns fractions (`0.423`).
 * - **`null` means "can't be computed"**, never zero: a rate with no
 *   denominator, a change against an empty previous window, or a conversion
 *   count when the org has not configured which events count as conversions.
 */

export type AnalyticsPeriod = "7d" | "30d" | "90d";

/** A headline number and how it moved against the previous window. */
export interface KpiValue {
  value: number | null;
  previous: number | null;
  /** Percent change; null when the previous window was empty (not "+100%"). */
  changePct: number | null;
}

export interface AnalyticsNotesMeta {
  /** Plain-language caveats the backend attaches; shown under the numbers. */
  notes?: string[];
}

/** `GET /organization/analytics/overview` */
export interface OrgAnalyticsOverview {
  period: AnalyticsPeriod;
  window: { start: string; end: string };
  kpis: {
    /** Distinct wallets a message was delivered to. */
    walletsReached: KpiValue;
    /** Email opens over email delivered, as a percentage. */
    emailOpenRate: KpiValue;
    /** In-app views over in-app delivered, as a percentage. */
    pushViewRate: KpiValue;
    activeWallets: KpiValue;
    /** Null until the org configures `metadata.analytics.conversionEvents`. */
    onChainConversions: KpiValue;
  };
  meta?: AnalyticsNotesMeta;
}

export type TimeseriesMetric = "reach" | "conversions";

/** `GET /organization/analytics/timeseries?metrics=reach,conversions` */
export interface OrgAnalyticsTimeseries {
  period: AnalyticsPeriod;
  /** Daily up to 30 days, weekly at 90. */
  grain: "day" | "week";
  metrics: TimeseriesMetric[];
  series: Array<{
    bucket: string;
    start: string;
    end: string;
    reach?: number;
    /** Null per bucket when conversions are not configured. */
    conversions?: number | null;
  }>;
  meta?: AnalyticsNotesMeta;
}

/** `GET /organization/analytics/push-delivery`: every stage is a counted row. */
export interface OrgPushDelivery {
  period: AnalyticsPeriod;
  funnel: {
    queued: number;
    delivered: number;
    viewed: number;
    clicked: number;
    /** Delivered but not yet seen, still within the push's lifetime. */
    stillPending: number;
    /** Expired before anyone saw it. */
    expiredUnseen: number;
    /** Seconds from delivery to first view (median); null with no views. */
    medianTimeToView: number | null;
  };
  /** Percentages, each over the stage before it. */
  rates: {
    deliveryRate: number | null;
    viewRate: number | null;
    clickRate: number | null;
  };
  meta?: AnalyticsNotesMeta;
}

/** `GET /organization/analytics/onchain` */
export interface OrgOnchainActivity {
  period: AnalyticsPeriod;
  onchain: {
    newHolders: number;
    newHoldersChangePct: number | null;
    /** Not indexed yet: always null today. */
    swaps: number | null;
    /** On-chain actions recorded after a message, within the window. */
    postMessageConversions: number | null;
    /** Percentage of wallets active in the prior window still active now. */
    retention30d: number | null;
  };
  meta?: AnalyticsNotesMeta;
}

/**
 * `GET /organization/analytics/attribution?windowHours=72`
 *
 * Last-touch, single-touch: a conversion credits the most recent message that
 * preceded it within `windowHours`. Correlation with an ordering constraint,
 * not causation. `attributed` fields are null when no conversion events are
 * configured for the org.
 */
export interface OrgAttribution {
  period: AnalyticsPeriod;
  windowHours: number;
  /** The event names this org counts as conversions. Empty = not configured. */
  conversionEvents: string[];
  attributed: {
    conversions: number | null;
    wallets: number | null;
    byEvent: Array<{ event: string; count: number }>;
  };
  meta?: AnalyticsNotesMeta;
}
