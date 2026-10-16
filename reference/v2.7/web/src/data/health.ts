import type { Contact, Health } from './types';

/* Health score (2.7).
 *
 * This closes a bug as much as a gap. The automation trigger palette has always offered
 * "Health threshold — contact score crosses a level", and no score existed: an operator
 * could build a flow on a signal that could never fire, and nothing said so. The `Health`
 * type was even declared in types.ts and never used.
 *
 * Rules, not a model. There is no training data yet, and more importantly an unexplainable
 * score in a retention tool cannot be acted on — "62/100" tells an operator nothing, while
 * "62: −18 quiet for 21 days, −12 stopped staking, +9 still holding" names the campaign to
 * run. So every point is attributable to a driver, and the drivers are the feature. */

export interface Driver {
  label: string;
  /** Signed contribution. Negative drivers are the interesting ones. */
  points: number;
}

export interface ContactHealth {
  score: number;
  band: Health;
  drivers: Driver[];
}

/** Bands are the thing segments and triggers filter on; the number is for the drawer. */
export function bandFor(score: number): Health {
  return score >= 67 ? 'strong' : score >= 34 ? 'watch' : 'at-risk';
}

export const BAND_LABEL: Record<Health, string> = {
  strong: 'Strong', watch: 'Watch', 'at-risk': 'At risk',
};

/** Days since last activity, parsed from the mock's relative strings. */
function daysSince(lastActive: string): number {
  const m = /^(\d+)\s*([hdm])/.exec(lastActive.trim());
  if (!m) return 30;
  const n = Number(m[1]);
  return m[2] === 'h' ? 0 : m[2] === 'm' ? 0 : n;
}

/* Recency, frequency, value — the three that survive contact with any retention dataset.
 *
 * Recency is weighted hardest because it is the only one that is predictive rather than
 * descriptive: a wallet that held 40 ETH and last moved 60 days ago is a churn risk, and a
 * score that ranks it above an active small holder is telling you to message the wrong
 * person. Reachability is in here too — an unreachable wallet is not unhealthy, but it is
 * un-saveable, and a retention score that ignores whether you can act on it is decoration. */
export function healthFor(c: Contact): ContactHealth {
  const drivers: Driver[] = [];
  const days = daysSince(c.lastActive);

  // Recency, 0–45.
  if (days === 0) drivers.push({ label: 'Active today', points: 45 });
  else if (days <= 7) drivers.push({ label: `Active ${days}d ago`, points: 38 });
  else if (days <= 14) drivers.push({ label: `Quiet for ${days} days`, points: 24 });
  else if (days <= 30) drivers.push({ label: `Quiet for ${days} days`, points: 12 });
  else drivers.push({ label: `Quiet for ${days} days`, points: -8 });

  // Value, 0–25. Log-ish so a whale does not swamp the recency signal.
  const v = c.ltvEth;
  if (v >= 30) drivers.push({ label: `${v} ETH lifetime`, points: 25 });
  else if (v >= 10) drivers.push({ label: `${v} ETH lifetime`, points: 18 });
  else if (v >= 2) drivers.push({ label: `${v} ETH lifetime`, points: 11 });
  else drivers.push({ label: `${v} ETH lifetime`, points: 4 });

  // Breadth of engagement, 0–18 — more tags means more ways they have engaged.
  const t = c.tags.filter((x) => x !== 'dormant').length;
  if (t >= 3) drivers.push({ label: `${t} behaviours tracked`, points: 18 });
  else if (t >= 1) drivers.push({ label: `${t} behaviour${t === 1 ? '' : 's'} tracked`, points: 10 });

  // Reachability, 0–12. You cannot retain someone you cannot contact.
  const r = c.reachable.length;
  if (r >= 2) drivers.push({ label: `Reachable on ${r} channels`, points: 12 });
  else if (r === 1) drivers.push({ label: 'Reachable on one channel', points: 6 });
  else drivers.push({ label: 'Not reachable on any channel', points: -10 });

  // Explicit churn marker.
  if (c.tags.includes('dormant')) drivers.push({ label: 'Tagged dormant', points: -14 });

  const raw = drivers.reduce((a, d) => a + d.points, 0);
  const score = Math.max(0, Math.min(100, raw));
  return { score, band: bandFor(score), drivers: drivers.sort((a, b) => b.points - a.points) };
}
