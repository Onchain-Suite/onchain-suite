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
  /** Recipient count when the backend provides one; undefined renders as "—". */
  recipients?: number;
  openRate?: number;
  clickRate?: number;
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
