/**
 * `GET /analytics/reports/*` (onchain-backend `analytics`) and the audience
 * report that the analytics tabs read.
 *
 * **Rates in this family are fractions** (`0.4231` means 42.31%), unlike
 * `/organization/analytics/*`, which returns percentages.
 */

/** `GET /analytics/reports/retention-cohorts?weeks=8` */
export interface RetentionCohortsReport {
  cohorts: Array<{
    /** ISO date (YYYY-MM-DD) of the Monday the cohort's contacts were created. */
    cohortWeek: string;
    size: number;
    /**
     * Contacts still active at week 0, 1, 2…: "active in week k or later", so it
     * never rises. Its length is the weeks observable so far for this cohort.
     */
    retained: number[];
  }>;
}

/** `GET /analytics/reports/engagement-by-segment`: email only for now. */
export interface EngagementBySegmentReport {
  rows: Array<{
    segmentId: string;
    name: string;
    /** Emails delivered to the segment's members. */
    sent: number;
    openRate: number;
    clickRate: number;
    /** Always 0 today: in-app views live outside delivery events. */
    pushViewRate: number;
  }>;
}

/** `GET /analytics/reports/holder-distribution?token=&limit=` */
export interface HolderDistributionReport {
  /** Fixed balance bands: 0–1, 1–10, 10–100, 100–1K, 1K–10K, 10K+. */
  buckets: Array<{ range: string; wallets: number; pctSupply: number }>;
  topHolders: Array<{ wallet: string; balance: number; pctSupply: number }>;
  concentration: { top10Pct: number; hhi: number };
  totalHolders: number;
  totalSupply: number;
}

/** `GET /analytics/reports/campaign-report` */
export interface CampaignReport {
  rows: Array<{
    runId: string;
    name: string;
    segmentSize: number;
    sent: number;
    openRate: number;
    clickRate: number;
    /** Always 0 until goal tracking is populated. */
    conversions: number;
    startedAt: string | null;
    completedAt: string | null;
  }>;
}

/** `GET /analytics/reports/automation-performance` */
export interface AutomationPerformanceReport {
  rows: Array<{
    automationId: string;
    name: string;
    status: string;
    entered: number;
    completed: number;
    completionRate: number;
    sent: number;
    openRate: number;
    clickRate: number;
    conversions: number;
  }>;
}

/** `GET /audience/report` */
export interface AudienceReport {
  totals: {
    contacts: number;
    pushReachable: number;
    emailReachable: number;
    walletOnly: number;
    bothChannels: number;
  };
  growthWeekly: Array<{ weekStart: string; newContacts: number }>;
  engagement30d: Array<{ eventType: string; count: number }>;
  /** The eight largest segments by live size. */
  topSegments: Array<{ id: string; name: string; count: number }>;
  updatedAt?: string;
}
