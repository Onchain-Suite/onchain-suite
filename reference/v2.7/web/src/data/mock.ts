import type {
  ActivityEvent, Automation, AudienceList, Campaign, Cohort, Contact, FormRow, Kpi, Suppression, Tag,
} from './types';
import { holdingsFor } from './holdings';
import { TOTALS_30D } from './workspaceTotals';

/* ------------------------------------------------------------------ *
 * Deterministic mock generation (no Math.random → reproducible tests) *
 * ------------------------------------------------------------------ */

const HEX = '0123456789abcdef';
function addr(seed: number): string {
  let s = '0x';
  let x = seed * 2654435761;
  for (let i = 0; i < 40; i++) {
    x = (x ^ (x << 13)) >>> 0;
    x = (x ^ (x >> 7)) >>> 0;
    s += HEX[x & 15];
  }
  return s;
}

const ENS_POOL = [
  'maya.eth', 'leo.eth', 'degen.eth', 'sora.eth', 'quietwhale.eth', 'delegate.eth',
  'tunde.eth', 'basedchad.eth', 'dami.eth', 'kemi.eth', 'zara.eth', 'ade.eth',
];
const CHAINS = ['Base', 'Ethereum', 'Arbitrum', 'Optimism'];

export const TAGS: Tag[] = [
  { id: 'whale', name: 'whale', rule: 'Auto', updated: '2h ago' },
  { id: 'season-1', name: 'season-1', rule: 'Manual', updated: '1d ago' },
  { id: 'collector', name: 'collector', rule: 'Auto', updated: '3h ago' },
  { id: 'new', name: 'new', rule: 'Auto', updated: '5m ago' },
  { id: 'dormant', name: 'dormant', rule: 'Auto', updated: '6d ago' },
];

export const LISTS: AudienceList[] = [
  { id: 'news', name: 'Newsletter subscribers', source: 'Form · Newsletter signup', type: 'Growing', reach: ['email'], updated: '2h ago' },
  { id: 's2wait', name: 'Season 2 waitlist', source: 'Form · Season 2 waitlist', type: 'Growing', reach: ['email', 'push'], updated: '1d ago' },
  { id: 'airdrop', name: 'Airdrop applicants', source: 'Form · Airdrop eligibility', type: 'Growing', reach: ['email', 'push'], updated: '3h ago' },
  { id: 'vip', name: 'VIP holders', source: 'Manual · CSV import', type: 'Static', reach: ['push'], updated: '5d ago' },
];

// Generate 48 contacts, each deterministically assigned emails, channels, tags and lists.
export const CONTACTS: Contact[] = Array.from({ length: 48 }, (_, i): Contact => {
  // Some contacts are captured email-first (via a form) before any wallet is linked — they
  // have no on-chain address yet. The audience must handle these wallet-less contacts.
  const noWallet = i % 6 === 5; // ~1 in 6 is email-only
  const hasEns = !noWallet && i % 3 === 0;
  const hasEmail = noWallet ? true : i % 4 !== 3; // 75% email-reachable (ZK-linked OR imported); email-only always has email
  // Zero-knowledge model: when a wallet's email is linked via a ZK proof, the platform can
  // send to it but the operator NEVER sees the address. Only imported/self-provided emails
  // are operator-visible. So `email` is null for ZK-protected contacts even though they are
  // email-reachable — the raw address simply isn't on the client. Email-only contacts gave
  // their address directly, so it is visible and not ZK-protected.
  const emailVisible = noWallet ? true : hasEmail && i % 3 === 1;
  const zkVerified = noWallet ? false : hasEmail ? !emailVisible : i % 3 !== 2;
  const push = noWallet ? false : i % 5 !== 4; // no wallet → no signed-in device
  const reach: Contact['reachable'] = [];
  if (hasEmail) reach.push('email');
  if (push) reach.push('push');
  if (!noWallet && i % 11 === 0) reach.push('x');
  const ens = hasEns ? ENS_POOL[i % ENS_POOL.length] : null;
  const handle = ens ? ens.replace('.eth', '') : noWallet ? `subscriber${i}` : `wallet${i}`;
  const tags = [
    i % 6 === 0 ? 'whale' : null,
    i % 3 === 0 ? 'season-1' : null,
    i % 5 === 0 ? 'collector' : null,
    i % 4 === 0 ? 'new' : null,
    i % 9 === 0 ? 'dormant' : null,
  ].filter(Boolean) as string[];
  const listIds = [
    hasEmail ? 'news' : null,
    i % 2 === 0 ? 's2wait' : null,
    i % 3 === 1 ? 'airdrop' : null,
    tags.includes('whale') ? 'vip' : null,
  ].filter(Boolean) as string[];
  return {
    id: `c${i}`,
    address: noWallet ? null : addr(i + 1),
    ens,
    email: emailVisible ? `${handle}@${['proton.me', 'gmail.com', 'example.com'][i % 3]}` : null,
    reachable: reach,
    zkVerified,
    identitySource: noWallet ? 'Form signup · no wallet yet' : emailVisible ? 'Imported · CSV' : hasEmail ? 'ZK-verified link' : push ? 'App sign-in' : 'Not linked',
    tags,
    listIds,
    ltvEth: Math.round((0.4 + (i % 13) * 3.7) * 10) / 10,
    lastActive: ['2h ago', '6d ago', '1d ago', '12d ago', '48d ago', '5h ago'][i % 6],
    chain: CHAINS[i % CHAINS.length],
    ...holdingsFor(i, !noWallet),
  };
});

