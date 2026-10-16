import type { Contact } from './types';
import { PRODUCT_EVENTS } from './productEvents';

/* One history, both lanes (2.7).
 *
 * This is the product, expressed as a list. Everywhere else the two lanes are joined in the
 * abstract — a segment rule can mention both, a chart can split by both — but a person asking
 * "what is this wallet doing" wants them interleaved in the order they happened, because that
 * is the only form in which the join reads as one story rather than two reports:
 *
 *     Signed up → Connected wallet → Deposited 2.4 ETH → Opened the welcome email
 *     → Placed a position → quiet 31 days
 *
 * No other tool can draw that line. The chain half is invisible to the 26 platforms we mapped,
 * and the product half is invisible to a block explorer.
 *
 * Deterministic from the contact, like the rest of the mock, so the same wallet always tells
 * the same story and a screenshot stays true.
 */

export type Lane = 'product' | 'chain' | 'message';

export const LANE_META: Record<Lane, { label: string; color: string; icon: string }> = {
  product: { label: 'Product', color: 'var(--chart-2)', icon: 'square-mouse-pointer' },
  chain: { label: 'On-chain', color: 'var(--chart-3)', icon: 'network' },
  message: { label: 'Message', color: 'var(--chart-4)', icon: 'mail' },
};

export interface TimelineEvent {
  lane: Lane;
  label: string;
  detail?: string;
  /** Minutes ago — the sort key, and what the relative label is rendered from. */
  minutesAgo: number;
}

const CHAIN_ACTS = [
  { label: 'Deposited', detail: '2.4 ETH' },
  { label: 'Swapped', detail: '4.2 ETH → USDC' },
  { label: 'Staked', detail: '12 ETH' },
  { label: 'Minted', detail: '3 items' },
  { label: 'Withdrew', detail: '1.1 ETH' },
  { label: 'Added liquidity', detail: 'ETH/USDC' },
];
const MESSAGE_ACTS = [
  { label: 'Opened', detail: 'Welcome to the vault' },
  { label: 'Clicked', detail: 'Season 2 is live' },
  { label: 'Viewed a push', detail: 'Your position settled' },
];

/* A property's *value*, not its name. Rendering `properties[0]` put "steps" and "market" in
   the detail line — the schema leaking into a place that is supposed to read as what someone
   did. These are the values a prediction market would actually record. */
const PROPERTY_VALUES: Record<string, string[]> = {
  method: ['email', 'Google', 'wallet'],
  referrer: ['twitter.com', 'direct', 'docs'],
  steps: ['4 of 4', '3 of 4'],
  seconds: ['2m 10s', '48s'],
  provider: ['Privy', 'MetaMask', 'Rainbow'],
  chain: ['Base', 'Ethereum'],
  market: ['WC26 · Final', 'WC26 · Group B', 'Rate cut Q1'],
  source: ['feed', 'search'],
  size: ['50 USDC', '120 USDC'],
  tier: ['Tier 2'],
};
const valueFor = (prop: string | undefined, h: number): string | undefined => {
  if (!prop) return undefined;
  const opts = PROPERTY_VALUES[prop];
  return opts ? opts[h % opts.length] : undefined;
};

const hash = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
};

/** Minutes since a contact's `lastActive` string — the anchor the rest hangs off. */
function anchorMinutes(lastActive: string): number {
  const m = /^(\d+)\s*([hdm])/.exec(lastActive.trim());
  if (!m) return 60 * 24 * 30;
  const n = Number(m[1]);
  return m[2] === 'h' ? n * 60 : m[2] === 'd' ? n * 60 * 24 : n;
}

export function relativeLabel(minutes: number): string {
  if (minutes < 60) return `${Math.max(Math.round(minutes), 1)}m ago`;
  const hrs = minutes / 60;
  if (hrs < 24) return `${Math.round(hrs)}h ago`;
  const days = hrs / 24;
  if (days < 30) return `${Math.round(days)}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}

/* Which lanes we actually hold for this contact.
 *
 * A wallet with no product events is not a broken row — it is an honest statement that the
 * operator's instrumentation does not reach it yet, and the audience should say so rather
 * than render identically to a wallet we know everything about. */
export interface Coverage { product: boolean; chain: boolean; message: boolean; lanes: number }

export function coverageFor(c: Contact): Coverage {
  const h = hash(c.id);
  // Email-only contacts have no chain history by definition; a third of wallets are not yet
  // instrumented in the operator's app.
  const chain = Boolean(c.address);
  const product = Boolean(c.address) && h % 3 !== 0;
  const message = c.reachable.length > 0;
  return { product, chain, message, lanes: [product, chain, message].filter(Boolean).length };
}

export function timelineFor(c: Contact): TimelineEvent[] {
  const h = hash(c.id);
  const anchor = anchorMinutes(c.lastActive);
  const cov = coverageFor(c);
  const out: TimelineEvent[] = [];

  if (cov.product) {
    /* Onboarding first, oldest to newest, so the drawer reads as a sequence someone went
       through rather than a shuffled pile of the same six names. */
    const steps = PRODUCT_EVENTS.filter((e) => e.mapped).slice(0, 3 + (h % 4));
    steps.forEach((e, i) => {
      out.push({
        lane: 'product',
        label: e.label || e.name,
        detail: valueFor(e.properties[0], h + i),
        minutesAgo: anchor + (steps.length - i) * (60 * 24 * (2 + (h % 4))),
      });
    });
  }

  if (cov.chain) {
    const n = 1 + (h % 3);
    for (let i = 0; i < n; i += 1) {
      const act = CHAIN_ACTS[(h + i * 7) % CHAIN_ACTS.length];
      out.push({ lane: 'chain', ...act, minutesAgo: anchor + i * 60 * 24 * (1 + (h % 5)) });
    }
  }

  if (cov.message) {
    const n = 1 + (h % 2);
    for (let i = 0; i < n; i += 1) {
      const act = MESSAGE_ACTS[(h + i * 5) % MESSAGE_ACTS.length];
      out.push({ lane: 'message', ...act, minutesAgo: anchor + 60 * 12 * (i + 1) });
    }
  }

  /* One of each thing. The generators can land on the same act twice, and a history showing
     "Viewed a push · Your position settled" twice at the same hour reads as a bug in the
     product rather than a quirk of the mock. */
  const seen = new Set<string>();
  return out
    .filter((e) => {
      const key = `${e.lane}:${e.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.minutesAgo - b.minutesAgo);
}

/** The one line the audience table shows, so a row says what this wallet last did. */
export function latestFor(c: Contact): TimelineEvent | null {
  return timelineFor(c)[0] ?? null;
}

/* A gap worth drawing. The interesting thing about a dormant wallet is not that it is dormant,
 * it is the length of the silence since the last thing it did. */
export const QUIET_DAYS = 14;
export function quietSince(events: TimelineEvent[]): number | null {
  const first = events[0];
  if (!first) return null;
  const days = first.minutesAgo / (60 * 24);
  return days >= QUIET_DAYS ? Math.round(days) : null;
}
