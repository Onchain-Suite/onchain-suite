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

export interface List {
  id: string;
  name: string;
  count: number;
  starred: boolean;
}

export interface Segment {
  id: string;
  name: string;
  count: number;
  starred: boolean;
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
