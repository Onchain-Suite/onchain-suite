import type { IconName } from '../components/icons';
import type { Campaign, ChannelId } from './types';

/* The 2.5 campaign model.
 *
 * 2 treats a campaign as "one message on one channel, measured by opens". That stops
 * working the moment there are four channels: an open is an email idea, a view is a push
 * idea, and an X DM has neither — it has "read", and a follower who can stop following.
 * Comparing them on open rate quietly compares nothing.
 *
 * So 2.5 changes what a campaign *is* in two ways. It carries a goal — an on-chain event
 * that defines success before a single message is sent — and it carries a route rather
 * than a channel, so "reach this person" can mean "try push, then email if they don't
 * see it". Everything here is the shared vocabulary for both. */

/* ---------------- Conversion goals ---------------- */

/** What the campaign is *for*, expressed as an on-chain event. Attribution against this is
 *  the thing no email tool can do — it is the whole reason the goal is set up front rather
 *  than reverse-engineered from a dashboard afterwards. */
export interface ConversionGoal {
  id: string;
  label: string;
  icon: IconName;
  /** How the event reads in a sentence, e.g. "minted a pack". */
  verb: string;
  /** Attribution window in days — on-chain conversions lag messages badly. */
  windowDays: number;
}

export const GOALS: ConversionGoal[] = [
  { id: 'mint', label: 'Mint', icon: 'gem', verb: 'minted', windowDays: 7 },
  { id: 'buy', label: 'Purchase', icon: 'circle-dollar-sign', verb: 'bought', windowDays: 7 },
  { id: 'stake', label: 'Stake', icon: 'droplets', verb: 'staked', windowDays: 14 },
  { id: 'bridge', label: 'Bridge', icon: 'arrow-left-right', verb: 'bridged', windowDays: 14 },
  { id: 'return', label: 'Return to app', icon: 'repeat', verb: 'came back', windowDays: 3 },
  { id: 'none', label: 'No goal (awareness only)', icon: 'megaphone', verb: 'engaged', windowDays: 0 },
];

export const goalById = (id: string) => GOALS.find((g) => g.id === id) ?? GOALS[GOALS.length - 1];

/* ---------------- Delivery routes ---------------- */

/** One hop in a route: a channel, and how long to wait for it before trying the next. */
export interface RouteStep {
  channel: ChannelId;
  /** Hours to wait for engagement before falling through. Ignored on the last step. */
  waitHours: number;
}

export const ROUTABLE: { id: ChannelId; label: string; icon: IconName; note: string }[] = [
  { id: 'push', label: 'In-app push', icon: 'smartphone', note: 'Only reaches wallets connected to your dApp' },
  { id: 'email', label: 'Email', icon: 'mail', note: 'Widest reach, slowest read' },
  { id: 'x', label: 'X DM', icon: 'at-sign', note: 'Only reaches accounts that follow you' },
];

/* Reach constraints, stated where the channel is chosen.
 *
 * X cannot reach an arbitrary person, and no amount of product design changes that — it
 * only permits DMs to accounts that follow you. The failure mode we are avoiding is showing
 * a segment of 12,000 wallets next to an X DM option, letting the operator believe 12,000
 * is the reach, and then delivering 400. So the constraint is stated at selection time, in
 * the picker, as part of the reach number itself — never as a footnote after the fact. */
export interface ChannelConstraint {
  /** The one-line rule, in the operator's words. */
  rule: string;
  /** Why it exists — stops it reading as our limitation rather than the platform's. */
  because: string;
  /** What the operator can do to grow the reachable pool. */
  grow: string;
  /** Share of a typical wallet segment that is actually addressable on this channel. */
  typicalReach: number;
  /** The noun for who is reachable, used in the picker instead of "wallets". */
  noun: string;
}

export const CONSTRAINTS: Partial<Record<ChannelId, ChannelConstraint>> = {
  x: {
    rule: 'X only lets you DM accounts that follow you.',
    because: 'The API rejects a DM to anyone who does not follow you or has not DM\'d you first. There is no paid tier that changes this.',
    grow: 'Link X handles on your forms, and campaign for follows before you campaign in DMs.',
    typicalReach: 0.09,
    noun: 'followers with a linked wallet',
  },
};

/* ---------------- Send-time optimisation ---------------- */

