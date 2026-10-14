import type { Campaign, ChannelId } from './types';

/* Attribution (2.7).
 *
 * Before this the funnel had no time in it at all — `converted` was clicks × a constant,
 * and the "within 7 days" line in the wizard was copy describing a mechanism that did not
 * exist. That is a problem for us specifically, because on-chain conversion is the whole
 * pitch: "success is a mint, not an open". A mint we never matched to a message is not
 * evidence of anything.
 *
 * Two ideas make it honest.
 *
 * The window belongs to the CHANNEL, not the goal. A push tap followed by a mint
 * twenty minutes later happened inside one session; an email opened on Tuesday followed by a
 * mint on Friday did not. One shared window credits whichever channel happens to be earlier
 * in a fallback route — and 2.5 introduced fallback routes, so we built the exact condition
 * that makes a single window wrong.
 *
 * And a conversion is either DIRECT or INFLUENCED. Direct means it landed inside the tight
 * window after a click. Influenced means it happened later, or after an open rather than a
 * click. Both are worth reporting; reporting them as one number is how a channel gets credit
 * it did not earn. */

export interface ChannelAttribution {
  channel: ChannelId;
  label: string;
  /** Minutes after a click for a conversion to count as direct. */
  directMinutes: number;
  /** Hours after the message for it to count as influenced. */
  influencedHours: number;
  /** The interaction that opens the window — not every channel has an open. */
  trigger: 'clicking' | 'opening or clicking' | 'reading';
  why: string;
}

export const ATTRIBUTION: ChannelAttribution[] = [
  {
    channel: 'push', label: 'In-app push', directMinutes: 15, influencedHours: 24, trigger: 'clicking',
    why: 'Fires while the wallet is already connected and mid-task, so a real response is immediate.',
  },
  {
    channel: 'x', label: 'X DM', directMinutes: 60, influencedHours: 72, trigger: 'clicking',
    why: 'The link leaves the app, so expect a reconnect step before anything happens.',
  },
  {
    channel: 'email', label: 'Email', directMinutes: 240, influencedHours: 72, trigger: 'opening or clicking',
    why: 'Read on one device, acted on later on another. The long tail here is real, which is why most of it is influenced rather than direct.',
  },
];

export const attributionFor = (c: ChannelId) =>
  ATTRIBUTION.find((a) => a.channel === c) ?? ATTRIBUTION[3];

/** Human phrasing for a window, since minutes read badly above an hour. */
export function windowLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const h = minutes / 60;
  return h === 1 ? '1 hour' : h < 24 ? `${h} hours` : `${h / 24} days`;
}

export interface AttributedConversions {
  direct: number;
  influenced: number;
  /** Conversions inside the window on more than one channel — credited to the last touch. */
  contested: number;
}

/* Split a campaign's conversions by how well they can be attributed.
 *
 * The direct share falls as the window widens, because a wider window catches more
 * coincidence. That is the actual trade-off attribution makes and the UI should show it
 * rather than presenting one confident total. */
export function attribute(c: Campaign, converted: number): AttributedConversions {
  const chans = c.channels.length ? c.channels : (['email'] as ChannelId[]);
  // Weighted by the tightest window in the route — the strongest claim available.
  const tightest = Math.min(...chans.map((ch) => attributionFor(ch).directMinutes));
  const directShare = tightest <= 15 ? 0.74 : tightest <= 60 ? 0.58 : 0.31;
  const direct = Math.round(converted * directShare);
  const contested = chans.length > 1 ? Math.round(converted * 0.09) : 0;
  return { direct, influenced: Math.max(0, converted - direct - contested), contested };
}
