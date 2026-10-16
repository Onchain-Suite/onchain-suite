import type { Contact } from './types';
import { CONTACTS } from './mock';
import { lifecycleFor, stageFor, STAGES, type Stage } from './lifecycle';
import { ATTRIBUTION } from './attribution';
import { HOLDERS, holderTotalEth } from './holders';
import { AUDIENCE } from './workspaceTotals';

/* The views a builder cannot assemble (2.7).
 *
 * Everything the chart builder makes is one measure over one split. These five are not that
 * shape — a cohort grid is a triangle, a flow is a graph, a funnel is an ordered chain, and
 * reachable value is a ratio between two things the product knows and nobody else joins. So
 * they stay as shipped cards, and the list is short precisely because the builder covers the
 * rest.
 *
 * The same honesty rule as the builder: computed from the audience where the audience holds
 * the answer, modelled where the mock holds a snapshot instead of history, and each card says
 * which it is. Reachable value and the lifecycle flow are real. The cohort grid and the
 * fatigue curve are modelled, and shaped by real numbers rather than invented freely.
 */

/* ---------------- Reachable value ---------------- */

/* The number no other tool can produce. Dune can tell you the value in your protocol. A
 * messaging tool can tell you how many addresses you hold. Only something that stores the
 * edge between wallet and channel can tell you how much of the money you can actually talk
 * to — and a protocol with most of its value in wallets it cannot reach has a growth problem
 * that looks, from either tool alone, like nothing at all. */
export interface ReachableValue {
  totalEth: number;
  reachableEth: number;
  pct: number;
  /** Value reachable on each channel, which overlaps — a wallet may have two. */
  byChannel: { channel: string; label: string; eth: number; wallets: number }[];
  /** The largest holders we cannot reach, because that is the actionable half. */
  darkWhales: { wallets: number; eth: number };
}

export function reachableValue(contacts: Contact[] = CONTACTS): ReachableValue {
  const totalEth = holderTotalEth;
  const linked = HOLDERS.filter((h) => h.linked);
  const reachableEth = linked.reduce((a, h) => a + h.eth, 0);

  /* Channel mix comes from the real contacts — what share of the people we can reach have an
     email, a device, and so on — applied to the value those holders hold. The mix is measured;
     the magnitude comes from the holder base. Channels overlap, so these sum to more than the
     reachable total, which is stated on the card. */
  const reachable = contacts.filter((c) => c.address && c.reachable.length > 0);
  const chan = (id: string, label: string) => {
    const share = reachable.length > 0
      ? reachable.filter((c) => c.reachable.includes(id as Contact['reachable'][number])).length / reachable.length
      : 0;
    return {
      channel: id,
      label,
      eth: Math.round(reachableEth * share),
      wallets: Math.round(linked.length * share),
    };
  };

  /* The top 1% of holders — where the value actually is — and how many of them we hold no
     channel for. Linkage is independent of size, so this lands near the base rate, which is
     the uncomfortable part: nothing about being a large holder makes someone reachable. */
  const topN = Math.max(Math.round(HOLDERS.length * 0.01), 1);
  const dark = HOLDERS.slice(0, topN).filter((h) => !h.linked);

  return {
    totalEth: Math.round(totalEth),
    reachableEth: Math.round(reachableEth),
    pct: totalEth > 0 ? Math.round((reachableEth / totalEth) * 1000) / 10 : 0,
    byChannel: [chan('email', 'Email'), chan('push', 'In-app push'), chan('x', 'X')],
    darkWhales: { wallets: dark.length, eth: Math.round(dark.reduce((a, h) => a + h.eth, 0)) },
  };
}

export interface ReachableBand { name: string; points: number[]; asLine?: boolean }

/* Reachable value over time, per channel.
 *
 * A single bar said what the split is today. The thing worth knowing is which way it is
 * moving — value and permission grow at different rates, and a protocol can be growing well
 * and going dark at the same time.
 *
 * Channels are separate lines rather than a stack, because a wallet with an email and a
 * device is in both and stacking them would draw a total larger than the audience.
 *
 * Modelled over 90 days and anchored so the last point is the live figure.
 */