/* "Best time to send" is a per-person question, not a per-campaign one.
 *
 * The usual version of this feature picks one clever hour for the whole list, which is
 * just a scheduled send with extra steps. The useful version staggers delivery so each
 * contact receives it at *their* peak-open hour, which means the campaign completes over a
 * window rather than at an instant — and the UI has to say that, or an operator will
 * schedule a time-sensitive drop through it and watch a third of the list get it tomorrow.
 *
 * Contacts with no open history fall back through segment → workspace → a global prior,
 * so nobody is left unsent because we have never seen them open anything. */
export interface SendTimeModel {
  /** Hours over which delivery completes once started. */
  windowHours: number;
  /** Share of the audience with enough history for a personal prediction. */
  modelled: number;
  /** Where everyone else lands: the workspace's aggregate peak. */
  fallbackHour: number;
}

export const SEND_TIME: SendTimeModel = { windowHours: 24, modelled: 0.68, fallbackHour: 9 };

/** The predicted delivery spread, for the preview histogram. Index 0 = midnight. */
export const SEND_TIME_CURVE = [
  1, 1, 0, 0, 1, 2, 5, 9, 13, 15, 12, 9, 8, 7, 8, 9, 10, 12, 14, 13, 10, 7, 4, 2,
];

/** How the window reads in the summary. Never "sends at 09:00" — it does not. */
export function sendTimeSummary(total: number): string {
  const modelled = Math.round(total * SEND_TIME.modelled);
  return `${modelled.toLocaleString('en-US')} at their own peak hour, the rest at ${SEND_TIME.fallbackHour}:00, all delivered within ${SEND_TIME.windowHours}h`;
}

/* ---------------- The normalised funnel ---------------- */

/** The one shape every channel reports into.
 *
 *  `engaged` deliberately collapses open / view / read / click into a single idea: the
 *  person demonstrably saw it. That loses per-channel nuance — which is what the channel
 *  breakdown below is for — but it buys the one thing 2 could not do, which is compare
 *  a push campaign to an email campaign without lying. */
export interface Funnel {
  /** Messages that actually landed. Not the audience size — the audience minus every gate. */
  reached: number;
  engaged: number;
  /** Wallets that performed the goal event inside the attribution window. */
  converted: number;
  /** Permanently lost on this campaign: unsubscribed, blocked the bot, muted push. */
  lost: number;
}

export const rate = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);
export const pct = (n: number, d: number) => `${rate(n, d).toFixed(1)}%`;

/** Derive a funnel from a 2 campaign record.
 *
 *  The stored shape only has recipients / opened / clicked, so conversion and loss are
 *  modelled from the click-through rather than measured. Deterministic on the campaign id
 *  so the number doesn't dance between renders — a real backend supplies these directly. */
export function funnelFor(c: Campaign): Funnel {
  const seed = c.id.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const engaged = c.opened || Math.round(c.recipients * 0.31);
  const clicked = c.clicked || Math.round(engaged * 0.24);
  // Click → on-chain conversion runs 18–34% for a campaign with a real goal.
  const converted = Math.round(clicked * (0.18 + (seed % 17) / 100));
  const lost = Math.round(c.recipients * (0.004 + (seed % 7) / 1000));
  return { reached: c.recipients, engaged, converted, lost };
}

/** Per-channel contribution, so the collapsed funnel can be opened back up.
 *  A route makes this essential: "email converted 3%" is meaningless if push got there
 *  first and email only ever saw the people push failed to reach. */
export interface ChannelSlice {
  channel: ChannelId;
  reached: number;
  engaged: number;
  converted: number;
  /** The channel-native engagement word, because "open rate" is wrong for every channel but email. */
  engagedLabel: string;
}

export const ENGAGED_LABEL: Record<string, string> = {
  email: 'Opened', push: 'Viewed', x: 'Read', discord: 'Read',
};

export function slicesFor(c: Campaign): ChannelSlice[] {
  const f = funnelFor(c);
  const chans = c.channels.length ? c.channels : (['email'] as ChannelId[]);
  // Earlier hops in a route absorb most of the volume; later ones only see the remainder.
  const weights = chans.map((_, i) => 1 / Math.pow(1.9, i));
  const sum = weights.reduce((a, w) => a + w, 0);
  return chans.map((channel, i) => {
    const share = weights[i] / sum;
    return {
      channel,
      reached: Math.round(f.reached * share),
      engaged: Math.round(f.engaged * share),
      converted: Math.round(f.converted * share),
      engagedLabel: ENGAGED_LABEL[channel] ?? 'Engaged',
    };
  });
}
