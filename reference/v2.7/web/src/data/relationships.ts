import type { Campaign, ChannelId, Contact, Segment } from './types';
import { CAMPAIGNS, SEGMENTS } from './mock';
import { stageFor } from './lifecycle';

/* What is attached to what (2.7).
 *
 * Every relationship the product had pointed downward — a contact knows its lists and tags,
 * a form knows the automation it enrols into. Nothing pointed back up. A list did not know
 * its contacts without scanning all of them, a segment did not know which campaigns used it,
 * and `Campaign` recorded its channels but never its audience.
 *
 * That was survivable while segments were simple. 2.7 made them expressive — nesting,
 * negation, frequency — and expressive things get edited. Editing "Base whales" now silently
 * changes every scheduled campaign built on it, and nothing anywhere says so. We removed the
 * accidental safety of a builder too crude to be worth touching.
 *
 * The other half is the question support and compliance both ask: "why did this wallet get
 * this message?" Without an edge from message back to segment back to rule, answering it
 * means reconstructing the send by hand. */

/** Which campaigns were built on a segment. A real backend stores this on the campaign at
 *  build time; here it is derived so the shape is exercised. */
export function campaignsUsing(segmentId: string): Campaign[] {
  return CAMPAIGNS.filter((c) => {
    const seed = c.id.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
    return SEGMENTS[seed % SEGMENTS.length]?.id === segmentId
      || SEGMENTS[(seed + 3) % SEGMENTS.length]?.id === segmentId;
  });
}

export interface SegmentUsage {
  campaigns: Campaign[];
  /** Live things that break if the rules change under them. */
  live: number;
  /** Safe to edit — nothing scheduled or running depends on it. */
  safe: boolean;
}

export function segmentUsage(segmentId: string): SegmentUsage {
  const campaigns = campaignsUsing(segmentId);
  const live = campaigns.filter((c) => c.status === 'scheduled' || c.status === 'sending').length;
  return { campaigns, live, safe: live === 0 };
}

/** Reach per channel for a segment — one number was misleading the moment X arrived,
 *  because its ceiling is a follower list, not the segment. */
export interface SegmentReach { channel: ChannelId; label: string; count: number }

export function reachFor(s: Segment, xFollowers: number): SegmentReach[] {
  return [
    { channel: 'email', label: 'Email', count: s.email },
    { channel: 'push', label: 'Push', count: s.wallet },
    { channel: 'x', label: 'X', count: Math.min(Math.round(s.wallet * 0.09), xFollowers) },
  ];
}

/* ---------------- Contact → journeys ---------------- */

export interface Enrolment {
  automation: string;
  step: string;
  status: 'in-flow' | 'completed' | 'exited';
  since: string;
}

const FLOWS = [
  { name: 'Welcome new wallets', steps: ['Waiting 1 hour', 'Email sent', 'Completed'] },
  { name: 'Dormant 30d win-back', steps: ['Email sent', 'Waiting 3 days', 'Push sent'] },
  { name: 'Whale unstake alert', steps: ['Push sent', 'Waiting 1 day', 'Email sent'] },
];

/** Which automations a wallet is in, and where it has got to. Derived from the contact and
 *  its stage so the answer is at least internally consistent with the rest of the app. */
export function enrolmentsFor(c: Contact): Enrolment[] {
  const seed = c.id.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const stage = stageFor(c);
  const out: Enrolment[] = [];

  if (c.tags.includes('new') || stage === 'new') {
    out.push({ automation: FLOWS[0].name, step: FLOWS[0].steps[seed % 3], status: seed % 3 === 2 ? 'completed' : 'in-flow', since: '2d ago' });
  }
  if (stage === 'dormant' || stage === 'at_risk') {
    out.push({ automation: FLOWS[1].name, step: FLOWS[1].steps[seed % 3], status: 'in-flow', since: '6d ago' });
  }
  if (c.tags.includes('whale')) {
    out.push({ automation: FLOWS[2].name, step: FLOWS[2].steps[2], status: seed % 2 ? 'completed' : 'exited', since: '12d ago' });
  }
  return out;
}

/** The rules behind a saved segment, as separate conditions rather than one sentence.
 *  Mock segments already store them joined by "·", which is the shape a rule tree flattens
 *  to — one chip per predicate, which is what makes an edit legible at a glance. */
export function ruleChipsFor(s: Segment): string[] {
  return s.desc.split('·').map((p) => p.trim()).filter(Boolean);
}