export function contactsInList(listId: string): Contact[] {
  return CONTACTS.filter((c) => c.listIds.includes(listId));
}
export function contactsWithTag(tagId: string): Contact[] {
  return CONTACTS.filter((c) => c.tags.includes(tagId));
}
export function listCount(listId: string): number {
  return contactsInList(listId).length;
}
export function tagCount(tagId: string): number {
  return contactsWithTag(tagId).length;
}

export const SUPPRESSIONS: Suppression[] = [
  { id: 's1', address: addr(900), ens: null, reason: 'Unsubscribed', channel: 'Email', since: 'Jul 20, 2026' },
  { id: 's2', address: addr(901), ens: 'paperhands.eth', reason: 'Bounced', channel: 'Email', since: 'Jul 18, 2026' },
  { id: 's3', address: addr(902), ens: null, reason: 'Muted push', channel: 'In-app push', since: 'Jul 12, 2026' },
];

export const CAMPAIGNS: Campaign[] = [
  { id: 'c1', name: 'Acme is live', channels: ['email'], type: 'Email blast', status: 'sent', recipients: 4102, opened: 2100, clicked: 599, createdAt: 'Jul 22, 3:30 PM' },
  { id: 'c2', name: 'Pack drop: Season 2', channels: ['email', 'push'], type: 'Smart', status: 'scheduled', recipients: 1546, opened: 0, clicked: 0, createdAt: 'Jul 24, 9:00 AM' },
  { id: 'c3', name: 'Hammer earners weekly digest', channels: ['email'], type: 'Email blast', status: 'sent', recipients: 2873, opened: 1287, clicked: 322, createdAt: 'Jul 21, 8:00 AM' },
  { id: 'c4', name: 'Dormant vault re-activation', channels: ['email'], type: 'Email blast', status: 'scheduled', recipients: 978, opened: 0, clicked: 0, createdAt: 'Jul 27, 10:00 AM' },
  { id: 'c5', name: 'Whale unstake follow-up', channels: ['push'], type: 'Smart', status: 'sent', recipients: 86, opened: 54, clicked: 21, createdAt: 'Jul 19, 2:40 PM' },
  { id: 'c6', name: 'Gas rebate week', channels: ['email', 'push'], type: 'Smart', status: 'paused', recipients: 3004, opened: 1054, clicked: 264, createdAt: 'Jul 15, 9:00 AM' },
  { id: 'c7', name: 'Governance quorum push', channels: ['push'], type: 'Smart', status: 'draft', recipients: 0, opened: 0, clicked: 0, createdAt: 'Jul 24, 6:10 PM' },
];

export const AUTOMATIONS: Automation[] = [
  { id: 'a1', name: 'Welcome new wallets', trigger: 'Holder acquired', status: 'active', entries30d: 1204, completedPct: 38.2, conversions: 460, lastTriggered: '12 min ago' },
  { id: 'a2', name: 'Whale unstake alert', trigger: 'On-chain event · unstake > 10 ETH', status: 'active', entries30d: 86, completedPct: 61.6, conversions: 53, lastTriggered: '2h ago' },
  { id: 'a3', name: 'Dormant 30d win-back', trigger: 'Goes dormant', status: 'paused', entries30d: 978, completedPct: 12.4, conversions: 121, lastTriggered: '6d ago' },
  { id: 'a4', name: 'Post-purchase pack tips', trigger: 'On-chain event · buys a pack', status: 'draft', entries30d: 0, completedPct: 0, conversions: 0, lastTriggered: 'Never' },
];

