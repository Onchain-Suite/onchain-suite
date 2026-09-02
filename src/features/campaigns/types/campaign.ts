export type CampaignStatus =
  "draft" | "scheduled" | "sending" | "sent" | "paused" | "failed";
export type CampaignType =
  | "email-blast"
  | "smart-sending"
  | "newsletter"
  | "promotional"
  | "announcement"
  | "automation";

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  subject: string;
  audience: string[];
  /** Recipient count (full audience) when the backend provides one; undefined renders as "-". */
  recipients?: number;
  /**
   * Provider-confirmed deliveries so far. A campaign is `sent` when fully
   * enqueued, not delivered, so `delivered` climbs from 0 as a waved send
   * progresses - render it alongside `recipients` to make an in-flight send
   * legible as in-flight.
   */
  delivered?: number;
  // Engagement rates from GET /campaigns. All are ALREADY percentages
  // (4.64 means 4.64%) - never multiply by 100. clickRateOfDelivered can exceed
  // 100% legitimately (multi-click + scanner prefetch) - never clamp it.
  /** Rate over the full audience (`recipients`) - climbs from 0 during a waved send. */
  openRateOfAudience?: number;
  clickRateOfAudience?: number;
  /** Rate over what actually delivered - the only honest rate mid-send. */
  openRateOfDelivered?: number;
  clickRateOfDelivered?: number;
  /** Unique openers so far. */
  opens?: number;
  /**
   * Unique clickers so far. CHANGED: this was click *events*; it is now unique
   * clickers. For total click volume use {@link totalClicks} - rendering this as
   * "total clicks" now undercounts.
   */
  clicks?: number;
  /**
   * Total click events. `totalClicks / clicks` is clicks-per-clicker; a ratio
   * well above 1 is security-scanner link prefetch, isolated here so it no longer
   * inflates the click rate.
   */
  totalClicks?: number;
  /** @deprecated Alias of {@link openRateOfAudience}; the name never stated its denominator. */
  openRate?: number;
  /** @deprecated Alias of {@link clickRateOfAudience}. */
  clickRate?: number;
  /** Delivery channels the campaign uses, e.g. ["email", "inapp"]. */
  channelsUsed?: string[];
  createdAt: Date;
  scheduledFor?: Date;
  sentAt?: Date;
  [key: string]: unknown;
}

/** Channels a group can deliver on (from `GET /audience/segments` reachableVia).
 *  Undefined = the source doesn't report it, so the row is not gated. */
export type ReachableVia = ("email" | "push")[] | undefined;

/** Per-channel reachable member counts (server-computed over full membership,
 *  send-grade for email). Absent when the source doesn't report it or, for
 *  intelligence segments, when it fails soft (`reachable: null`) - in both
 *  cases the row falls back to its total `count`, never renders 0. */
export interface ReachableCounts {
  email: number;
  push: number;
}

export interface List {
  id: string;
  name: string;
  count: number;
  starred: boolean;
  reachableVia?: ReachableVia;
  reachable?: ReachableCounts;
}

export interface Segment {
  id: string;
  name: string;
  count: number;
  starred: boolean;
  reachableVia?: ReachableVia;
  reachable?: ReachableCounts;
}

export interface EmailTemplate {
  id: string;
  title: string;
  date: string;
  preview: string;
}

export interface MergeTag {
  id: string;
  label: string;
  tag: string;
}

export interface Timezone {
  value: string;
  label: string;
}