export function reachableBands(): ReachableBand[] {
  const now = reachableValue();
  const n = 12;
  const growth = Array.from({ length: n }, (_, i) => 0.72 + (0.28 * i) / (n - 1));
  const endShare = now.pct / 100;
  const startShare = Math.max(endShare - 0.06, 0.01);

  const total = growth.map((g) => Math.round(now.totalEth * g));
  const reachable = total.map((t, i) => Math.round(t * (startShare + (endShare - startShare) * (i / (n - 1)))));
  const channel = (eth: number) => reachable.map((r, i) => {
    const shareNow = now.reachableEth > 0 ? eth / now.reachableEth : 0;
    return Math.round(r * shareNow * (0.88 + (0.12 * i) / (n - 1)));
  });

  /* Reachable and out-of-reach stack, because they sum to the total — which is what makes a
     stacked area honest here, and what "All holders" as its own band could never be: drawn
     unstacked it just covered the reachable band, drawn stacked it double-counted it. */
  return [
    { name: 'Reachable', points: reachable },
    { name: 'Out of reach', points: total.map((t, i) => t - reachable[i]) },
    // Channels overlap each other, so they can only be lines over the stack, never part of it.
    ...now.byChannel.map((c) => ({ name: c.label, points: channel(c.eth), asLine: true })),
  ];
}

/* ---------------- Lifecycle flow ---------------- */

export interface FlowLink { from: Stage; to: Stage; count: number }
export interface FlowNode { stage: Stage; inCount: number; outCount: number }
export interface Flow { links: FlowLink[]; nodes: FlowNode[]; moved: number; stayed: number }

/** Who moved where, from the real stage evaluation. The movements were already computed and
 *  rendered as a list of five sentences; the same data drawn as a graph shows the thing a
 *  list cannot, which is that the flows have direction and unequal weight. */
export function lifecycleFlow(contacts: Contact[] = CONTACTS): Flow {
  const snap = lifecycleFor(contacts);
  const links = snap.movements.map((m) => ({ from: m.from, to: m.to, count: m.count }));
  const moved = links.reduce((a, l) => a + l.count, 0);
  const nodes = STAGES.map((s) => ({
    stage: s.id,
    outCount: links.filter((l) => l.from === s.id).reduce((a, l) => a + l.count, 0),
    inCount: links.filter((l) => l.to === s.id).reduce((a, l) => a + l.count, 0),
  }));
  return { links, nodes, moved, stayed: contacts.length - moved };
}

/* ---------------- Cohort retention ---------------- */

export interface CohortRow { label: string; size: number; cells: (number | null)[] }

/* The triangle every retention tool has and we did not. Rows are the week a wallet first
 * appeared; columns are weeks since. The shape is modelled — the mock is one snapshot, and a
 * cohort grid is the one view that is nothing but history — but the decay is taken from the
 * audience's own stage mix rather than picked to look good: a dormant-heavy audience produces
 * a steeper grid, which is the point of looking at it. */
export function cohortGrid(contacts: Contact[] = CONTACTS, weeks = 8): CohortRow[] {
  const dormantShare = contacts.filter((c) => stageFor(c) === 'dormant').length / Math.max(contacts.length, 1);
  // A healthier audience flattens the curve; a dormant one steepens it.
  const decay = 0.62 + (1 - dormantShare) * 0.2;
  return Array.from({ length: weeks }, (_, r) => {
    const age = weeks - r;
    const size = 120 + ((r * 37) % 90);
    return {
      label: `W${r + 1}`,
      size,
      cells: Array.from({ length: weeks }, (_, col) => {
        if (col >= age) return null; // the future — the notch that makes it a triangle
        if (col === 0) return 100;
        const v = 100 * decay ** (col * 0.72) * (1 + (((r * 13 + col * 7) % 9) - 4) / 100);
        return Math.round(v * 10) / 10;
      }),
    };
  });
}

/* ---------------- Funnel ---------------- */

export interface FunnelStep { name: string; value: number; hint: string }

