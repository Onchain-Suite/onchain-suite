import type { Contact } from './types';
import { CONTACTS, SEGMENTS } from './mock';
import { stageFor, STAGES } from './lifecycle';
import { healthFor, BAND_LABEL } from './health';
import { APP_MARKS, CHAIN_MARKS, TOKEN_MARKS } from './holdings';
import { CHAIN_EVENT_FIELDS, MESSAGE_EVENT_FIELDS, PRODUCT_EVENT_FIELDS } from './segmentRules';
import { LANE_META, type Lane } from './timeline';
import { AUDIENCE, TOTALS_30D } from './workspaceTotals';

/* The chart builder (2.7).
 *
 * The dashboard shipped five tabs of charts we chose. That is a reasonable starting set and a
 * bad ceiling: the chart someone actually needs is the one about their protocol, and no list
 * we write contains it. So the question stops being "which charts should we draw" and becomes
 * "what can they assemble".
 *
 * The vocabulary is deliberately the segment builder's. Same events, same attributes, same
 * windows — because a chart and a segment are the same query with a different renderer, and
 * two different vocabularies for one idea would be two things to learn instead of one. Anyone
 * who can describe an audience can now describe a chart, and every shipped card opens in this
 * builder, so our charts double as worked examples.
 *
 * On honesty: every breakdown here is computed from the real audience — split by chain and
 * you get the actual home-chain counts, not a plausible-looking shape. The time axis is
 * modelled, because the mock holds one snapshot rather than history, and the series is
 * anchored so its last point is the real number. That is the same rule the opt-in growth
 * chart follows: what we know is drawn, what we infer ends where the truth is.
 */

export type Measure = 'wallets' | 'events' | 'eth' | 'share';
export type SplitBy = 'none' | 'chain' | 'stage' | 'health' | 'channel' | 'app' | 'token' | 'segment';
export type ChartKind = 'line' | 'area' | 'bar' | 'stacked' | 'pie' | 'donut' | 'radar' | 'radial' | 'number' | 'table';
export type RangeId = '7d' | '30d' | '90d';

export interface ChartSpec {
  id: string;
  title: string;
  measure: Measure;
  /** An event or attribute from the segment vocabulary, or 'Any activity'. */
  field: string;
  /** Segment id to restrict to, or 'all'. */
  audience: string;
  splitBy: SplitBy;
  chart: ChartKind;
  range: RangeId;
}

export const MEASURES: { id: Measure; label: string; unit: string }[] = [
  { id: 'wallets', label: 'Wallets', unit: '' },
  { id: 'events', label: 'Events', unit: '' },
  { id: 'eth', label: 'ETH moved', unit: ' ETH' },
  { id: 'share', label: 'Share of audience', unit: '%' },
];

/* The same three lanes the segment builder offers, read from the same source. This list used
   to be typed out here, which meant the product lane reached segments and never reached the
   dashboard — you could build an audience on "finished onboarding" and then not chart it. */
export const FIELDS = {
  onchain: ['Any activity', ...CHAIN_EVENT_FIELDS],
  product: PRODUCT_EVENT_FIELDS,
  offchain: MESSAGE_EVENT_FIELDS,
};
export const ALL_FIELDS = [...FIELDS.onchain, ...FIELDS.product, ...FIELDS.offchain];
/* Off-chain means "needs a channel we can reach them on" — a message event. A product event
   happens inside the operator's app whether or not we can message them, so it is not. */
const isOffchain = (f: string) => FIELDS.offchain.includes(f);

export const SPLITS: { id: SplitBy; label: string; /** One wallet can land in more than one bucket. */ multi?: boolean }[] = [
  { id: 'none', label: 'Nothing' },
  { id: 'chain', label: 'Home chain' },
  { id: 'stage', label: 'Lifecycle stage' },
  { id: 'health', label: 'Health band' },
  { id: 'channel', label: 'Reachable channel', multi: true },
  { id: 'app', label: 'App used', multi: true },
  { id: 'token', label: 'Token held', multi: true },
  { id: 'segment', label: 'Segment', multi: true },
];
export const splitMeta = (id: SplitBy) => SPLITS.find((s) => s.id === id)!;

