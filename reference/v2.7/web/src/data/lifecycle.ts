import type { IconName } from '../components/icons';
import type { Contact } from './types';
import { healthFor } from './health';

/* Lifecycle stages (2.7).
 *
 * The product is named for a lifecycle it did not model. There was a dormant segment and a
 * "goes dormant" trigger, but no stage a wallet occupies, no transitions between stages,
 * and no way to see who moved where — so every retention question was a bespoke segment
 * query written from scratch.
 *
 * Two rules make this work rather than merely exist. Stages are evaluated in priority
 * order and first match wins, so a wallet is never in two at once and the counts always sum
 * to the audience. And `reactivated` is a rule about the *previous* stage, not current
 * behaviour: dormant → engaged is the number a retention product lives on, and it looks
 * identical to new → engaged if you only read the present. */

export type Stage = 'new' | 'activated' | 'engaged' | 'at_risk' | 'dormant' | 'reactivated';

export interface StageMeta {
  id: Stage;
  label: string;
  desc: string;
  icon: IconName;
  /** Position on the health axis, for ordering the flow view left to right. */
  order: number;
  tone: 'good' | 'warn' | 'bad' | 'new';
}

export const STAGES: StageMeta[] = [
  { id: 'new', label: 'New', desc: 'First seen in the last 14 days, nothing since', icon: 'sparkles', order: 0, tone: 'new' },
  { id: 'activated', label: 'Activated', desc: 'Did the thing once: one action beyond arriving', icon: 'check-circle-2', order: 1, tone: 'good' },
  { id: 'engaged', label: 'Engaged', desc: 'Repeatedly active and reachable', icon: 'heart-pulse', order: 2, tone: 'good' },
  { id: 'reactivated', label: 'Reactivated', desc: 'Came back after going quiet', icon: 'rotate-ccw', order: 3, tone: 'good' },
  { id: 'at_risk', label: 'At risk', desc: 'Slowing down: health falling, not gone yet', icon: 'trending-down', order: 4, tone: 'warn' },
  { id: 'dormant', label: 'Dormant', desc: 'No activity for 30 days or more', icon: 'moon', order: 5, tone: 'bad' },
];

export const stageMeta = (id: Stage) => STAGES.find((s) => s.id === id)!;

function daysSince(lastActive: string): number {
  const m = /^(\d+)\s*([hdm])/.exec(lastActive.trim());
  if (!m) return 30;
  return m[2] === 'd' ? Number(m[1]) : 0;
}

/* First match wins, hence the order. `previous` is what makes reactivated distinguishable —
 * without it a returning wallet is indistinguishable from one that never left, and the
 * single most valuable event in retention becomes invisible. */
export function stageFor(c: Contact, previous?: Stage): Stage {
  const days = daysSince(c.lastActive);
  const h = healthFor(c).score;

  if (days >= 30) return 'dormant';
  if (previous === 'dormant' && days <= 7) return 'reactivated';
  if (h < 34) return 'at_risk';
  if (days <= 14 && c.tags.includes('new')) return 'new';
  if (h >= 67 && c.reachable.length > 0) return 'engaged';
  return 'activated';
}

/** Deterministic prior stage, so the demo has real transitions rather than a static census.
 *  A backend reads this from stageHistory; the shape is what matters. */
function priorStage(c: Contact): Stage {
  const seed = c.id.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
  return STAGES[seed % STAGES.length].id;
}

export interface StageCount { stage: Stage; count: number }
export interface Movement { from: Stage; to: Stage; count: number }

export interface LifecycleSnapshot {
  counts: StageCount[];
  movements: Movement[];
  total: number;
  /** The two numbers that actually get reported upward. */
  reactivated: number;
  slipping: number;
}

export function lifecycleFor(contacts: Contact[]): LifecycleSnapshot {
  const counts = new Map<Stage, number>(STAGES.map((s) => [s.id, 0]));
  const moves = new Map<string, number>();

  for (const c of contacts) {
    const prev = priorStage(c);
    const now = stageFor(c, prev);
    counts.set(now, (counts.get(now) ?? 0) + 1);
    if (prev !== now) {
      const k = `${prev}>${now}`;
      moves.set(k, (moves.get(k) ?? 0) + 1);
    }
  }

  const movements: Movement[] = [...moves.entries()]
    .map(([k, count]) => { const [from, to] = k.split('>') as [Stage, Stage]; return { from, to, count }; })
    .sort((a, b) => b.count - a.count);

  return {
    counts: STAGES.map((s) => ({ stage: s.id, count: counts.get(s.id) ?? 0 })),
    movements,
    total: contacts.length,
    reactivated: movements.filter((m) => m.to === 'reactivated').reduce((a, m) => a + m.count, 0),
    slipping: movements.filter((m) => m.to === 'at_risk' || m.to === 'dormant').reduce((a, m) => a + m.count, 0),
  };
}
