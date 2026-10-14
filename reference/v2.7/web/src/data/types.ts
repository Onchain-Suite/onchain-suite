// Domain types. These are the contract a real backend would satisfy; the mock API below
// returns exactly these shapes, so swapping in fetch() calls is a drop-in change.

export type ChannelId = 'email' | 'push' | 'x' | 'discord';
export type Health = 'strong' | 'watch' | 'at-risk';
export type CampaignStatus = 'sent' | 'sending' | 'scheduled' | 'draft' | 'paused' | 'failed';
export type AutomationStatus = 'active' | 'paused' | 'draft';

export interface Contact {
  id: string;
  address: string | null; // null = an email-only contact captured before any wallet is linked
  ens: string | null;
  email: string | null; // resolved email when reachable, else null
  reachable: ChannelId[]; // channels this wallet can be reached on
  zkVerified: boolean;
  identitySource: string; // e.g. "ZK-verified link", "App sign-in"
  tags: string[]; // tag ids
  listIds: string[]; // lists this contact belongs to
  ltvEth: number;
  lastActive: string;
  chain: string; // the chain they are most active on — the one the drawer calls home
  /** Mark ids from data/holdings — what the wallet touches, as opposed to what we labelled it. */
  chains: string[];
  apps: string[];
  tokens: string[];
}

export interface AudienceList {
  id: string;
  name: string;
  source: string;
  type: 'Growing' | 'Static';
  reach: ChannelId[];
  updated: string;
}

export interface Tag {
  id: string;
  name: string;
  rule: 'Manual' | 'Auto';
  updated: string;
}

export interface Suppression {
  id: string;
  address: string;
  ens: string | null;
  reason: 'Unsubscribed' | 'Bounced' | 'Muted push';
  channel: string;
  since: string;
}

export interface Campaign {
  id: string;
  name: string;
  channels: ChannelId[];
  type: 'Email blast' | 'Smart';
  status: CampaignStatus;
  recipients: number;
  opened: number;
  clicked: number;
  createdAt: string;
}

export interface Automation {
  id: string;
  name: string;
  trigger: string;
  status: AutomationStatus;
  entries30d: number;
  completedPct: number;
  conversions: number;
  lastTriggered: string;
}

export interface FormRow {
  id: string;
  name: string;
  captureType: 'Identity capture' | 'Lead capture';
  surface: 'Widget' | 'Hosted';
  submissions: number;
  conversionPct: number;
  enrolsInto: string | null;
  status: 'Live' | 'Draft';
}

export interface Cohort {
  id: string;
  icon: string;
  finding: string;
  detail: string;
  count: number;
  metric: string;
}

export interface Kpi {
  label: string;
  value: string;
  sub?: string;
  deltaPct?: number;
  spark?: number[];
}

export interface ActivityEvent {
  id: string;
  type: string;
  status: Health | 'info' | 'success' | 'error' | 'warning';
  address: string;
  sentence: string;
  chain: string;
  at: string;
}

export interface Segment {
  id: string;
  name: string;
  desc: string;
  count: number;  // total wallets in the segment
  email: number;  // email-reachable
  wallet: number; // in-app-reachable (connected wallet)
  synced: string; // last recompute — segments are query results, not stored membership
}