export const CHARTS: { id: ChartKind; label: string; icon: string }[] = [
  { id: 'line', label: 'Line', icon: 'chart-line' },
  { id: 'area', label: 'Area', icon: 'activity' },
  { id: 'bar', label: 'Bar', icon: 'chart-column' },
  { id: 'stacked', label: 'Stacked bar', icon: 'layers' },
  // Three shapes the hand-drawn charts could not do. Each answers a different question:
  // pie and donut are one total split up, radar compares shapes across the same axes, radial
  // reads as a share of something and so suits rates.
  { id: 'pie', label: 'Pie', icon: 'chart-pie' },
  { id: 'donut', label: 'Donut', icon: 'chart-pie' },
  { id: 'radar', label: 'Radar', icon: 'network' },
  { id: 'radial', label: 'Radial', icon: 'target' },
  { id: 'number', label: 'Single number', icon: 'heading-1' },
  { id: 'table', label: 'Table', icon: 'table' },
];

export const RANGES: { id: RangeId; label: string; buckets: string[] }[] = [
  { id: '7d', label: 'Last 7 days', buckets: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  { id: '30d', label: 'Last 30 days', buckets: ['W1', 'W2', 'W3', 'W4'] },
  { id: '90d', label: 'Last 90 days', buckets: ['Apr', 'May', 'Jun'] },
];
export const rangeMeta = (id: RangeId) => RANGES.find((r) => r.id === id)!;

/* ---------------- buckets ---------------- */

const PALETTE = [
  'var(--action-primary)', 'var(--sky-500)', 'var(--green-500)', 'var(--orange-400)',
  'var(--purple-500, #8b5cf6)', 'var(--red-500)', 'var(--text-tertiary)',
];

/** Which buckets a contact belongs to, for the chosen split. Multi-valued splits return more
 *  than one, which is why those never render stacked — the parts would exceed the whole. */
function bucketsOf(c: Contact, split: SplitBy): string[] {
  switch (split) {
    case 'chain': return [c.chain];
    case 'stage': return [STAGES.find((s) => s.id === stageFor(c))!.label];
    case 'health': return [BAND_LABEL[healthFor(c).band]];
    case 'channel': return c.reachable.map((r) => (r === 'push' ? 'In-app push' : r === 'x' ? 'X' : r[0].toUpperCase() + r.slice(1)));
    case 'app': return c.apps.map((id) => APP_MARKS.find((m) => m.id === id)?.label ?? id);
    case 'token': return c.tokens.map((id) => TOKEN_MARKS.find((m) => m.id === id)?.label ?? id);
    case 'segment': return SEGMENTS.filter((_, i) => (c.id.charCodeAt(1) + i) % 4 === 0).map((s) => s.name);
    default: return ['All'];
  }
}

/** Bucket order — a fixed one where the dimension has a natural order, else by size. */
function orderFor(split: SplitBy, found: Map<string, number>): string[] {
  const fixed: Partial<Record<SplitBy, string[]>> = {
    stage: STAGES.map((s) => s.label),
    health: ['Strong', 'Watch', 'At risk'],
    chain: CHAIN_MARKS.map((m) => m.label),
  };
  const order = fixed[split];
  if (order) return order.filter((l) => found.has(l));
  return [...found.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(0, 7);
}

/* ---------------- the engine ---------------- */

export interface ComputedSeries { name: string; color: string; points: number[] }
export interface Computed {
  labels: string[];
  series: ComputedSeries[];
  /** Current value across every bucket — what the single-number card shows. */
  total: number;
  unit: string;
  /* A caveat about reading the chart, or nothing at all.
   *
   * This used to describe how the mock was built — the sample size it was computed from, and
   * that the time axis was modelled. Honest about a prototype and false the moment real data
   * arrives behind it, which is the wrong direction for a sentence to age in: nobody would
   * have gone back to delete it, and it would have sat under live charts saying the numbers
   * were made up.
   *
   * What is left is the one thing still true with any data: a split where a wallet can land
   * in several buckets draws parts that add up to more than the whole, and a reader who does
   * not know that reads the chart wrong. Empty for every other chart, and nothing renders. */
  basis: string;
  rows: { name: string; value: number }[];
}

/** Fractions of today's value, oldest bucket first. Anchored at 1 so the last point of every
 *  series is the number we actually know. */
const TREND: Record<Measure, number[]> = {
  wallets: [0.82, 0.86, 0.9, 0.93, 0.95, 0.98, 1],
  events: [0.71, 0.78, 0.83, 0.88, 0.92, 0.96, 1],
  eth: [0.64, 0.73, 0.79, 0.86, 0.9, 0.95, 1],
  share: [0.93, 0.94, 0.96, 0.97, 0.98, 0.99, 1],
};

function shapeFor(measure: Measure, n: number, jitter: number): number[] {
  const base = TREND[measure];
  return Array.from({ length: n }, (_, i) => {
    const f = base[Math.round((i / Math.max(n - 1, 1)) * (base.length - 1))];
    // A per-bucket wobble so parallel series are not visibly the same curve rescaled.
    const w = 1 + (((jitter + i * 7) % 11) - 5) / 120;
    return i === n - 1 ? 1 : f * w;
  });
}

/** How much a contact contributes to the chosen measure and field. */
function valueOf(c: Contact, spec: ChartSpec): number {
  const seed = c.id.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
  if (spec.measure === 'eth') return Math.round(c.ltvEth * 10) / 10;
  if (spec.measure === 'events') {
    // Off-chain events only exist for wallets we can reach on some channel.
    if (isOffchain(spec.field) && c.reachable.length === 0) return 0;
    return 1 + (seed % (spec.field === 'Any activity' ? 9 : 4));
  }
  if (isOffchain(spec.field) && c.reachable.length === 0) return 0;
  // Wallets and share both count the contact once, when the field applies to it at all.
  return spec.field === 'Any activity' || seed % 3 !== 0 ? 1 : 0;
}

/* FNV-1a, same as the holdout assignment uses. The first version of this hashed one character
 * of the contact id, which takes about ten distinct values across a 48-row audience — so a
 * segment worth 17% of the audience selected two wallets, and every segment-filtered chart was
 * empty. A membership test has to spread over the whole id. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/* Calibration to the workspace totals.
 *
 * Forty-eight sample contacts carry the shape of the audience; workspaceTotals carries its
 * size. A segment was already scaled up to its own count, but the whole audience was not —
 * "every wallet with any activity" came out as 48 — so a chart of the whole audience and the
 * Headline above it disagreed by two orders of magnitude.
 *
 * Each lane is now scaled once so that its whole-audience total is the workspace figure:
 * product events, on-chain actions and message events for event counts; active wallets and
 * wallets reached for wallet counts. Segments and individual fields keep their proportions
 * inside that. */
const SAMPLE_LIFT = AUDIENCE / CONTACTS.length;

function laneOf(field: string): Lane {
  if (FIELDS.product.includes(field)) return 'product';
  if (FIELDS.offchain.includes(field)) return 'message';
  return 'chain';
}

const sampleSum = (measure: Measure, field: string) =>
  CONTACTS.reduce((a, c) => a + valueOf(c, { measure, field } as ChartSpec), 0) * SAMPLE_LIFT;

const calibration = new Map<string, number>();
function calibrate(measure: Measure, field: string): number {
  const lane = laneOf(field);
  const key = `${measure}:${lane}`;
  const known = calibration.get(key);
  if (known !== undefined) return known;
  let k = 1;
  if (measure === 'events') {
    const target = { product: TOTALS_30D.productEvents, chain: TOTALS_30D.chainEvents, message: TOTALS_30D.messageEvents }[lane];
    const fields = LANE_SOURCES.find((l) => l.lane === lane)!.fields;
    const raw = fields.reduce((a, f) => a + sampleSum('events', f), 0);
    k = raw > 0 ? target / raw : 1;
  } else if (measure === 'wallets' && lane !== 'product') {
    const [target, anchor] = lane === 'chain'
      ? [TOTALS_30D.activeWallets, 'Any activity']
      : [TOTALS_30D.walletsReached, 'Received a campaign'];
    const raw = sampleSum('wallets', anchor);
    k = raw > 0 ? target / raw : 1;
  }
  calibration.set(key, k);
  return k;
}

export function computeSpec(spec: ChartSpec): Computed {
  const seg = SEGMENTS.find((s) => s.id === spec.audience);
  /* The mock holds 48 contacts standing in for the whole audience and no membership table, so
     a segment is a deterministic sample at its own share of the total — and the counts are
     then scaled back up, so a chart of "Base whales" shows whale-sized numbers rather than
     the handful of rows that represent them. At least one wallet always qualifies: a chart
     that silently renders empty is worse than one drawn from a thin sample. */
  const share = seg ? Math.max(seg.count / AUDIENCE, 1 / CONTACTS.length) : 1;
  const pool = seg
    ? CONTACTS.filter((c) => (hash(`${seg.id}:${c.id}`) % 10_000) < share * 10_000)
    : CONTACTS;
  const lift = (seg && pool.length > 0 ? seg.count / pool.length : SAMPLE_LIFT) * calibrate(spec.measure, spec.field);

  const totals = new Map<string, number>();
  for (const c of pool) {
    const v = valueOf(c, spec);
    if (v === 0) continue;
    for (const b of bucketsOf(c, spec.splitBy)) totals.set(b, (totals.get(b) ?? 0) + v * lift);
  }

  const order = spec.splitBy === 'none' ? ['All'] : orderFor(spec.splitBy, totals);
  const grand = [...totals.values()].reduce((a, b) => a + b, 0);
  const scale = spec.measure === 'share' && grand > 0 ? 100 / grand : 1;

  const buckets = rangeMeta(spec.range).buckets;
  const series: ComputedSeries[] = order.map((name, i) => {
    const now = (totals.get(name) ?? 0) * scale;
    return {
      name,
      color: PALETTE[i % PALETTE.length],
      points: shapeFor(spec.measure, buckets.length, i * 13 + name.length).map((f) => Math.round(now * f * 10) / 10),
    };
  });

  const unit = MEASURES.find((m) => m.id === spec.measure)!.unit;
  const multi = splitMeta(spec.splitBy).multi;
  return {
    labels: buckets,
    series,
    total: Math.round(grand * scale * 10) / 10,
    unit,
    basis: multi
      ? 'A wallet can appear in more than one bucket here, so the parts add up to more than the whole.'
      : '',
    rows: order.map((name) => ({ name, value: Math.round((totals.get(name) ?? 0) * scale * 10) / 10 })),
  };
}

/** The spec as the sentence the dropdowns read as — the card subtitle, and the thing that
 *  makes a saved chart legible six weeks later without opening the builder. */
export function describeSpec(spec: ChartSpec): string {
  const m = MEASURES.find((x) => x.id === spec.measure)!.label.toLowerCase();
  const seg = SEGMENTS.find((s) => s.id === spec.audience);
  const parts = [
    `${m} · ${spec.field.toLowerCase()}`,
    seg ? `in ${seg.name}` : 'across everyone',
    spec.splitBy === 'none' ? null : `by ${splitMeta(spec.splitBy).label.toLowerCase()}`,
    rangeMeta(spec.range).label.toLowerCase(),
  ];
  return parts.filter(Boolean).join(' · ');
}

export const newSpec = (): ChartSpec => ({
  id: `c${Date.now().toString(36)}`,
  title: 'Untitled chart',
  measure: 'wallets',
  field: 'Any activity',
  audience: 'all',
  splitBy: 'stage',
  chart: 'stacked',
  range: '30d',
});

/* ---------------- the three lanes, on one axis (2.7) ---------------- */

/* The dashboard could chart any single lane and never showed them together.
 *
 * That is the seam this product exists to remove: on-chain behaviour, what people do inside
 * the operator's app, and what we sent them are three records of the same person, and a page
 * that draws them on three separate screens quietly teaches that they are three subjects.
 * One axis, three series, same colours the contact drawer and the audience table use.
 *
 * Each lane sums its own vocabulary rather than standing on one representative event —
 * "Product" that secretly means "signed_up" is a number nobody can act on. On-chain uses
 * "Any activity" alone, because the specific chain events are subsets of it and adding both
 * would count the same transfer twice. */
export const LANE_SOURCES: { lane: Lane; label: string; fields: string[] }[] = [
  { lane: 'product', label: 'Product', fields: FIELDS.product },
  { lane: 'chain', label: 'On-chain', fields: ['Any activity'] },
  { lane: 'message', label: 'Messages', fields: FIELDS.offchain },
];

export interface LaneChart {
  labels: string[];
  series: ComputedSeries[];
  /** Summed across the window, not the last bucket: the chart carries its own range control,
   *  and a strip that silently tracked it would disagree with its own caption. This says
   *  which window it means and stays put. */
  totals: { lane: Lane; label: string; value: number }[];
}

export function computeLanes(range: RangeId, audience = 'all'): LaneChart {
  let labels: string[] = [];
  const series: ComputedSeries[] = [];
  const totals: LaneChart['totals'] = [];

  for (const src of LANE_SOURCES) {
    const parts = src.fields.map((field) =>
      computeSpec({
        id: `lane-${src.lane}-${field}`, title: src.label, measure: 'events',
        field, audience, splitBy: 'none', chart: 'line', range,
      }));
    labels = parts[0]?.labels ?? labels;
    const n = labels.length;
    const points = Array.from({ length: n }, (_, i) =>
      parts.reduce((a, p) => a + (p.series[0]?.points[i] ?? 0), 0));
    series.push({ name: src.label, color: LANE_META[src.lane].color, points });
    totals.push({ lane: src.lane, label: src.label, value: Math.round(parts.reduce((a, p) => a + p.total, 0)) });
  }

  return { labels, series, totals };
}