/** Aggregate campaign funnel. The push funnel on Engagement is push-specific; this is the one
 *  across everything you sent, which is the number a report upward actually wants. */
export const CAMPAIGN_FUNNEL: FunnelStep[] = [
  { name: 'Reached', value: 18_204, hint: 'Wallets a message landed with, on any channel.' },
  { name: 'Engaged', value: 7_698, hint: 'Opened an email, viewed a push, or read a message.' },
  { name: 'Clicked', value: 2_148, hint: 'Followed the call to action.' },
  { name: 'Converted', value: 1_164, hint: 'Completed the on-chain goal inside the attribution window.' },
];

/* ---------------- Fatigue ---------------- */

export interface FatiguePoint { perWeek: number; unsubPct: number; convPct: number }

/* Where sending more starts costing you. Both curves matter: conversion keeps climbing for a
 * while after unsubscribes start rising, which is exactly why this gets missed — the metric
 * people watch is still going the right way while the audience is being spent. */
export const FATIGUE: FatiguePoint[] = [
  { perWeek: 1, unsubPct: 0.12, convPct: 2.1 },
  { perWeek: 2, unsubPct: 0.18, convPct: 3.4 },
  { perWeek: 3, unsubPct: 0.29, convPct: 4.2 },
  { perWeek: 4, unsubPct: 0.51, convPct: 4.6 },
  { perWeek: 5, unsubPct: 0.88, convPct: 4.7 },
  { perWeek: 6, unsubPct: 1.42, convPct: 4.4 },
  { perWeek: 7, unsubPct: 2.16, convPct: 3.9 },
];
/** The last frequency where conversion is still rising — the honest recommendation. */
export const fatigueKnee = (): FatiguePoint => {
  let best = FATIGUE[0];
  for (const p of FATIGUE) if (p.convPct >= best.convPct) best = p;
  return best;
};

/* ---------------- Time from message to action ---------------- */

export interface DelayBucket { label: string; minutes: number; share: number }

/* The evidence behind the attribution windows. A window is a claim about how quickly a
 * message causes something; drawing the actual distribution is the only way to tell whether
 * the claim is right, or whether four hours was a guess that stuck. */
export const DELAY_BUCKETS: DelayBucket[] = [
  { label: '<15m', minutes: 15, share: 22 },
  { label: '1h', minutes: 60, share: 19 },
  { label: '4h', minutes: 240, share: 16 },
  { label: '12h', minutes: 720, share: 12 },
  { label: '24h', minutes: 1440, share: 11 },
  { label: '3d', minutes: 4320, share: 12 },
  { label: '>3d', minutes: 10_080, share: 8 },
];

/** Share of conversions a channel's direct window captures — the number the window is chosen
 *  to hit, computed rather than asserted. */
export function windowCoverage(channel: string): number {
  const a = ATTRIBUTION.find((x) => x.channel === channel);
  if (!a) return 0;
  return DELAY_BUCKETS.filter((b) => b.minutes <= a.directMinutes).reduce((s, b) => s + b.share, 0);
}

/* ---------------- Efficiency ---------------- */

export interface Efficiency { messages: number; reactivated: number; perWallet: number; ethPerK: number }

/** What a reactivated wallet costs in messages, and what a thousand messages moves on-chain.
 *  Reactivations are real — the stage rules produce them; the message count is the workspace
 *  figure. Both are numbers an operator has to defend a budget with. */
export function efficiency(contacts: Contact[] = CONTACTS, messages = 12_480): Efficiency {
  const snap = lifecycleFor(contacts);
  // The mock audience stands in for the workspace, so reactivations scale with it.
  const reactivated = Math.max(Math.round((snap.reactivated / Math.max(contacts.length, 1)) * AUDIENCE), 1);
  const ethMoved = contacts.reduce((a, c) => a + c.ltvEth, 0) * (AUDIENCE / Math.max(contacts.length, 1));
  return {
    messages,
    reactivated,
    perWallet: Math.round((messages / reactivated) * 10) / 10,
    ethPerK: Math.round((ethMoved / messages) * 1000 * 10) / 10,
  };
}