export const FORMS: FormRow[] = [
  { id: 'f1', name: 'Acme dapp connect', captureType: 'Identity capture', surface: 'Widget', submissions: 3892, conversionPct: 62, enrolsInto: 'Welcome new wallets', status: 'Live' },
  { id: 'f2', name: 'Season 2 waitlist', captureType: 'Identity capture', surface: 'Hosted', submissions: 1204, conversionPct: 38, enrolsInto: 'Welcome new wallets', status: 'Live' },
  { id: 'f3', name: 'Newsletter signup', captureType: 'Lead capture', surface: 'Widget', submissions: 640, conversionPct: 24, enrolsInto: null, status: 'Live' },
  { id: 'f4', name: 'Airdrop eligibility', captureType: 'Identity capture', surface: 'Hosted', submissions: 512, conversionPct: 44, enrolsInto: 'Post-purchase pack tips', status: 'Draft' },
];

export const COHORTS: Cohort[] = [
  { id: 'dormant', icon: 'moon', finding: '142 dormant LPs from the last 30 days.', detail: 'Median lifetime deposit $4.2k. 38 are also active on Aave. They left liquidity, not the space.', count: 142, metric: '$4.2k median' },
  { id: 'whales', icon: 'gem', finding: '11 wallets crossed $50k TVL this week.', detail: 'None have received outreach. Combined they hold $1.9M across your pools.', count: 11, metric: '$1.9M held' },
  { id: 'near-churn', icon: 'trending-down', finding: '206 wallets are trending toward churn.', detail: 'Weekly-active a month ago, now one visit in 14 days. Reachable in-app today.', count: 206, metric: '−63% activity' },
  { id: 'overlap', icon: 'network', finding: '319 of your wallets also use Uniswap v4.', detail: 'Multi-protocol wallets convert on migration offers at 2.3x baseline.', count: 319, metric: '2.3x baseline' },
];

export const ACTIVITY: ActivityEvent[] = [
  { id: 'e1', type: 'Swap', status: 'success', address: addr(1), sentence: 'swapped 4.2 ETH → USDC', chain: 'Base', at: '14:36 UTC' },
  { id: 'e2', type: 'Unstake', status: 'warning', address: addr(8), sentence: 'unstaked 12 ETH from the vault', chain: 'Ethereum', at: '14:12 UTC' },
  { id: 'e3', type: 'Mint', status: 'info', address: addr(20), sentence: 'minted 3 items from Zora drop', chain: 'Base', at: '13:58 UTC' },
  { id: 'e4', type: 'Deposit', status: 'success', address: addr(4), sentence: 'first deposit of $1,840 USDC', chain: 'Base', at: '13:30 UTC' },
];

export const DASHBOARD_KPIS: Kpi[] = [
  { label: 'Active wallets', value: TOTALS_30D.activeWallets.toLocaleString('en-US'), sub: 'vs last 30d', deltaPct: 8.6, spark: [4, 5, 4, 6, 7, 8, 9, 11] },
  { label: 'Messages sent', value: TOTALS_30D.messagesSent.toLocaleString('en-US'), sub: 'vs last 30d', deltaPct: 4.1, spark: [8, 7, 9, 8, 10, 11, 12, 12] },
  { label: 'Email open rate', value: '42.3%', sub: 'email only · vs last 30d', deltaPct: 2.7, spark: [6, 7, 6, 8, 7, 9, 9, 10] },
  { label: 'On-chain conversions', value: TOTALS_30D.onchainConversions.toLocaleString('en-US'), sub: 'vs last 30d', deltaPct: 22.8, spark: [2, 3, 2, 4, 5, 6, 7, 9] },
];

// Saved segments — the shared source of truth for the campaign wizard's audience selector
// and (soon) Intelligence. Segments are query results (recomputed), not stored membership.
export const SEGMENTS: import('./types').Segment[] = [
  { id: 'active', name: 'Active traders 30d', desc: 'Any swap or trade in the last 30 days', count: 2140, email: 1680, wallet: 2140 , synced: '2 min ago' },
  { id: 'whales', name: 'Base whales', desc: 'Balance > 10 ETH · active in 7d', count: 1204, email: 1040, wallet: 1204 , synced: '2 min ago' },
  { id: 's2buyers', name: 'Season 2 buyers', desc: 'Bought a pack in the last 7 days', count: 460, email: 300, wallet: 460 , synced: '18 min ago' },
  { id: 'dormant', name: 'Dormant, was active', desc: 'No activity 30d · lifetime > 5 ETH', count: 612, email: 480, wallet: 612 , synced: '1h ago' },
  { id: 'lps', name: 'Liquidity providers', desc: 'Added liquidity to any pool', count: 890, email: 610, wallet: 890 , synced: '3h ago' },
  { id: 'newholders', name: 'New holders 7d', desc: 'First seen in the last week', count: 1520, email: 900, wallet: 1520 , synced: '12 min ago' },
  { id: 'voters', name: 'Governance voters', desc: 'Voted in the last proposal', count: 340, email: 250, wallet: 340 , synced: '1d ago' },
];
