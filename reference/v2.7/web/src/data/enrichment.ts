import type { Contact } from './types';
import { CONTACTS } from './mock';
import { stageFor } from './lifecycle';
import { APP_MARKS, CHAIN_MARKS, TOKEN_MARKS } from './holdings';

/* One sync, not a sync and an enrich (2.7).
 *
 * These shipped as two actions in two places: "Sync wallets" in Audience added holders off
 * the indexed contracts, "Enrich" in Intelligence refreshed metrics on wallets already held. Both
 * are the same sentence — go read the chain and bring the audience in line with it — cut in
 * half, and the cut put the burden in the wrong place. To choose correctly you had to already
 * know whether what you were missing was wallets or facts about wallets, which is the thing
 * you are running it to find out. The honest answer is almost always "both", so it does both.
 *
 * And it reports. A run that finishes and says nothing leaves you to take on faith that it
 * worked, and the interesting part is never the total — it is what changed. Wallets that
 * arrived, wallets that gained a token, wallets that moved lifecycle stage, wallets that
 * became reachable. Those are the things you would act on.
 */

export interface EnrichedField { label: string; filled: number; of: number; note: string }
export interface EnrichFinding { label: string; count: number; hint: string; to?: string }

export interface EnrichRun {
  at: string;
  /** Wallets read this run — those already held plus any found on the contracts. */
  scanned: number;
  updated: number;
  /** Wallets the contracts had that the audience did not. */
  added: number;
  /** Which contracts were read, so "added 1,204" is attributable. */
  sources: { name: string; holders: number; added: number }[];
  fields: EnrichedField[];
  findings: EnrichFinding[];
  /** Newly seen holdings, which is the part a segment can be built on tomorrow. */
  discovered: { kind: 'chain' | 'app' | 'token'; label: string; wallets: number }[];
  /** Wallet-data credits this run actually consumed. */
  creditsSpent?: number;
  /** Wallets left unread because the balance ran out part-way. */
  walletsSkipped?: number;
}

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

export function runEnrichment(contacts: Contact[] = CONTACTS): EnrichRun {
  const wallets = contacts.filter((c) => c.address);
  const scanned = wallets.length;

  const withBalance = wallets.filter((c) => c.ltvEth > 0).length;
  const withApps = wallets.filter((c) => c.apps.length > 0).length;
  const withTokens = wallets.filter((c) => c.tokens.length > 0).length;
  const multiChain = wallets.filter((c) => c.chains.length > 1).length;

  /* Counted from the audience rather than invented, so the summary and the tables people go
     on to open cannot disagree. */
  const count = (pool: { id: string; label: string }[], pick: (c: Contact) => string[]) =>
    pool.map((m) => ({ label: m.label, wallets: wallets.filter((c) => pick(c).includes(m.id)).length }))
      .filter((r) => r.wallets > 0)
      .sort((a, b) => b.wallets - a.wallets);

  const dormant = wallets.filter((c) => stageFor(c) === 'dormant').length;
  const atRisk = wallets.filter((c) => stageFor(c) === 'at_risk').length;
  const unreachable = wallets.filter((c) => c.reachable.length === 0).length;
  const whalesNoChannel = wallets
    .filter((c) => c.reachable.length === 0)
    .sort((a, b) => b.ltvEth - a.ltvEth)
    .slice(0, Math.max(Math.round(wallets.length * 0.1), 1)).length;

  /* Holders the indexed contracts know about that the audience does not. A real backend
     diffs the holder list against the contact table; here the shape is what matters. */
  const sources = [
    { name: 'Acme Packs', holders: 3496, added: 612 },
    { name: 'Acme Staking', holders: 610, added: 94 },
  ];
  const added = sources.reduce((a, x) => a + x.added, 0);

  return {
    at: new Date().toISOString(),
    scanned: scanned + added,
    updated: Math.round(scanned * 0.86),
    added,
    sources,
    fields: [
      { label: 'Balances & lifetime value', filled: withBalance, of: scanned, note: `${pct(withBalance, scanned)}% resolved` },
      { label: 'Chains transacted on', filled: scanned, of: scanned, note: `${multiChain} on more than one` },
      { label: 'Protocols used', filled: withApps, of: scanned, note: `${scanned - withApps} hold tokens but use no app` },
      { label: 'Tokens held', filled: withTokens, of: scanned, note: `${pct(withTokens, scanned)}% resolved` },
    ],
    findings: [
      { label: 'New wallets with no channel', count: added, hint: 'Just added from your contracts. Nothing can reach them yet', to: '/analytics' },
      { label: 'Wallets with no channel', count: unreachable, hint: 'Indexed, but nothing can reach them yet', to: '/analytics' },
      { label: 'Large holders we cannot message', count: whalesNoChannel, hint: 'Top of the audience by value, no email or device' },
      { label: 'Wallets now dormant', count: dormant, hint: 'No activity for 30 days or more', to: '/audience' },
      { label: 'Wallets slipping', count: atRisk, hint: 'Health falling, still reachable today' },
    ].filter((f) => f.count > 0),
    discovered: [
      ...count(CHAIN_MARKS, (c) => c.chains).slice(0, 3).map((r) => ({ kind: 'chain' as const, ...r })),
      ...count(APP_MARKS, (c) => c.apps).slice(0, 3).map((r) => ({ kind: 'app' as const, ...r })),
      ...count(TOKEN_MARKS, (c) => c.tokens).slice(0, 3).map((r) => ({ kind: 'token' as const, ...r })),
    ],
  };
}

/** "2h ago" from an ISO timestamp — the header needs it and it is the only place we store one. */
export function agoLabel(iso: string): string {
  const mins = Math.max(Math.round((Date.now() - new Date(iso).getTime()) / 60000), 0);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
