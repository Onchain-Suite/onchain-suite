import { createContext, useContext, useMemo, useState } from 'react';
import { Icon } from '../components/icons';

/* Shared chart behaviour (2.7).
 *
 * Three things every chart here now does, and none of them did before.
 *
 * Hover. The numbers used to be written out underneath the chart because there was no way to
 * read them off it — which is how a dashboard ends up with more prose than picture. A chart
 * you can point at needs no caption: the value, the bucket and every series at that moment
 * come from the cursor, so the card can just be the chart.
 *
 * Legend as control. A legend that only names colours is a key; one you can click is a filter.
 * Turning series off is how you answer "is X doing anything" on a chart built to show
 * every channel at once, without us having to ship another chart that shows one.
 *
 * Range per chart. One range control at the top of the page forced every chart onto the same
 * window, which is wrong on a page where the questions have different natural periods — a
 * retention curve and a week's sends do not belong on the same axis. The control belongs to
 * the chart it changes.
 */

export type RangeId = '7d' | '30d' | '90d';

export const RANGES: { id: RangeId; label: string; short: string; buckets: number; from: number }[] = [
  // `from` is where this range starts inside a series defined over the full 90 days, so a
  // shorter window is a slice of the same truth rather than a different set of numbers.
  { id: '7d', label: 'Last 7 days', short: '7d', buckets: 7, from: 0.82 },
  { id: '30d', label: 'Last 30 days', short: '30d', buckets: 8, from: 0.55 },
  { id: '90d', label: 'Last 90 days', short: '90d', buckets: 12, from: 0 },
];
export const rangeMeta = (id: RangeId) => RANGES.find((r) => r.id === id)!;

const DAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export function bucketLabels(range: RangeId): string[] {
  const m = rangeMeta(range);
  if (range === '7d') return DAY;
  if (range === '30d') return Array.from({ length: m.buckets }, (_, i) => `W${i + 1}`);
  return ['Apr', '', 'May', '', 'Jun', '', 'Jul', '', 'Aug', '', 'Sep', ''].slice(0, m.buckets)
    .map((l, i) => l || `·${i}`);
}

/** Resample a series onto a range: slice the window, then interpolate to its bucket count. */
export function forRange(points: number[], range: RangeId): number[] {
  const m = rangeMeta(range);
  const start = Math.floor(points.length * m.from);
  const win = points.slice(Math.min(start, points.length - 2));
  const n = m.buckets;
  return Array.from({ length: n }, (_, i) => {
    const t = (i / (n - 1)) * (win.length - 1);
    const lo = Math.floor(t);
    const hi = Math.min(lo + 1, win.length - 1);
    return Math.round((win[lo] + (win[hi] - win[lo]) * (t - lo)) * 10) / 10;
  });
}

export interface Series {
  name: string;
  color: string;
  points: number[];
  dashed?: boolean;
  /** Draw as a line even in an area chart — for a series that overlaps the stack rather than
   *  adding to it, which cannot be stacked without inventing a total. */
  asLine?: boolean;
}

/* One date range per dashboard.
 *
 * Every chart carried its own picker, so the Overview had five "Last 30 days" controls, each
 * moving one card, and nothing said whether the numbers on screen covered the same window. A
 * dashboard now provides its range here and every time-based chart inside it follows, with no
 * picker of its own. A chart outside any dashboard still owns its range. Charts whose axis is
 * not calendar time (days since first action, cohorts) never took a range, and still don't. */
export const DashboardRange = createContext<{ range: RangeId; setRange: (r: RangeId) => void } | null>(null);
export const useDashboardRange = () => useContext(DashboardRange);

/** Range + which series are switched off. One hook so every chart behaves the same way. */
export function useChartState(initial: RangeId = '30d', initialOff: string[] = []) {
  const shared = useContext(DashboardRange);
  const [own, setRange] = useState<RangeId>(initial);
  const range = shared?.range ?? own;
  const [off, setOff] = useState<string[]>(initialOff);
  const toggle = (name: string, all: string[]) => setOff((v) => {
    const next = v.includes(name) ? v.filter((n) => n !== name) : [...v, name];
    // Never let the last series be switched off — an empty chart is not a view of anything.
    return next.length >= all.length ? v : next;
  });
  return { range, setRange, off, toggle, shared: shared !== null };
}

export function RangePicker({ value, onChange }: { value: RangeId; onChange: (r: RangeId) => void }) {
  return (
    <span className="ck__range">
      <select value={value} onChange={(e) => onChange(e.target.value as RangeId)} aria-label="Date range">
        {RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
      </select>
      <Icon name="chevron-down" size={13} color="var(--text-tertiary)" />
    </span>
  );
}

/* The legend, crosshair, hover readout and plot wrapper that used to live here are gone:
   Recharts draws all of them, and shadcn's ChartLegendContent carries the filtering. What is
   left is the part that was never about drawing — which window a chart shows, and which
   series the reader switched off. */

export function useSeriesData(series: Series[], range: RangeId) {
  return useMemo(() => series.map((s) => ({ ...s, points: forRange(s.points, range) })), [series, range]);
}
